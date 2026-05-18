import type { Database } from "bun:sqlite";
import {
  bulkIgnoreVideos,
  getLatestVideoDateForChannel,
  getSubscriptionsByUserId,
  upsertVideos,
} from "../db/repo.js";
import {
  getChannelVideos,
  getVideoDetails,
  parseDurationSeconds,
} from "./youtube.js";

type VideoResult = {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  publishedAt: string;
};

type EnrichedVideo = VideoResult & { channelId: string };

type CategorizeResult = {
  withinRange: EnrichedVideo[];
  outOfRange: Array<{ channelId: string; videoId: string }>;
};

const getMinDuration = (): number =>
  parseInt(process.env.MIN_DURATION ?? "60", 10);
const getMaxDuration = (): number =>
  parseInt(process.env.MAX_DURATION ?? "3600", 10);

const parseDurationSecondsFromEnv = (duration: string): number =>
  parseDurationSeconds(duration);

const isWithinDurationRange = (
  video: EnrichedVideo,
): { withinRange: boolean } => {
  const seconds = parseDurationSecondsFromEnv(video.duration);
  return {
    withinRange: seconds >= getMinDuration() && seconds <= getMaxDuration(),
  };
};

const enrichVideosWithDetails = async (
  apiKey: string,
  videos: EnrichedVideo[],
): Promise<Map<string, string>> => {
  const videoIds = videos.map((v) => v.videoId);
  const detailsMap = new Map<string, string>();

  try {
    const videoDetails = await getVideoDetails(apiKey, videoIds);
    for (const detail of videoDetails) {
      detailsMap.set(detail.videoId, detail.duration);
    }
  } catch (error) {
    console.error("Failed to fetch video details:", error);
  }

  return detailsMap;
};

const categorizeVideos = (videos: EnrichedVideo[]): CategorizeResult => {
  const withinRange: EnrichedVideo[] = [];
  const outOfRange: Array<{ channelId: string; videoId: string }> = [];

  for (const video of videos) {
    const { withinRange: inRange } = isWithinDurationRange(video);
    if (inRange) {
      withinRange.push(video);
    } else {
      outOfRange.push({
        channelId: video.channelId,
        videoId: video.videoId,
      });
    }
  }

  return { withinRange, outOfRange };
};

type SyncResult = { synced: number; ignored: number };

type SyncVideosArgs = {
  db: Database;
  userId: number;
  apiKey: string;
};

export const syncVideos = async (args: SyncVideosArgs): Promise<SyncResult> => {
  const { db, userId, apiKey } = args;
  const subscriptions = getSubscriptionsByUserId(db, userId);
  const allVideos: EnrichedVideo[] = [];

  for (const subscription of subscriptions) {
    try {
      const latestDate = getLatestVideoDateForChannel(
        db,
        subscription.channel_id,
      );
      const videos = await getChannelVideos(
        apiKey,
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
    return { synced: 0, ignored: 0 };
  }

  const detailsMap = await enrichVideosWithDetails(apiKey, allVideos);
  const enrichedVideos: EnrichedVideo[] = allVideos.map((video) => ({
    ...video,
    duration: detailsMap.get(video.videoId) ?? video.duration,
  }));

  const { withinRange, outOfRange } = categorizeVideos(enrichedVideos);
  upsertVideos(db, withinRange);
  bulkIgnoreVideos(db, outOfRange);

  return { synced: withinRange.length, ignored: outOfRange.length };
};

export type { SyncResult };
