import type { OAuth2Client } from "google-auth-library";

type ChannelResult = {
  channelId: string;
  title: string;
  thumbnail: string;
};

type VideoResult = {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  publishedAt: string;
};

type PlaylistVideoResult = {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
};

type SearchItem = {
  id: { channelId?: string; videoId?: string };
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: {
      default?: { url: string };
      high?: { url: string };
    };
    channelThumbnails: {
      default: { url: string };
    };
  };
};

type PlaylistItem = {
  contentDetails: { videoId: string };
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: {
      default?: { url: string };
      high?: { url: string };
    };
  };
};

type VideoContentItem = {
  id: string;
  contentDetails: {
    duration: string;
  };
};

type SubscriptionItem = {
  snippet: {
    title: string;
    resourceId: { channelId: string };
    thumbnails: { default: { url: string } };
  };
};

type ApiListResponse<T> = {
  items?: T[];
  nextPageToken?: string;
};

const baseUrl = "https://www.googleapis.com/youtube/v3";

const fetchApi = async <T>(
  path: string,
  params: Record<string, string | boolean>,
  apiKey: string,
): Promise<T> => {
  const url = new URL(`${baseUrl}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.append(key, String(value));
  }
  url.searchParams.append("key", apiKey);
  const response = await fetch(url.toString());
  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `YouTube API error: ${response.status} ${response.statusText} - ${body}`,
    );
  }
  return response.json() as Promise<T>;
};

const fetchOAuth = async <T>(
  path: string,
  params: Record<string, string>,
  oauth2Client: OAuth2Client,
): Promise<T> => {
  const url = new URL(`${baseUrl}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.append(key, value);
  }
  const accessToken = oauth2Client.credentials.access_token;
  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.json() as Promise<T>;
};

export const searchChannels = async (
  apiKey: string,
  query: string,
): Promise<ChannelResult[]> => {
  const response = await fetchApi<ApiListResponse<SearchItem>>(
    "/search",
    {
      part: "snippet",
      q: query,
      type: "channel",
      maxResults: "25",
    },
    apiKey,
  );

  const items = response.items ?? [];
  return items
    .map((item) => ({
      channelId: item.id.channelId ?? "",
      title: item.snippet.title,
      thumbnail:
        item.snippet.channelThumbnails?.default?.url ??
        item.snippet.thumbnails?.default?.url ??
        "",
    }))
    .filter((channel) => channel.channelId !== "");
};

export const getChannelVideos = async (
  apiKey: string,
  channelId: string,
  publishedAfter: string | null = null,
): Promise<VideoResult[]> => {
  const params: Record<string, string> = {
    part: "snippet",
    channelId,
    type: "video",
    maxResults: "50",
    order: "date",
  };
  if (publishedAfter) {
    params.publishedAfter = publishedAfter;
  }

  const response = await fetchApi<ApiListResponse<SearchItem>>(
    "/search",
    params,
    apiKey,
  );

  const items = response.items ?? [];
  const searchVideos = items
    .map((item) => ({
      videoId: item.id.videoId ?? "",
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail:
        item.snippet.thumbnails.high?.url ??
        item.snippet.thumbnails.default?.url ??
        "",
      publishedAt: item.snippet.publishedAt,
    }))
    .filter((video) => video.videoId !== "");

  if (searchVideos.length === 0) {
    return [];
  }

  const videoIds = searchVideos.map((v) => v.videoId).join(",");
  const videosResponse = await fetchApi<ApiListResponse<VideoContentItem>>(
    "/videos",
    {
      part: "contentDetails",
      id: videoIds,
    },
    apiKey,
  );

  const durationMap = new Map<string, string>();
  for (const item of videosResponse.items ?? []) {
    durationMap.set(item.id, item.contentDetails.duration);
  }

  return searchVideos.map((video) => ({
    ...video,
    duration: durationMap.get(video.videoId) ?? "",
  }));
};

export const parseDurationSeconds = (isoDuration: string): number => {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] ?? "0", 10);
  const minutes = parseInt(match[2] ?? "0", 10);
  const seconds = parseInt(match[3] ?? "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
};

export type AddToPlaylistResult = { ok: true } | { ok: false; error: string };

export const addToPlaylist = async (
  oauth2Client: OAuth2Client,
  playlistId: string,
  videoId: string,
): Promise<AddToPlaylistResult> => {
  const url = new URL(`${baseUrl}/playlistItems`);
  url.searchParams.append("part", "snippet");
  const accessToken = oauth2Client.credentials.access_token;
  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      snippet: {
        playlistId,
        resourceId: {
          kind: "youtube#video",
          videoId,
        },
      },
    }),
  });

  if (response.ok) {
    return { ok: true };
  }

  if (response.status === 409) {
    return { ok: true };
  }

  const body = (await response.json()) as Record<string, unknown>;
  const rawMessage =
    typeof body?.["error"] === "object" &&
    body?.["error"] !== null &&
    typeof (body["error"] as Record<string, unknown>)?.["message"] === "string"
      ? (body["error"] as Record<string, string>)["message"]
      : `YouTube API error: ${response.status} ${response.statusText}`;

  return {
    ok: false,
    error: rawMessage ?? `YouTube API error: ${response.status}`,
  };
};

export const getSubscribedChannels = async (
  oauth2Client: OAuth2Client,
): Promise<ChannelResult[]> => {
  const response = await fetchOAuth<ApiListResponse<SubscriptionItem>>(
    "/subscriptions",
    {
      part: "snippet",
      mine: "true",
      maxResults: "50",
    },
    oauth2Client,
  );

  const items = response.items ?? [];
  return items
    .map((item) => ({
      channelId: item.snippet.resourceId.channelId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.default.url,
    }))
    .filter((channel) => channel.channelId !== "");
};

export const getPlaylistVideos = async (
  apiKey: string,
  playlistId: string,
): Promise<PlaylistVideoResult[]> => {
  const response = await fetchApi<ApiListResponse<PlaylistItem>>(
    "/playlistItems",
    {
      part: "snippet",
      playlistId,
      maxResults: "50",
    },
    apiKey,
  );

  const items = response.items ?? [];
  return items
    .map((item) => ({
      videoId: item.contentDetails.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail:
        item.snippet.thumbnails.high?.url ??
        item.snippet.thumbnails.default?.url ??
        "",
    }))
    .filter((video) => video.videoId !== "");
};
