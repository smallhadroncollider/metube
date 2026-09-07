import { describe, expect, it, spyOn, type Mock } from "bun:test";
import {
  getChannelVideos,
  getVideoDetails,
  normalizeTimestamp,
  parseDurationSeconds,
  searchChannels,
} from "../src/youtube/youtube.js";

type FetchMock = Mock<typeof fetch>;

const jsonResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

const notFound = (): Response => new Response("Not Found", { status: 404 });

const mockFetch = (responder: (url: string) => Response): FetchMock => {
  const fetchMock = spyOn(globalThis, "fetch");

  fetchMock.mockImplementation(((url: string) =>
    Promise.resolve(responder(url))) as typeof fetch);

  return fetchMock;
};

const mockEndpoint = (path: string, body: unknown): FetchMock =>
  mockFetch((url) => (url.includes(path) ? jsonResponse(body) : notFound()));

const makePlaylistItem = (
  videoId: string,
  title: string,
  publishedAt: string,
): Record<string, unknown> => ({
  snippet: {
    title,
    description: "Description",
    publishedAt,
    thumbnails: {
      high: { url: `https://thumb.com/${videoId}.jpg` },
    },
  },
  contentDetails: {
    videoId,
  },
});

const makeThumbnail = (url: string): { url: string } => ({ url });

