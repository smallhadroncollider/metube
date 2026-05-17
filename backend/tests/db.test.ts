import { describe, it, expect, beforeEach } from "bun:test";
import type { Database } from "bun:sqlite";
import { initDb, createDb } from "../src/db/schema.js";
import {
  getUserByGoogleId,
  createUser,
  getUserById,
  getSubscriptionsByUserId,
  addSubscription,
  removeSubscription,
  getPendingVideos,
  upsertVideos,
  updateVideoStatus,
  getVideoById,
  getUserTokens,
  bulkIgnoreVideos,
  getLatestVideoDateForChannel,
} from "../src/db/repo.js";

describe("Database Repository", () => {
  let db: Database;

  beforeEach(() => {
    db = createDb(true);
    initDb(db);
  });

  describe("Users", () => {
    it("should create a user", () => {
      const user = createUser(
        db,
        "google-123",
        "test@test.com",
        "Test User",
        "https://pic.com/pic.jpg",
        "PL123",
      );
      expect(user.id).toBeGreaterThan(0);
      expect(user.google_id).toBe("google-123");
      expect(user.email).toBe("test@test.com");
      expect(user.name).toBe("Test User");
      expect(user.youtube_playlist_id).toBe("PL123");
    });

    it("should find a user by google id", () => {
      createUser(
        db,
        "google-456",
        "test2@test.com",
        "Test User 2",
        "https://pic.com/pic2.jpg",
        "PL456",
      );
      const user = getUserByGoogleId(db, "google-456");
      expect(user).not.toBeNull();
      expect(user?.name).toBe("Test User 2");
    });

    it("should return null for non-existent user", () => {
      const user = getUserByGoogleId(db, "non-existent");
      expect(user).toBeNull();
    });

    it("should find a user by id", () => {
      const created = createUser(
        db,
        "google-789",
        "test3@test.com",
        "Test User 3",
        "https://pic.com/pic3.jpg",
        "PL789",
      );
      const user = getUserById(db, created.id);
      expect(user).not.toBeNull();
      expect(user?.google_id).toBe("google-789");
    });

    it("should create user with empty tokens by default", () => {
      const user = createUser(
        db,
        "google-102",
        "test5@test.com",
        "Test User 5",
        "https://pic.com/pic5.jpg",
        "PL102",
      );
      const tokens = getUserTokens(db, user.id);
      expect(tokens).not.toBeNull();
      expect(tokens?.accessToken).toBe("");
      expect(tokens?.refreshToken).toBe("");
    });

    it("should update user tokens", () => {
      const user = createUser(
        db,
        "google-103",
        "test6@test.com",
        "Test User 6",
        "https://pic.com/pic6.jpg",
        "PL103",
      );
      user.access_token = "access-token-123";
      user.refresh_token = "refresh-token-456";
      const tokens = getUserTokens(db, user.id);
      expect(tokens).not.toBeNull();
      expect(tokens?.accessToken).toBe("");
      expect(tokens?.refreshToken).toBe("");
    });

    it("should return null for tokens of non-existent user", () => {
      const tokens = getUserTokens(db, 99999);
      expect(tokens).toBeNull();
    });

    it("should persist tokens across database recreation", () => {
      const user = createUser(
        db,
        "google-104",
        "test7@test.com",
        "Test User 7",
        "https://pic.com/pic7.jpg",
        "PL104",
      );
      user.access_token = "persistent-access";
      user.refresh_token = "persistent-refresh";
      const tokens = getUserTokens(db, user.id);
      expect(tokens?.accessToken).toBe("");
      expect(tokens?.refreshToken).toBe("");
    });
  });

  describe("Subscriptions", () => {
    it("should add a subscription", () => {
      const user = createUser(
        db,
        "google-201",
        "test5@test.com",
        "Test User 5",
        "https://pic.com/pic5.jpg",
        "PL201",
      );
      const sub = addSubscription(
        db,
        user.id,
        "UC_channel",
        "Channel Name",
        "https://thumb.com/ch.jpg",
      );
      expect(sub).not.toBeNull();
      expect(sub?.channel_id).toBe("UC_channel");
      expect(sub?.channel_title).toBe("Channel Name");
    });

    it("should return null for duplicate subscription", () => {
      const user = createUser(
        db,
        "google-202",
        "test6@test.com",
        "Test User 6",
        "https://pic.com/pic6.jpg",
        "PL202",
      );
      addSubscription(
        db,
        user.id,
        "UC_channel",
        "Channel Name",
        "https://thumb.com/ch.jpg",
      );
      const duplicate = addSubscription(
        db,
        user.id,
        "UC_channel",
        "Channel Name",
        "https://thumb.com/ch.jpg",
      );
      expect(duplicate).toBeNull();
    });

    it("should list subscriptions by user id", () => {
      const user = createUser(
        db,
        "google-203",
        "test7@test.com",
        "Test User 7",
        "https://pic.com/pic7.jpg",
        "PL203",
      );
      addSubscription(
        db,
        user.id,
        "UC_ch1",
        "Channel 1",
        "https://thumb.com/ch1.jpg",
      );
      addSubscription(
        db,
        user.id,
        "UC_ch2",
        "Channel 2",
        "https://thumb.com/ch2.jpg",
      );
      const subs = getSubscriptionsByUserId(db, user.id);
      expect(subs).toHaveLength(2);
    });

    it("should remove a subscription", () => {
      const user = createUser(
        db,
        "google-204",
        "test8@test.com",
        "Test User 8",
        "https://pic.com/pic8.jpg",
        "PL204",
      );
      addSubscription(
        db,
        user.id,
        "UC_ch3",
        "Channel 3",
        "https://thumb.com/ch3.jpg",
      );
      removeSubscription(db, user.id, "UC_ch3");
      const subs = getSubscriptionsByUserId(db, user.id);
      expect(subs).toHaveLength(0);
    });
  });

  describe("Videos", () => {
    it("should upsert videos", () => {
      const user = createUser(
        db,
        "google-301",
        "test9@test.com",
        "Test User 9",
        "https://pic.com/pic9.jpg",
        "PL301",
      );
      addSubscription(
        db,
        user.id,
        "UC_videos",
        "Video Channel",
        "https://thumb.com/vc.jpg",
      );

      upsertVideos(db, [
        {
          channelId: "UC_videos",
          videoId: "vid1",
          title: "Video 1",
          description: "Desc 1",
          thumbnail: "https://thumb.com/v1.jpg",
          duration: "PT10M30S",
          publishedAt: "2024-01-01T00:00:00Z",
        },
        {
          channelId: "UC_videos",
          videoId: "vid2",
          title: "Video 2",
          description: "Desc 2",
          thumbnail: "https://thumb.com/v2.jpg",
          duration: "PT5M15S",
          publishedAt: "2024-01-02T00:00:00Z",
        },
      ]);

      const pending = getPendingVideos(db, user.id);
      expect(pending).toHaveLength(2);
    });

    it("should not upsert videos with missing title", () => {
      const user = createUser(
        db,
        "google-301",
        "test9@test.com",
        "Test User 9",
        "https://pic.com/pic9.jpg",
        "PL301",
      );
      addSubscription(
        db,
        user.id,
        "UC_videos",
        "Video Channel",
        "https://thumb.com/vc.jpg",
      );

      upsertVideos(db, [
        {
          channelId: "UC_videos",
          videoId: "vid1",
          title: "",
          description: "Desc 1",
          thumbnail: "https://thumb.com/v1.jpg",
          duration: "PT10M30S",
          publishedAt: "2024-01-01T00:00:00Z",
        },
        {
          channelId: "UC_videos",
          videoId: "vid2",
          title: "Video 2",
          description: "Desc 2",
          thumbnail: "https://thumb.com/v2.jpg",
          duration: "PT5M15S",
          publishedAt: "2024-01-02T00:00:00Z",
        },
      ]);

      const pending = getPendingVideos(db, user.id);
      expect(pending).toHaveLength(1);
      expect(pending[0]?.video_id).toBe("vid2");
    });

    it("should not upsert videos with missing published_at", () => {
      const user = createUser(
        db,
        "google-301",
        "test9@test.com",
        "Test User 9",
        "https://pic.com/pic9.jpg",
        "PL301",
      );
      addSubscription(
        db,
        user.id,
        "UC_videos",
        "Video Channel",
        "https://thumb.com/vc.jpg",
      );

      upsertVideos(db, [
        {
          channelId: "UC_videos",
          videoId: "vid1",
          title: "Video 1",
          description: "Desc 1",
          thumbnail: "https://thumb.com/v1.jpg",
          duration: "PT10M30S",
          publishedAt: "",
        },
        {
          channelId: "UC_videos",
          videoId: "vid2",
          title: "Video 2",
          description: "Desc 2",
          thumbnail: "https://thumb.com/v2.jpg",
          duration: "PT5M15S",
          publishedAt: "2024-01-02T00:00:00Z",
        },
      ]);

      const pending = getPendingVideos(db, user.id);
      expect(pending).toHaveLength(1);
      expect(pending[0]?.video_id).toBe("vid2");
    });

    it("should not upsert videos with invalid published_at", () => {
      const user = createUser(
        db,
        "google-301",
        "test9@test.com",
        "Test User 9",
        "https://pic.com/pic9.jpg",
        "PL301",
      );
      addSubscription(
        db,
        user.id,
        "UC_videos",
        "Video Channel",
        "https://thumb.com/vc.jpg",
      );

      upsertVideos(db, [
        {
          channelId: "UC_videos",
          videoId: "vid1",
          title: "Video 1",
          description: "Desc 1",
          thumbnail: "https://thumb.com/v1.jpg",
          duration: "PT10M30S",
          publishedAt: "not-a-date",
        },
        {
          channelId: "UC_videos",
          videoId: "vid2",
          title: "Video 2",
          description: "Desc 2",
          thumbnail: "https://thumb.com/v2.jpg",
          duration: "PT5M15S",
          publishedAt: "2024-01-02T00:00:00Z",
        },
      ]);

      const pending = getPendingVideos(db, user.id);
      expect(pending).toHaveLength(1);
      expect(pending[0]?.video_id).toBe("vid2");
    });

    it("should normalize timestamps without Z suffix", () => {
      const user = createUser(
        db,
        "google-301",
        "test9@test.com",
        "Test User 9",
        "https://pic.com/pic9.jpg",
        "PL301",
      );
      addSubscription(
        db,
        user.id,
        "UC_videos",
        "Video Channel",
        "https://thumb.com/vc.jpg",
      );

      upsertVideos(db, [
        {
          channelId: "UC_videos",
          videoId: "vid1",
          title: "Video 1",
          description: "Desc 1",
          thumbnail: "https://thumb.com/v1.jpg",
          duration: "PT10M30S",
          publishedAt: "2024-01-01T00:00:00+00:00",
        },
      ]);

      const video = getVideoById(db, "vid1", "UC_videos");
      expect(video).not.toBeNull();
      expect(video?.published_at).toBe("2024-01-01T00:00:00.000Z");
    });

    it("should not duplicate videos on upsert", () => {
      const user = createUser(
        db,
        "google-302",
        "test10@test.com",
        "Test User 10",
        "https://pic.com/pic10.jpg",
        "PL302",
      );
      addSubscription(
        db,
        user.id,
        "UC_videos2",
        "Video Channel 2",
        "https://thumb.com/vc2.jpg",
      );

      upsertVideos(db, [
        {
          channelId: "UC_videos2",
          videoId: "vid3",
          title: "Video 3",
          description: "Desc 3",
          thumbnail: "https://thumb.com/v3.jpg",
          duration: "PT8M00S",
          publishedAt: "2024-01-01T00:00:00Z",
        },
      ]);
      upsertVideos(db, [
        {
          channelId: "UC_videos2",
          videoId: "vid3",
          title: "Video 3 Updated",
          description: "Desc 3 Updated",
          thumbnail: "https://thumb.com/v3-updated.jpg",
          duration: "PT8M00S",
          publishedAt: "2024-01-01T00:00:00Z",
        },
      ]);

      const pending = getPendingVideos(db, user.id);
      expect(pending).toHaveLength(1);
    });

    it("should add video status", () => {
      const user = createUser(
        db,
        "google-303",
        "test11@test.com",
        "Test User 11",
        "https://pic.com/pic11.jpg",
        "PL303",
      );
      addSubscription(
        db,
        user.id,
        "UC_videos3",
        "Video Channel 3",
        "https://thumb.com/vc3.jpg",
      );

      upsertVideos(db, [
        {
          channelId: "UC_videos3",
          videoId: "vid4",
          title: "Video 4",
          description: "Desc 4",
          thumbnail: "https://thumb.com/v4.jpg",
          duration: "PT12M00S",
          publishedAt: "2024-01-01T00:00:00Z",
        },
      ]);

      updateVideoStatus(db, "vid4", "UC_videos3", "added");
      const pending = getPendingVideos(db, user.id);
      expect(pending).toHaveLength(0);
    });

    it("should ignore video status", () => {
      const user = createUser(
        db,
        "google-304",
        "test12@test.com",
        "Test User 12",
        "https://pic.com/pic12.jpg",
        "PL304",
      );
      addSubscription(
        db,
        user.id,
        "UC_videos4",
        "Video Channel 4",
        "https://thumb.com/vc4.jpg",
      );

      upsertVideos(db, [
        {
          channelId: "UC_videos4",
          videoId: "vid5",
          title: "Video 5",
          description: "Desc 5",
          thumbnail: "https://thumb.com/v5.jpg",
          duration: "PT15M00S",
          publishedAt: "2024-01-01T00:00:00Z",
        },
      ]);

      updateVideoStatus(db, "vid5", "UC_videos4", "ignored");
      const pending = getPendingVideos(db, user.id);
      expect(pending).toHaveLength(0);
    });

    it("should only return pending videos", () => {
      const user = createUser(
        db,
        "google-305",
        "test13@test.com",
        "Test User 13",
        "https://pic.com/pic13.jpg",
        "PL305",
      );
      addSubscription(
        db,
        user.id,
        "UC_videos5",
        "Video Channel 5",
        "https://thumb.com/vc5.jpg",
      );

      upsertVideos(db, [
        {
          channelId: "UC_videos5",
          videoId: "vid6",
          title: "Video 6",
          description: "Desc 6",
          thumbnail: "https://thumb.com/v6.jpg",
          duration: "PT20M00S",
          publishedAt: "2024-01-01T00:00:00Z",
        },
        {
          channelId: "UC_videos5",
          videoId: "vid7",
          title: "Video 7",
          description: "Desc 7",
          thumbnail: "https://thumb.com/v7.jpg",
          duration: "PT7M30S",
          publishedAt: "2024-01-02T00:00:00Z",
        },
      ]);

      updateVideoStatus(db, "vid6", "UC_videos5", "added");
      const pending = getPendingVideos(db, user.id);
      expect(pending).toHaveLength(1);
      expect(pending[0]?.video_id).toBe("vid7");
    });

    it("should get video by id", () => {
      const user = createUser(
        db,
        "google-306",
        "test14@test.com",
        "Test User 14",
        "https://pic.com/pic14.jpg",
        "PL306",
      );
      addSubscription(
        db,
        user.id,
        "UC_videos6",
        "Video Channel 6",
        "https://thumb.com/vc6.jpg",
      );

      upsertVideos(db, [
        {
          channelId: "UC_videos6",
          videoId: "vid8",
          title: "Video 8",
          description: "Desc 8",
          thumbnail: "https://thumb.com/v8.jpg",
          duration: "PT3M45S",
          publishedAt: "2024-01-01T00:00:00Z",
        },
      ]);

      const video = getVideoById(db, "vid8", "UC_videos6");
      expect(video).not.toBeNull();
      expect(video?.title).toBe("Video 8");
    });

    it("should bulk ignore videos", () => {
      const user = createUser(
        db,
        "google-307",
        "test15@test.com",
        "Test User 15",
        "https://pic.com/pic15.jpg",
        "PL307",
      );
      addSubscription(
        db,
        user.id,
        "UC_videos7",
        "Video Channel 7",
        "https://thumb.com/vc7.jpg",
      );

      bulkIgnoreVideos(db, [
        { channelId: "UC_videos7", videoId: "vid9" },
        { channelId: "UC_videos7", videoId: "vid10" },
      ]);

      const pending = getPendingVideos(db, user.id);
      expect(pending).toHaveLength(0);
    });

    it("should mark existing videos as ignored via bulk ignore", () => {
      const user = createUser(
        db,
        "google-308",
        "test16@test.com",
        "Test User 16",
        "https://pic.com/pic16.jpg",
        "PL308",
      );
      addSubscription(
        db,
        user.id,
        "UC_videos8",
        "Video Channel 8",
        "https://thumb.com/vc8.jpg",
      );

      upsertVideos(db, [
        {
          channelId: "UC_videos8",
          videoId: "vid11",
          title: "Video 11",
          description: "Desc 11",
          thumbnail: "https://thumb.com/v11.jpg",
          duration: "PT10M00S",
          publishedAt: "2024-01-01T00:00:00Z",
        },
      ]);

      let pending = getPendingVideos(db, user.id);
      expect(pending).toHaveLength(1);

      bulkIgnoreVideos(db, [{ channelId: "UC_videos8", videoId: "vid11" }]);

      pending = getPendingVideos(db, user.id);
      expect(pending).toHaveLength(0);
    });

    it("should get latest video date for channel", () => {
      const user = createUser(
        db,
        "google-309",
        "test17@test.com",
        "Test User 17",
        "https://pic.com/pic17.jpg",
        "PL309",
      );
      addSubscription(
        db,
        user.id,
        "UC_videos9",
        "Video Channel 9",
        "https://thumb.com/vc9.jpg",
      );

      upsertVideos(db, [
        {
          channelId: "UC_videos9",
          videoId: "vid1",
          title: "Video 1",
          description: "Desc 1",
          thumbnail: "https://thumb.com/v1.jpg",
          duration: "PT10M00S",
          publishedAt: "2024-01-01T00:00:00Z",
        },
        {
          channelId: "UC_videos9",
          videoId: "vid2",
          title: "Video 2",
          description: "Desc 2",
          thumbnail: "https://thumb.com/v2.jpg",
          duration: "PT10M00S",
          publishedAt: "2024-01-02T00:00:00Z",
        },
      ]);

      const latest = getLatestVideoDateForChannel(db, "UC_videos9");
      expect(latest).toBe("2024-01-02T00:00:00Z");
    });

    it("should get latest video date for channel with normalized timestamps", () => {
      const user = createUser(
        db,
        "google-309",
        "test17@test.com",
        "Test User 17",
        "https://pic.com/pic17.jpg",
        "PL309",
      );
      addSubscription(
        db,
        user.id,
        "UC_videos9",
        "Video Channel 9",
        "https://thumb.com/vc9.jpg",
      );

      upsertVideos(db, [
        {
          channelId: "UC_videos9",
          videoId: "vid1",
          title: "Video 1",
          description: "Desc 1",
          thumbnail: "https://thumb.com/v1.jpg",
          duration: "PT10M00S",
          publishedAt: "2024-01-01T00:00:00+00:00",
        },
        {
          channelId: "UC_videos9",
          videoId: "vid2",
          title: "Video 2",
          description: "Desc 2",
          thumbnail: "https://thumb.com/v2.jpg",
          duration: "PT10M00S",
          publishedAt: "2024-01-02T00:00:00+00:00",
        },
      ]);

      const latest = getLatestVideoDateForChannel(db, "UC_videos9");
      expect(latest).toBe("2024-01-02T00:00:00.000Z");
    });

    it("should get latest video date for channel returns null when no videos", () => {
      const user = createUser(
        db,
        "google-309",
        "test17@test.com",
        "Test User 17",
        "https://pic.com/pic17.jpg",
        "PL309",
      );
      addSubscription(
        db,
        user.id,
        "UC_videos9",
        "Video Channel 9",
        "https://thumb.com/vc9.jpg",
      );

      const latest = getLatestVideoDateForChannel(db, "UC_videos9");
      expect(latest).toBeNull();
    });
  });
});
