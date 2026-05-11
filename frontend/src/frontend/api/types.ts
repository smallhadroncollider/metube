import type { User, Video, Subscription, ApiChannel } from "../types/index.js";

export type AuthStatus = {
	authenticated: boolean;
	userId?: number;
};

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