describe("YouTube API", () => {
  describe("channelIdToUploadsPlaylistId", () => {
    it("should convert UC prefix to UU prefix", async () => {
      const fetchMock = mockFetch(() => jsonResponse({ items: [] }));

      try {
        await getChannelVideos("fake-key", "UCabcdefghijklmnop");

        expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
          "playlistId=UUabcdefghijklmnop",
        );
      } finally {
        fetchMock.mockRestore();
      }
    });
  });

  describe("getChannelVideos", () => {
    it("should return videos from playlist items", async () => {
      const fetchMock = mockEndpoint("/playlistItems", {
        items: [
          makePlaylistItem("vid1", "Video 1", "2024-01-02T00:00:00Z"),
          makePlaylistItem("vid2", "Video 2", "2024-01-01T00:00:00Z"),
        ],
      });

      try {
        const videos = await getChannelVideos("fake-key", "UCchannel123");

        expect(videos).toHaveLength(2);
        expect(videos[0]?.videoId).toBe("vid1");
        expect(videos[0]?.title).toBe("Video 1");
        expect(videos[1]?.videoId).toBe("vid2");
        expect(videos[1]?.title).toBe("Video 2");
      } finally {
        fetchMock.mockRestore();
      }
    });

    it("should filter by publishedAfter and stop early", async () => {
      const fetchMock = mockEndpoint("/playlistItems", {
        items: [
          makePlaylistItem("vid1", "Video 1", "2024-01-03T00:00:00Z"),
          makePlaylistItem("vid2", "Video 2", "2024-01-02T00:00:00Z"),
          makePlaylistItem("vid3", "Old Video", "2024-01-01T00:00:00Z"),
        ],
      });

      try {
        const videos = await getChannelVideos(
          "fake-key",
          "UCchannel123",
          "2024-01-01T00:00:00Z",
        );

        expect(videos).toHaveLength(2);
        expect(videos[0]?.videoId).toBe("vid1");
        expect(videos[1]?.videoId).toBe("vid2");

        // vid3 should not be included (publishedAt is not after the cutoff)
        expect(videos.some((video) => video.videoId === "vid3")).toBe(false);

        // Should have made 1 fetch call (playlistItems only)
        expect(fetchMock.mock.calls).toHaveLength(1);
      } finally {
        fetchMock.mockRestore();
      }
    });

    it("should return empty array when no videos match publishedAfter", async () => {
      const fetchMock = mockEndpoint("/playlistItems", {
        items: [makePlaylistItem("vid1", "Old Video", "2024-01-01T00:00:00Z")],
      });

      try {
        const videos = await getChannelVideos(
          "fake-key",
          "UCchannel123",
          "2024-01-02T00:00:00Z",
        );

        expect(videos).toHaveLength(0);

        // Should not call /videos endpoint since no videos matched
        const videoCalls = fetchMock.mock.calls.filter((call) =>
          String(call[0]).includes("/videos"),
        );
        expect(videoCalls).toHaveLength(0);
      } finally {
        fetchMock.mockRestore();
      }
    });

    it("should return empty array when playlist has no items", async () => {
      const fetchMock = mockEndpoint("/playlistItems", { items: [] });

      try {
        const videos = await getChannelVideos("fake-key", "UCchannel123");
        expect(videos).toHaveLength(0);
      } finally {
        fetchMock.mockRestore();
      }
    });

    it("should accept all YouTube thumbnail sizes", async () => {
      const fetchMock = mockEndpoint("/playlistItems", {
        items: [
          {
            snippet: {
              title: "All Thumbnails",
              description: "Has all thumbnail sizes",
              publishedAt: "2024-01-01T00:00:00Z",
              thumbnails: {
                default: makeThumbnail("https://thumb.com/default.jpg"),
                medium: makeThumbnail("https://thumb.com/medium.jpg"),
                high: makeThumbnail("https://thumb.com/high.jpg"),
                standard: makeThumbnail("https://thumb.com/standard.jpg"),
                maxres: makeThumbnail("https://thumb.com/maxres.jpg"),
              },
            },
            contentDetails: { videoId: "vid1" },
          },
        ],
      });

      try {
        const videos = await getChannelVideos("fake-key", "UCchannel123");

        expect(videos).toHaveLength(1);
        expect(videos[0]?.videoId).toBe("vid1");
        expect(videos[0]?.title).toBe("All Thumbnails");
      } finally {
        fetchMock.mockRestore();
      }
    });

    it("should accept unrecognised thumbnail sizes", async () => {
      const fetchMock = mockEndpoint("/playlistItems", {
        items: [
          {
            snippet: {
              title: "4K Video",
              description: "Has a 4K thumbnail",
              publishedAt: "2024-01-01T00:00:00Z",
              thumbnails: {
                high: makeThumbnail("https://thumb.com/high.jpg"),
                uhd: makeThumbnail("https://thumb.com/uhd.jpg"),
              },
            },
            contentDetails: { videoId: "vid1" },
          },
        ],
      });

      try {
        const videos = await getChannelVideos("fake-key", "UCchannel123");

        expect(videos).toHaveLength(1);
        expect(videos[0]?.thumbnail).toBe("https://thumb.com/high.jpg");
      } finally {
        fetchMock.mockRestore();
      }
    });

    it("should skip items with missing videoId", async () => {
      const fetchMock = mockEndpoint("/playlistItems", {
        items: [
          {
            snippet: {
              title: "No Video ID",
              description: "",
              publishedAt: "2024-01-01T00:00:00Z",
              thumbnails: {},
            },
            contentDetails: { videoId: "" },
          },
          makePlaylistItem("vid1", "Video 1", "2024-01-01T00:00:00Z"),
        ],
      });

      try {
        const videos = await getChannelVideos("fake-key", "UCchannel123");

        expect(videos).toHaveLength(1);
        expect(videos[0]?.videoId).toBe("vid1");
      } finally {
        fetchMock.mockRestore();
      }
    });
  });

  describe("searchChannels", () => {
    it("should return channels with a default channel thumbnail", async () => {
      const fetchMock = mockEndpoint("/search", {
        items: [
          {
            id: { channelId: "UCchannel123" },
            snippet: {
              title: "Channel",
              description: "Description",
              publishedAt: "2024-01-01T00:00:00Z",
              thumbnails: {
                uhd: makeThumbnail("https://thumb.com/uhd.jpg"),
              },
              channelThumbnails: {
                default: makeThumbnail("https://thumb.com/avatar.jpg"),
                uhd: makeThumbnail("https://thumb.com/uhd.jpg"),
              },
            },
          },
        ],
      });

      try {
        const channels = await searchChannels("fake-key", "query");

        expect(channels).toHaveLength(1);
        expect(channels[0]?.channelId).toBe("UCchannel123");
        expect(channels[0]?.thumbnail).toBe("https://thumb.com/avatar.jpg");
      } finally {
        fetchMock.mockRestore();
      }
    });
  });

  describe("parseDurationSeconds", () => {
    it("should parse hours, minutes, and seconds", () => {
      expect(parseDurationSeconds("PT1H30M45S")).toBe(5445);
    });

    it("should parse minutes and seconds only", () => {
      expect(parseDurationSeconds("PT10M30S")).toBe(630);
    });

    it("should parse seconds only", () => {
      expect(parseDurationSeconds("PT45S")).toBe(45);
    });

    it("should parse hours only", () => {
      expect(parseDurationSeconds("PT2H")).toBe(7200);
    });

    it("should return 0 for invalid format", () => {
      expect(parseDurationSeconds("invalid")).toBe(0);
    });

    it("should return 0 for empty string", () => {
      expect(parseDurationSeconds("")).toBe(0);
    });
  });

  describe("normalizeTimestamp", () => {
    it("should return timestamps ending with Z unchanged", () => {
      expect(normalizeTimestamp("2024-01-01T00:00:00Z")).toBe(
        "2024-01-01T00:00:00Z",
      );
    });

    it("should normalize timestamps with timezone offset", () => {
      const result = normalizeTimestamp("2024-01-01T00:00:00+00:00");
      expect(result).toMatch(/Z$/);
    });

    it("should return empty string for invalid timestamps", () => {
      expect(normalizeTimestamp("not-a-date")).toBe("");
    });
  });

  describe("getVideoDetails", () => {
    it("should return empty array when no video IDs provided", async () => {
      const results = await getVideoDetails("fake-key", []);
      expect(results).toHaveLength(0);
    });

    it("should fetch durations from video details endpoint", async () => {
      const fetchMock = mockEndpoint("/videos", {
        items: [
          {
            id: "vid1",
            contentDetails: { duration: "PT10M30S" },
          },
          {
            id: "vid2",
            contentDetails: { duration: "PT1H5M" },
          },
        ],
      });

      try {
        const results = await getVideoDetails("fake-key", ["vid1", "vid2"]);

        expect(results).toHaveLength(2);
        expect(results[0]?.videoId).toBe("vid1");
        expect(results[0]?.duration).toBe("PT10M30S");
        expect(results[1]?.videoId).toBe("vid2");
        expect(results[1]?.duration).toBe("PT1H5M");
      } finally {
        fetchMock.mockRestore();
      }
    });

    it("should handle missing duration for a video", async () => {
      const fetchMock = mockEndpoint("/videos", {
        items: [
          {
            id: "vid1",
            contentDetails: { duration: "PT10M30S" },
          },
        ],
      });

      try {
        const results = await getVideoDetails("fake-key", ["vid1", "vid2"]);

        expect(results).toHaveLength(1);
        expect(results[0]?.videoId).toBe("vid1");
        expect(results[0]?.duration).toBe("PT10M30S");
      } finally {
        fetchMock.mockRestore();
      }
    });
  });
});
