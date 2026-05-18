import type { Response } from "express";
import type { Database } from "bun:sqlite";
import { isSyncing, getNextSyncAt } from "./autoSync.js";

type SseClient = {
  response: Response;
  heartbeatInterval: ReturnType<typeof setInterval>;
};

const clients = new Set<SseClient>();

const sendSseEvent = (message: string, data: string): void => {
  for (const client of clients) {
    client.response.write(`event: ${message}\ndata: ${data}\n\n`);
  }
};

export const notifySyncComplete = (): void => {
  sendSseEvent("sync_complete", "");
};

export const notifySyncSchedule = (nextSyncAt: string): void => {
  sendSseEvent("sync_schedule", JSON.stringify({ next_sync_at: nextSyncAt }));
};

const sendHeartbeat = (client: SseClient): void => {
  client.response.write(": heartbeat\n\n");
};

export const addSseClient = (
  db: Database,
  res: Response,
  onCleanup: () => void,
): void => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const client: SseClient = {
    response: res,
    heartbeatInterval: setInterval(() => sendHeartbeat(client), 15_000),
  };

  clients.add(client);

  const initialData = JSON.stringify({
    is_syncing: isSyncing,
    next_sync_at: getNextSyncAt(db),
  });
  res.write(`event: init\ndata: ${initialData}\n\n`);

  const handleClose = (): void => {
    clients.delete(client);
    clearInterval(client.heartbeatInterval);
    onCleanup();
  };

  res.on("close", handleClose);
};

export const removeSseClient = (client: SseClient): void => {
  clearInterval(client.heartbeatInterval);
  clients.delete(client);
};
