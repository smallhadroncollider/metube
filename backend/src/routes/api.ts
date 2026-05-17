import { type IRouter, Router, type Request, type Response } from "express";
import type { Database } from "bun:sqlite";
import type { OAuth2Client } from "google-auth-library";
import {
  searchChannels,
  getChannelVideos,
  getVideoDetails,
  addToPlaylist,
  parseDurationSeconds,
} from "../youtube/youtube.js";
import {
  getSubscriptionsByUserId,
  addSubscription,
  removeSubscription,
  getPendingVideos,
  upsertVideos,
  updateVideoStatus,
  getUserById,
  updateUserPlaylist,
  getLatestVideoDateForChannel,
  bulkIgnoreVideos,
  getUserTokens,
} from "../db/repo.js";
import { createOAuth2ClientFromTokens } from "../auth/auth.js";

const requireAuth = (req: Request, res: Response, next: () => void) => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
};

const buildOAuth2Client = (
  userId: number,
  db: Database,
): OAuth2Client | null => {
  const storedTokens = getUserTokens(db, userId);
  if (!storedTokens || !storedTokens.refreshToken) {
    return null;
  }
  return createOAuth2ClientFromTokens(
    process.env.GOOGLE_CLIENT_ID ?? "",
    process.env.GOOGLE_CLIENT_SECRET ?? "",
    process.env.GOOGLE_REDIRECT_URI ??
      "http://localhost:3000/auth/google/callback",
    {
      access_token: storedTokens.accessToken,
      refresh_token: storedTokens.refreshToken,
      expiry_date: storedTokens.expiryDate,
    },
  );
};

const getApiKey = (): string => process.env.YOUTUBE_API_KEY ?? "";
const getMinDuration = (): number =>
  parseInt(process.env.MIN_DURATION ?? "60", 10);
const getMaxDuration = (): number =>
  parseInt(process.env.MAX_DURATION ?? "3600", 10);

const getBodyString = (body: unknown, field: string): string | null => {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const value = (body as Record<string, unknown>)[field];
  return typeof value === "string" ? value : null;
};

const getParamString = (
  params: Record<string, string | string[] | undefined>,
  key: string,
): string => {
  const value = params[key];
  return typeof value === "string" ? value : "";
};

const getUserId = (req: Request): number => {
  if (typeof req.session.userId !== "number") {
    throw new Error("User not authenticated");
  }
  return req.session.userId;
};

