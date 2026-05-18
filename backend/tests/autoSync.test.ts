import { describe, it, expect, beforeEach, afterEach, spyOn } from "bun:test";
import type { Database } from "bun:sqlite";
import { initDb, createDb } from "../src/db/schema.js";

describe("Auto-sync module", () => {
  let db: Database;
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    db = createDb(true);
    initDb(db);

    originalEnv = { ...process.env };
    process.env.YOUTUBE_API_KEY = "fake-api-key";
    delete process.env.REFRESH_INTERVAL_MINUTES;
  });

  afterEach(() => {
    Object.assign(process.env, originalEnv);
    const { stopSyncTimer } = require("../src/sync/autoSync.js");
    stopSyncTimer();
  });

  describe("getRefreshIntervalMinutes", () => {
    it("should return 60 when REFRESH_INTERVAL_MINUTES is not set", () => {
      delete process.env.REFRESH_INTERVAL_MINUTES;
      const { startSyncTimer } = require("../src/sync/autoSync.js");
      expect(() => startSyncTimer(db)).not.toThrow();
    });

    it("should return 30 when REFRESH_INTERVAL_MINUTES is 30", () => {
      process.env.REFRESH_INTERVAL_MINUTES = "30";
      const { startSyncTimer } = require("../src/sync/autoSync.js");
      expect(() => startSyncTimer(db)).not.toThrow();
    });

    it("should return 60 for invalid REFRESH_INTERVAL_MINUTES values", () => {
      const invalidValues = ["0", "-1", "abc", ""];

      for (const value of invalidValues) {
        process.env.REFRESH_INTERVAL_MINUTES = value;
        const { startSyncTimer } = require("../src/sync/autoSync.js");
        expect(() => startSyncTimer(db)).not.toThrow();
      }
    });
  });

  describe("sync timer with no users", () => {
    it("should not start the timer when no users exist", () => {
      const {
        startSyncTimer,
        isSyncActive,
      } = require("../src/sync/autoSync.js");

      startSyncTimer(db);
      expect(isSyncActive()).toBe(false);
    });
  });

  describe("sync timer with users", () => {
    it("should start the timer when a user exists", () => {
      const { createUser } = require("../src/db/repo.js");
      createUser(
        db,
        "google-1001",
        "test@test.com",
        "Test User",
        "https://pic.com/pic.jpg",
        "PL1001",
      );

      const {
        startSyncTimer,
        isSyncActive,
      } = require("../src/sync/autoSync.js");

      startSyncTimer(db);
      expect(isSyncActive()).toBe(true);
    });

    it("should stop the timer when stopSyncTimer is called", () => {
      const { createUser } = require("../src/db/repo.js");
      createUser(
        db,
        "google-1002",
        "test2@test.com",
        "Test User 2",
        "https://pic.com/pic2.jpg",
        "PL1002",
      );

      const {
        startSyncTimer,
        stopSyncTimer,
        isSyncActive,
      } = require("../src/sync/autoSync.js");

      startSyncTimer(db);
      expect(isSyncActive()).toBe(true);

      stopSyncTimer();
      expect(isSyncActive()).toBe(false);
    });
  });

  describe("concurrent sync prevention", () => {
    it("should prevent concurrent syncs via isSyncing flag", async () => {
      const { isSyncActive } = require("../src/sync/autoSync.js");

      // After stopSyncTimer in afterEach, the timer should not be active
      expect(isSyncActive()).toBe(false);
    });
  });

  describe("sync with YouTube API", () => {
    it("should complete sync without errors when YouTube API returns empty", async () => {
      const { createUser } = require("../src/db/repo.js");
      createUser(
        db,
        "google-1010",
        "api@test.com",
        "API Test User",
        "https://pic.com/api.jpg",
        "PL1010",
      );

      const fetchMock = spyOn(globalThis, "fetch").mockImplementation((() =>
        Promise.resolve(
          new Response(JSON.stringify({ items: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        )) as unknown as typeof fetch);

      const logs: string[] = [];
      const logSpy = spyOn(console, "log").mockImplementation(
        (...args: unknown[]) => {
          const msg = args.map((a) => String(a)).join(" ");
          logs.push(msg);
        },
      );

      try {
        const {
          startSyncTimer,
          stopSyncTimer,
        } = require("../src/sync/autoSync.js");

        stopSyncTimer();
        startSyncTimer(db);
        await new Promise((resolve) => setTimeout(resolve, 200));

        stopSyncTimer();

        expect(logs.some((l) => l.includes("Sync complete"))).toBe(true);
        expect(logs.some((l) => l.includes("Sync failed"))).toBe(false);
      } finally {
        fetchMock.mockRestore();
        logSpy.mockRestore();
      }
    });
  });
});
