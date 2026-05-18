import type { Database } from "bun:sqlite";

let syncIntervalId: ReturnType<typeof setInterval> | null = null;
let isSyncing = false;

const getRefreshIntervalMinutes = (): number => {
  const value = process.env.REFRESH_INTERVAL_MINUTES;
  if (!value) {
    return 60;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed <= 0) {
    return 60;
  }
  return parsed;
};

const shouldSyncOnStart = (): boolean => {
  const value = process.env.SYNC_ON_START;
  if (value === undefined) {
    return true;
  }
  const lower = value.toLowerCase();
  return lower !== "0" && lower !== "false" && lower !== "off";
};

const getApiKey = (): string => process.env.YOUTUBE_API_KEY ?? "";

const getUserId = (db: Database): number | null => {
  const rows = db.query("SELECT id FROM users LIMIT 1").all() as Array<{
    id: number;
  }>;
  const firstUser = rows[0];
  return firstUser ? firstUser.id : null;
};

const startSyncTimer = (
  db: Database,
  onSyncStart?: () => void,
  onSyncComplete?: (result: { synced: number; ignored: number }) => void,
  onSyncError?: (error: unknown) => void,
): Promise<void> => {
  const userId = getUserId(db);

  if (!userId) {
    console.log("[auto-sync] No users found; auto-sync disabled");
    return Promise.resolve();
  }

  const intervalMs = getRefreshIntervalMinutes() * 60 * 1000;

  const performSync = async (): Promise<void> => {
    if (isSyncing) {
      console.log("[auto-sync] Skipping: sync already in progress");
      return;
    }

    isSyncing = true;
    console.log(
      `[auto-sync] Starting sync (interval: ${getRefreshIntervalMinutes()}min)`,
    );
    onSyncStart?.();

    const { syncVideos } = await import("../youtube/sync.js");

    try {
      const result = await syncVideos({ db, userId, apiKey: getApiKey() });
      console.log(
        `[auto-sync] Sync complete: ${result.synced} synced, ${result.ignored} ignored`,
      );
      onSyncComplete?.(result);
    } catch (error) {
      console.error("[auto-sync] Sync failed:", error);
      onSyncError?.(error);
    } finally {
      isSyncing = false;
    }
  };

  syncIntervalId = setInterval(performSync, intervalMs);

  if (shouldSyncOnStart()) {
    return performSync();
  }

  return Promise.resolve();
};

const stopSyncTimer = (): void => {
  if (syncIntervalId !== null) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
  }
  isSyncing = false;
  console.log("[auto-sync] Timer stopped");
};

const isSyncActive = (): boolean => syncIntervalId !== null;

export { startSyncTimer, stopSyncTimer, isSyncActive };