export const apiRoutes = (db: Database): IRouter => {
  const router = Router();
  router.use(requireAuth);

  router.get("/videos", (req: Request, res: Response) => {
    const userId = getUserId(req);
    const videos = getPendingVideos(db, userId);
    res.json({ videos });
  });

  router.post("/videos/:videoId/add", async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const videoId = getParamString(req.params, "videoId");
    const channelId = getBodyString(req.body, "channelId");
    const user = getUserById(db, userId);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (!channelId) {
      res.status(400).json({ error: "Missing channelId" });
      return;
    }

    const oauth2Client = buildOAuth2Client(userId, db);
    if (oauth2Client) {
      const result = await addToPlaylist(
        oauth2Client,
        user.youtube_playlist_id,
        videoId,
      );

      if (!result.ok) {
        console.error(
          `Failed to add video ${videoId} to playlist:`,
          result.error,
        );
        res.status(500).json({ error: result.error });
        return;
      }
    }

    updateVideoStatus(db, videoId, channelId, "added");

    res.json({ success: true });
  });

  router.post("/videos/:videoId/ignore", (req: Request, res: Response) => {
    const videoId = getParamString(req.params, "videoId");
    const channelId = getBodyString(req.body, "channelId");

    if (!channelId) {
      res.status(400).json({ error: "Missing channelId" });
      return;
    }

    updateVideoStatus(db, videoId, channelId, "ignored");
    res.json({ success: true });
  });

  router.get("/subscriptions", (req: Request, res: Response) => {
    const userId = getUserId(req);
    const subscriptions = getSubscriptionsByUserId(db, userId);
    res.json({ subscriptions });
  });

  router.post("/subscriptions", (req: Request, res: Response) => {
    const userId = getUserId(req);
    const channelId = getBodyString(req.body, "channelId");
    const channelTitle = getBodyString(req.body, "channelTitle");
    const channelThumbnail = getBodyString(req.body, "channelThumbnail");

    if (!channelId || !channelTitle || !channelThumbnail) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const result = addSubscription(
      db,
      userId,
      channelId,
      channelTitle,
      channelThumbnail,
    );

    if (!result) {
      res.status(409).json({ error: "Already subscribed" });
      return;
    }

    res.json({ subscription: result });
  });

  router.delete("/subscriptions/:channelId", (req: Request, res: Response) => {
    const userId = getUserId(req);
    const channelId = getParamString(req.params, "channelId");
    removeSubscription(db, userId, channelId);
    res.json({ success: true });
  });

  router.get("/search/channels", async (req: Request, res: Response) => {
    const query = req.query.q;
    if (typeof query !== "string" || !query) {
      res.status(400).json({ error: "Missing query parameter" });
      return;
    }
    try {
      const channels = await searchChannels(getApiKey(), query);
      res.json({ channels });
    } catch (error) {
      console.error("Channel search failed:", error);
      res.status(500).json({ error: "Failed to search channels" });
    }
  });

  router.post("/sync/channel/:channelId", async (req: Request, res: Response) => {
    const channelId = getParamString(req.params, "channelId");

    if (!channelId) {
      res.status(400).json({ error: "Missing channelId" });
      return;
    }

    const latestDate = getLatestVideoDateForChannel(db, channelId);
    const videos = await getChannelVideos(getApiKey(), channelId, latestDate);

    if (videos.length === 0) {
      res.json({ synced: 0, ignored: 0 });
      return;
    }

    const enrichedVideos = videos.map((video) => ({
      ...video,
      channelId,
      duration: "",
    }));

    const videoIds = enrichedVideos.map((v) => v.videoId);
    const detailsMap = new Map<string, string>();

    try {
      const videoDetails = await getVideoDetails(getApiKey(), videoIds);
      for (const detail of videoDetails) {
        detailsMap.set(detail.videoId, detail.duration);
      }
    } catch (error) {
      console.error("Failed to fetch video details:", error);
    }

    const finalVideos = enrichedVideos.map((video) => ({
      ...video,
      duration: detailsMap.get(video.videoId) ?? video.duration,
    }));

    const withinRange: typeof finalVideos = [];
    const outOfRange: Array<{ channelId: string; videoId: string }> = [];

    for (const video of finalVideos) {
      const seconds = parseDurationSeconds(video.duration);
      if (seconds >= getMinDuration() && seconds <= getMaxDuration()) {
        withinRange.push(video);
      } else {
        outOfRange.push({
          channelId: video.channelId,
          videoId: video.videoId,
        });
      }
    }

    upsertVideos(db, withinRange);
    bulkIgnoreVideos(db, outOfRange);
    res.json({ synced: withinRange.length, ignored: outOfRange.length });
  });

  router.post("/sync/videos", async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const subscriptions = getSubscriptionsByUserId(db, userId);
    const allVideos: Array<{
      channelId: string;
      videoId: string;
      title: string;
      description: string;
      thumbnail: string;
      duration: string;
      publishedAt: string;
    }> = [];

    for (const subscription of subscriptions) {
      try {
        const latestDate = getLatestVideoDateForChannel(
          db,
          subscription.channel_id,
        );
        const videos = await getChannelVideos(
          getApiKey(),
          subscription.channel_id,
          latestDate,
        );
        allVideos.push(
          ...videos.map((video) => ({
            ...video,
            channelId: subscription.channel_id,
          })),
        );
      } catch (error) {
        console.error(
          `Failed to fetch videos for ${subscription.channel_id}:`,
          error,
        );
      }
    }

    if (allVideos.length === 0) {
      res.json({ synced: 0, ignored: 0 });
      return;
    }

    const videoIds = allVideos.map((video) => video.videoId);
    const detailsMap = new Map<string, string>();

    try {
      const videoDetails = await getVideoDetails(getApiKey(), videoIds);
      for (const detail of videoDetails) {
        detailsMap.set(detail.videoId, detail.duration);
      }
    } catch (error) {
      console.error("Failed to fetch video details:", error);
    }

    const enrichedVideos = allVideos.map((video) => ({
      ...video,
      duration: detailsMap.get(video.videoId) ?? video.duration,
    }));

    const withinRange: typeof enrichedVideos = [];
    const outOfRange: Array<{ channelId: string; videoId: string }> = [];

    for (const video of enrichedVideos) {
      const seconds = parseDurationSeconds(video.duration);
      if (seconds >= getMinDuration() && seconds <= getMaxDuration()) {
        withinRange.push(video);
      } else {
        outOfRange.push({
          channelId: video.channelId,
          videoId: video.videoId,
        });
      }
    }

    upsertVideos(db, withinRange);
    bulkIgnoreVideos(db, outOfRange);
    res.json({ synced: withinRange.length, ignored: outOfRange.length });
  });

  router.post("/playlist", (req: Request, res: Response) => {
    const userId = getUserId(req);
    const playlistId = getBodyString(req.body, "playlistId");

    if (!playlistId) {
      res.status(400).json({ error: "Missing playlistId" });
      return;
    }

    updateUserPlaylist(db, userId, playlistId);
    res.json({ success: true });
  });

  router.get("/user", (req: Request, res: Response) => {
    const userId = getUserId(req);
    const user = getUserById(db, userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const { youtube_playlist_id, ...safeUser } = user;
    res.json({ user: safeUser, playlistId: youtube_playlist_id });
  });

  return router;
};
