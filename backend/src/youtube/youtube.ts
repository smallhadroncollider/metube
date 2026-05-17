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

type VideoDetailsResult = {
  videoId: string;
  duration: string;
};

type VideoItem = {
  id: string;
  contentDetails: {
    duration: string;
  };
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
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: {
      default?: { url: string };
      high?: { url: string };
    };
  };
  contentDetails: {
    videoId: string;
  };
};

type ApiListResponse<T> = {
  items?: T[];
  nextPageToken?: string;
};

const baseUrl = "https://www.googleapis.com/youtube/v3";

const fetchApi = async <T>(
  path: string,
  params: Record<string, string>,
  apiKey: string,
): Promise<T> => {
  const url = new URL(`${baseUrl}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.append(key, value);
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

export const normalizeTimestamp = (timestamp: string): string => {
  if (timestamp.endsWith("Z")) {
    return timestamp;
  }

  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString();
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
    .filter((channel) => channel.channelId !== "" && channel.title !== "");
};

const channelIdToUploadsPlaylistId = (channelId: string): string => {
  if (channelId.startsWith("UC")) {
    return "UU" + channelId.slice(2);
  }
  return channelId;
};

const processPlaylistItem = (
  item: PlaylistItem,
  publishedAfter: string | null,
): VideoResult | null => {
  const publishedAt = normalizeTimestamp(item.snippet.publishedAt);

  if (publishedAfter && publishedAt <= publishedAfter) {
    return null;
  }

  const videoId = item.contentDetails.videoId;
  if (!videoId || !item.snippet.title || !publishedAt) {
    return null;
  }

  return {
    videoId,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnail:
      item.snippet.thumbnails.high?.url ??
      item.snippet.thumbnails.default?.url ??
      "",
    duration: "",
    publishedAt,
  };
};

export const getChannelVideos = async (
  apiKey: string,
  channelId: string,
  publishedAfter: string | null = null,
): Promise<VideoResult[]> => {
  const playlistId = channelIdToUploadsPlaylistId(channelId);
  const results: VideoResult[] = [];
  let nextPageToken: string | undefined;
  let stopped = false;

  do {
    const params: Record<string, string> = {
      part: "snippet,contentDetails",
      playlistId,
      maxResults: "50",
    };
    if (nextPageToken) {
      params.pageToken = nextPageToken;
    }

    const response = await fetchApi<ApiListResponse<PlaylistItem>>(
      "/playlistItems",
      params,
      apiKey,
    );

    const items = response.items ?? [];

    for (const item of items) {
      const processed = processPlaylistItem(item, publishedAfter);

      if (!processed) {
        const publishedAt = normalizeTimestamp(item.snippet.publishedAt);
        if (publishedAfter && publishedAt <= publishedAfter) {
          stopped = true;
        }
        continue;
      }

      results.push(processed);
    }

    nextPageToken = response.nextPageToken;
  } while (nextPageToken && !stopped);

  return results;
};

const ensureAccessToken = async (oauth2Client: OAuth2Client): Promise<void> => {
  const expiryDate = oauth2Client.credentials.expiry_date ?? 0;
  if (expiryDate <= Date.now() + 60_000) {
    await oauth2Client.refreshAccessToken();
  }
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
  await ensureAccessToken(oauth2Client);
  const url = new URL(`${baseUrl}/playlistItems`);
  url.searchParams.append("part", "snippet");
  const accessToken = oauth2Client.credentials.access_token;
  if (!accessToken) {
    return { ok: false, error: "No valid access token available" };
  }
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

  if (response.ok || response.status === 409) {
    return { ok: true };
  }

  const body = (await response.json()) as Record<string, unknown>;
  return { ok: false, error: parseErrorFromResponse(response, body) };
};

const parseErrorFromResponse = (
  response: Response,
  body: Record<string, unknown>,
): string => {
  const errorObj = body["error"];

  if (
    typeof errorObj === "object" &&
    errorObj !== null &&
    typeof (errorObj as Record<string, unknown>)["message"] === "string"
  ) {
    return (
      errorObj as Record<string, string>
    )["message"] ?? `YouTube API error: ${response.status}`;
  }

  return `YouTube API error: ${response.status} ${response.statusText}`;
};

export const getVideoDetails = async (
  apiKey: string,
  videoIds: string[],
): Promise<VideoDetailsResult[]> => {
  if (videoIds.length === 0) {
    return [];
  }

  const results: VideoDetailsResult[] = [];
  const batchSize = 50;

  for (let i = 0; i < videoIds.length; i += batchSize) {
    const batch = videoIds.slice(i, i + batchSize);
    const response = await fetchApi<ApiListResponse<VideoItem>>(
      "/videos",
      {
        part: "contentDetails",
        id: batch.join(","),
        maxResults: String(batch.length),
      },
      apiKey,
    );

    const items = response.items ?? [];
    results.push(...processVideoBatch(items));
  }

  return results;
};

const processVideoBatch = (items: VideoItem[]): VideoDetailsResult[] => {
  return items.map((item) => ({
    videoId: item.id,
    duration: item.contentDetails.duration,
  }));
};
