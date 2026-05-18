import { z } from "zod";
import type {
  AuthStatus,
  DeviceAuthResponse,
  DevicePollResponse,
  VideosResponse,
  SubscriptionsResponse,
  SearchResponse,
  SyncResponse,
  SuccessResponse,
  SubscriptionResponse,
  ChannelSyncResponse,
} from "./types.js";
import type { User } from "../types/index.js";

const ErrorResponseSchema = z.object({
  error: z.string(),
});

const SuccessResponseSchema = z.object({
  success: z.literal(true),
});

const AuthStatusSchema = z.object({
  authenticated: z.boolean(),
  userId: z.number().optional(),
});

const DeviceAuthResponseSchema: z.ZodType<DeviceAuthResponse> = z.object({
  user_code: z.string(),
  verification_url: z.string(),
  device_code: z.string(),
  interval: z.number(),
  expires_in: z.number(),
});

const DevicePollPendingSchema = z.object({
  status: z.literal("pending"),
});

const DevicePollSlowDownSchema = z.object({
  status: z.literal("slow_down"),
});

const DevicePollErrorSchema = z.object({
  status: z.literal("error"),
  error: z.string(),
});

const DevicePollCompleteSchema = z.object({
  status: z.literal("complete"),
  userId: z.number(),
});

const DevicePollResponseSchema = z.discriminatedUnion("status", [
  DevicePollCompleteSchema,
  DevicePollPendingSchema,
  DevicePollSlowDownSchema,
  DevicePollErrorSchema,
]);

const VideosResponseSchema = z.object({
  videos: z.array(
    z.object({
      id: z.number(),
      channel_id: z.string(),
      video_id: z.string(),
      title: z.string(),
      description: z.string(),
      thumbnail: z.string(),
      duration: z.string(),
      published_at: z.string(),
      status: z.enum(["pending", "added", "ignored"]),
      added_at: z.string().nullable(),
    }),
  ),
  next_sync_at: z.string().nullable(),
  is_syncing: z.boolean(),
});

const SubscriptionsResponseSchema = z.object({
  subscriptions: z.array(
    z.object({
      id: z.number(),
      user_id: z.number(),
      channel_id: z.string(),
      channel_title: z.string(),
      channel_thumbnail: z.string(),
      subscribed_at: z.string(),
    }),
  ),
});

const SearchResponseSchema = z.object({
  channels: z.array(
    z.object({
      channelId: z.string(),
      title: z.string(),
      thumbnail: z.string(),
    }),
  ),
});

const SyncResponseSchema = z.object({
  synced: z.number(),
  ignored: z.number(),
});

const SubscriptionResponseSchema = z.object({
  subscription: z.object({
    id: z.number(),
    user_id: z.number(),
    channel_id: z.string(),
    channel_title: z.string(),
    channel_thumbnail: z.string(),
    subscribed_at: z.string(),
  }),
});

const fetchWithPrefix = async <T extends z.ZodTypeAny>(
  prefix: string,
  path: string,
  schema: T,
  options?: RequestInit,
): Promise<z.infer<T>> => {
  const response = await fetch(`${prefix}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json();

  if (!response.ok) {
    const error = ErrorResponseSchema.parse(data);
    throw new Error(error.error ?? "Request failed");
  }

  return schema.parse(data);
};

const apiFetch = <T extends z.ZodTypeAny>(
  path: string,
  schema: T,
  options?: RequestInit,
): Promise<z.infer<T>> => fetchWithPrefix("/api", path, schema, options);

const authFetch = <T extends z.ZodTypeAny>(
  path: string,
  schema: T,
  options?: RequestInit,
): Promise<z.infer<T>> => fetchWithPrefix("/auth", path, schema, options);

export const checkAuthStatus = (): Promise<AuthStatus> =>
  authFetch("/status", AuthStatusSchema);

export const requestDeviceAuth = (): Promise<DeviceAuthResponse> =>
  authFetch("/device/auth", DeviceAuthResponseSchema, { method: "POST" });

export const pollDeviceToken = async (
  deviceCode: string,
): Promise<DevicePollResponse> => {
  const response = await fetch("/auth/device/poll", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_code: deviceCode }),
  });
  const data = await response.json();

  if (!response.ok) {
    const error = ErrorResponseSchema.parse(data);
    return { status: "error", error: error.error };
  }

  return DevicePollResponseSchema.parse(data);
};

export const logout = (): Promise<SuccessResponse> =>
  authFetch("/logout", SuccessResponseSchema, { method: "POST" });

export const getVideos = (): Promise<VideosResponse> =>
  apiFetch("/videos", VideosResponseSchema);

export const addVideo = (
  videoId: string,
  channelId: string,
): Promise<SuccessResponse> =>
  apiFetch(`/videos/${videoId}/add`, SuccessResponseSchema, {
    method: "POST",
    body: JSON.stringify({ channelId }),
  });

export const ignoreVideo = (
  videoId: string,
  channelId: string,
): Promise<SuccessResponse> =>
  apiFetch(`/videos/${videoId}/ignore`, SuccessResponseSchema, {
    method: "POST",
    body: JSON.stringify({ channelId }),
  });

export const ignoreAllVideos = (): Promise<SuccessResponse> =>
  apiFetch("/videos/ignore-all", SuccessResponseSchema, {
    method: "POST",
  });

export const getSubscriptions = (): Promise<SubscriptionsResponse> =>
  apiFetch("/subscriptions", SubscriptionsResponseSchema);

export const addSubscription = (
  channelId: string,
  channelTitle: string,
  channelThumbnail: string,
): Promise<SubscriptionResponse> =>
  apiFetch("/subscriptions", SubscriptionResponseSchema, {
    method: "POST",
    body: JSON.stringify({ channelId, channelTitle, channelThumbnail }),
  });

export const removeSubscription = (
  channelId: string,
): Promise<SuccessResponse> =>
  apiFetch(`/subscriptions/${channelId}`, SuccessResponseSchema, {
    method: "DELETE",
  });

export const searchChannels = (query: string): Promise<SearchResponse> =>
  apiFetch(
    `/search/channels?q=${encodeURIComponent(query)}`,
    SearchResponseSchema,
  );

export const syncVideos = (): Promise<SyncResponse> =>
  apiFetch("/sync/videos", SyncResponseSchema, { method: "POST" });

export const syncChannelVideos = (
  channelId: string,
): Promise<ChannelSyncResponse> =>
  apiFetch(`/sync/channel/${channelId}`, SyncResponseSchema, {
    method: "POST",
  });

export const getUser = (): Promise<{ user: User; playlistId: string }> =>
  apiFetch("/user", z.object({ user: z.any(), playlistId: z.string() }));
