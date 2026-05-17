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

type ErrorResponse = {
  error: string;
};

const fetchWithPrefix = async <T>(
  prefix: string,
  path: string,
  options?: RequestInit,
): Promise<T> => {
  const response = await fetch(`${prefix}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = (await response.json()) as unknown;

  if (!response.ok) {
    const error = data as ErrorResponse;
    throw new Error(error.error ?? "Request failed");
  }

  return data as T;
};

import type { User } from "../types/index.js";

const apiFetch = <T>(path: string, options?: RequestInit): Promise<T> =>
  fetchWithPrefix("/api", path, options);

const authFetch = <T>(path: string, options?: RequestInit): Promise<T> =>
  fetchWithPrefix("/auth", path, options);

export const checkAuthStatus = (): Promise<AuthStatus> => authFetch("/status");

export const requestDeviceAuth = (): Promise<DeviceAuthResponse> =>
  authFetch("/device/auth", { method: "POST" });

export const pollDeviceToken = async (
  deviceCode: string,
): Promise<DevicePollResponse> => {
  const response = await fetch("/auth/device/poll", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_code: deviceCode }),
  });
  const data = (await response.json()) as unknown;

  if (!response.ok) {
    const error = (data as { error?: string }).error ?? "unknown";
    return { status: "error", error };
  }

  return data as DevicePollResponse;
};

export const logout = (): Promise<SuccessResponse> =>
  authFetch("/logout", { method: "POST" });

export const getVideos = (): Promise<VideosResponse> => apiFetch("/videos");

export const addVideo = (
  videoId: string,
  channelId: string,
): Promise<SuccessResponse> =>
  apiFetch(`/videos/${videoId}/add`, {
    method: "POST",
    body: JSON.stringify({ channelId }),
  });

export const ignoreVideo = (
  videoId: string,
  channelId: string,
): Promise<SuccessResponse> =>
  apiFetch(`/videos/${videoId}/ignore`, {
    method: "POST",
    body: JSON.stringify({ channelId }),
  });

export const getSubscriptions = (): Promise<SubscriptionsResponse> =>
  apiFetch("/subscriptions");

export const addSubscription = (
  channelId: string,
  channelTitle: string,
  channelThumbnail: string,
): Promise<SubscriptionResponse> =>
  apiFetch("/subscriptions", {
    method: "POST",
    body: JSON.stringify({ channelId, channelTitle, channelThumbnail }),
  });

export const removeSubscription = (
  channelId: string,
): Promise<SuccessResponse> =>
  apiFetch(`/subscriptions/${channelId}`, { method: "DELETE" });

export const searchChannels = (query: string): Promise<SearchResponse> =>
  apiFetch(`/search/channels?q=${encodeURIComponent(query)}`);

export const syncVideos = (): Promise<SyncResponse> =>
  apiFetch("/sync/videos", { method: "POST" });

export const syncChannelVideos = (
  channelId: string,
): Promise<ChannelSyncResponse> =>
  apiFetch(`/sync/channel/${channelId}`, { method: "POST" });

export const getUser = (): Promise<{ user: User; playlistId: string }> =>
  apiFetch("/user");

export const updatePlaylist = (playlistId: string): Promise<SuccessResponse> =>
  apiFetch("/playlist", {
    method: "POST",
    body: JSON.stringify({ playlistId }),
  });
