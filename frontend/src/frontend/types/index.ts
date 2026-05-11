export type User = {
	id: number;
	email: string;
	name: string;
	picture: string;
};

export type Channel = {
	channelId: string;
	title: string;
	thumbnail: string;
};

export type Video = {
	id: number;
	channel_id: string;
	video_id: string;
	title: string;
	description: string;
	thumbnail: string;
	duration: string;
	published_at: string;
	status: "pending" | "added" | "ignored";
	added_at: string | null;
};

export type Subscription = {
	id: number;
	user_id: number;
	channel_id: string;
	channel_title: string;
	channel_thumbnail: string;
	subscribed_at: string;
};

export type ApiVideo = {
	videoId: string;
	title: string;
	description: string;
	thumbnail: string;
	duration: string;
	publishedAt: string;
};

export type ApiChannel = {
	channelId: string;
	title: string;
	thumbnail: string;
};

export type AppState = {
	isAuthenticated: boolean;
	user: User | null;
	videos: Video[];
	subscriptions: Subscription[];
	searchResults: ApiChannel[];
	isLoading: boolean;
	error: string | null;
	darkMode: boolean;
};
