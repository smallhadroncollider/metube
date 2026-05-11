import type { User, Video, Subscription, ApiChannel } from "../types/index.js";

export type AuthStatus = {
  authenticated: boolean;
  userId?: number;
};

export type DeviceAuthResponse = {
  user_code: string;
  verification_url: string;
  device_code: string;
  interval: number;
  expires_in: number;
};

export type DevicePollResponse =
  | { status: "complete"; userId: number }
  | { status: "pending" }
  | { status: "slow_down" }
  | { status: "error"; error: string };

export type VideosResponse = {
  videos: Video[];
};

export type SubscriptionsResponse = {
  subscriptions: Subscription[];
};

export type SearchResponse = {
  channels: ApiChannel[];
};

export type SyncResponse = {
  synced: number;
  ignored: number;
};

export type SuccessResponse = {
  success: true;
};

export type SubscriptionResponse = {
  subscription: Subscription;
};
