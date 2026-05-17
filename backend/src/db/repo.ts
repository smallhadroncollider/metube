import type { Database } from "bun:sqlite";
import type { User, Subscription, Video } from "./schema.js";

export const getUserByGoogleId = (
  db: Database,
  googleId: string,
): User | null =>
  db
    .query("SELECT * FROM users WHERE google_id = ?")
    .get(googleId) as User | null;

export const createUser = (
  db: Database,
  googleId: string,
  email: string,
  name: string,
  picture: string,
  youtubePlaylistId: string,
): User => {
  db.query(
    `INSERT INTO users (google_id, email, name, picture, youtube_playlist_id)
       VALUES (?, ?, ?, ?, ?)`,
  ).run(googleId, email, name, picture, youtubePlaylistId);
  return getUserByGoogleId(db, googleId) as User;
};

export const updateUserPlaylist = (
  db: Database,
  userId: number,
  playlistId: string,
): void => {
  db.query("UPDATE users SET youtube_playlist_id = ? WHERE id = ?").run(
    playlistId,
    userId,
  );
};

export const updateUserTokens = (
  db: Database,
  userId: number,
  accessToken: string,
  refreshToken: string,
  expiryDate: number,
): void => {
  db.query(
    "UPDATE users SET access_token = ?, refresh_token = ?, expiry_date = ? WHERE id = ?",
  ).run(accessToken, refreshToken, String(expiryDate), userId);
};

export const getUserTokens = (
  db: Database,
  userId: number,
): { accessToken: string; refreshToken: string; expiryDate: number } | null => {
  const row = db
    .query(
      "SELECT access_token, refresh_token, expiry_date FROM users WHERE id = ?",
    )
    .get(userId) as {
    access_token: string;
    refresh_token: string;
    expiry_date: string;
  } | null;

  if (!row) {
    return null;
  }

  return {
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    expiryDate: parseInt(row.expiry_date, 10) ?? 0,
  };
};

export const getUserById = (db: Database, id: number): User | null =>
  db.query("SELECT * FROM users WHERE id = ?").get(id) as User | null;

export const getSubscriptionsByUserId = (
  db: Database,
  userId: number,
): Subscription[] =>
  db
    .query(
      "SELECT * FROM subscriptions WHERE user_id = ? ORDER BY subscribed_at DESC",
    )
    .all(userId) as Subscription[];

export const addSubscription = (
  db: Database,
  userId: number,
  channelId: string,
  channelTitle: string,
  channelThumbnail: string,
): Subscription | null => {
  try {
    db.query(
      `INSERT INTO subscriptions (user_id, channel_id, channel_title, channel_thumbnail)
         VALUES (?, ?, ?, ?)`,
    ).run(userId, channelId, channelTitle, channelThumbnail);
    return getSubscriptionByUserIdAndChannelId(db, userId, channelId);
  } catch {
    return null;
  }
};

export const getSubscriptionByUserIdAndChannelId = (
  db: Database,
  userId: number,
  channelId: string,
): Subscription | null =>
  db
    .query("SELECT * FROM subscriptions WHERE user_id = ? AND channel_id = ?")
    .get(userId, channelId) as Subscription | null;

export const removeSubscription = (
  db: Database,
  userId: number,
  channelId: string,
): void => {
  db.query(
    "DELETE FROM subscriptions WHERE user_id = ? AND channel_id = ?",
  ).run(userId, channelId);
};

export const getPendingVideos = (db: Database, userId: number): Video[] =>
  db
    .query(
      `
      SELECT v.* FROM videos v
      JOIN subscriptions s ON v.channel_id = s.channel_id
      WHERE s.user_id = ? AND v.status = 'pending'
      ORDER BY v.published_at DESC
    `,
    )
    .all(userId) as Video[];

type ChannelVideo = {
  channelId: string;
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  publishedAt: string;
};

export const normalizeTimestamp = (timestamp: string): string => {
  if (timestamp.endsWith("Z")) {
    return timestamp;
  }

  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString();
};

export const isTimestampValid = (timestamp: string): boolean => {
  if (!timestamp.length) {
    return false;
  }

  if (timestamp.endsWith("Z")) {
    return true;
  }

  const date = new Date(timestamp);
  return !isNaN(date.getTime());
};

export const upsertVideos = (
  db: Database,
  channelVideos: ChannelVideo[],
): void => {
  const filtered = channelVideos.filter(
    (video) => video.title !== "" && isTimestampValid(video.publishedAt),
  );

  const insert = db.transaction((videos: ChannelVideo[]) => {
    for (const video of videos) {
      const publishedAt = normalizeTimestamp(video.publishedAt);
      db.query(
        `INSERT INTO videos (channel_id, video_id, title, description, thumbnail, duration, published_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(channel_id, video_id) DO NOTHING`,
      ).run(
        video.channelId,
        video.videoId,
        video.title,
        video.description,
        video.thumbnail,
        video.duration,
        publishedAt,
      );
    }
  });
  insert(filtered);
};

export const updateVideoStatus = (
  db: Database,
  videoId: string,
  channelId: string,
  status: "added" | "ignored",
): void => {
  db.query(
    `UPDATE videos SET status = ?, added_at = datetime('now')
       WHERE video_id = ? AND channel_id = ?`,
  ).run(status, videoId, channelId);
};

export const getVideoById = (
  db: Database,
  videoId: string,
  channelId: string,
): Video | null =>
  db
    .query("SELECT * FROM videos WHERE video_id = ? AND channel_id = ?")
    .get(videoId, channelId) as Video | null;

export const getDiscoveredChannelIds = (db: Database): string[] =>
  (
    db.query("SELECT DISTINCT channel_id FROM videos").all() as Array<{
      channel_id: string;
    }>
  ).map((row) => row.channel_id);

export const getLatestVideoDateForChannel = (
  db: Database,
  channelId: string,
): string | null => {
  const row = db
    .query("SELECT MAX(published_at) FROM videos WHERE channel_id = ?")
    .get(channelId) as { "MAX(published_at)": string } | null;
  return row?.["MAX(published_at)"] ?? null;
};

export const bulkIgnoreVideos = (
  db: Database,
  videos: Array<{ channelId: string; videoId: string }>,
): void => {
  const bulkIgnore = db.transaction(
    (videoList: Array<{ channelId: string; videoId: string }>) => {
      for (const video of videoList) {
        db.query(
          `INSERT INTO videos (channel_id, video_id, title, description, thumbnail, duration, published_at, status)
           VALUES (?, ?, '', '', '', '', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), 'ignored')
           ON CONFLICT(channel_id, video_id) DO UPDATE SET status = 'ignored'`,
        ).run(video.channelId, video.videoId);
      }
    },
  );
  bulkIgnore(videos);
};
