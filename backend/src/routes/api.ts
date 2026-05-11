import { type IRouter, Router, type Request, type Response } from "express";
import type { Database } from "bun:sqlite";
import type { OAuth2Client } from "google-auth-library";
import {
  searchChannels,
  getChannelVideos,
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
} from "../db/repo.js";

declare module "express-session" {
  interface SessionData {
    userId: number;
    oauth2Client?: OAuth2Client;
  }
}

const requireAuth = (req: Request, res: Response, next: () => void) => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
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
    const videoId = req.params.videoId ?? "";
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

    if (req.session.oauth2Client) {
      const result = await addToPlaylist(
        req.session.oauth2Client,
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
    const videoId = req.params.videoId ?? "";
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
    const channelId = req.params.channelId ?? "";
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
    }

    const withinRange: typeof allVideos = [];
    const outOfRange: Array<{ channelId: string; videoId: string }> = [];

    for (const video of allVideos) {
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
