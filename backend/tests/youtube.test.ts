import { describe, it, expect, beforeEach, spyOn } from "bun:test";
import {
  getChannelVideos,
  getVideoDetails,
  parseDurationSeconds,
  normalizeTimestamp,
} from "../src/youtube/youtube.js";

type FetchMockFn = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

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

describe("YouTube API", () => {
  describe("channelIdToUploadsPlaylistId", () => {
    it("should convert UC prefix to UU prefix", async () => {
      const fetchMock = spyOn(globalThis, "fetch").mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ items: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        ),
      ) as FetchMockFn;

      try {
        await getChannelVideos("fake-key", "UCabcdefghijklmnop");
        const call = fetchMock.mock.calls[0];
        const url = call[0] as string;
        expect(url).toContain("playlistId=UUabcdefghijklmnop");
      } finally {
        fetchMock.mockRestore();
      }
    });
  });

  describe("getChannelVideos", () => {
    beforeEach(() => {
      // Reset fetch mock before each test
    });

    it("should return videos from playlist items", async () => {
      const fetchMock = spyOn(globalThis, "fetch").mockImplementation(((
        input: unknown,
      ) => {
        const url = typeof input === "string" ? input : (input as Request).url;

        if (url.includes("/playlistItems")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                items: [
                  makePlaylistItem("vid1", "Video 1", "2024-01-02T00:00:00Z"),
                  makePlaylistItem("vid2", "Video 2", "2024-01-01T00:00:00Z"),
                ],
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              },
            ),
          );
        }

        return Promise.resolve(new Response("Not Found", { status: 404 }));
      }) as FetchMockFn);

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
      const fetchMock = spyOn(globalThis, "fetch").mockImplementation(((
        input: unknown,
      ) => {
        const url = typeof input === "string" ? input : (input as Request).url;

        if (url.includes("/playlistItems")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                items: [
                  makePlaylistItem("vid1", "Video 1", "2024-01-03T00:00:00Z"),
                  makePlaylistItem("vid2", "Video 2", "2024-01-02T00:00:00Z"),
                  makePlaylistItem("vid3", "Old Video", "2024-01-01T00:00:00Z"),
                ],
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              },
            ),
          );
        }

        return Promise.resolve(new Response("Not Found", { status: 404 }));
      }) as FetchMockFn);

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
        const hasOldVideo = videos.some((v) => v.videoId === "vid3");
        expect(hasOldVideo).toBe(false);

        // Should have made 1 fetch call (playlistItems only)
        expect(fetchMock.mock.calls.length).toBe(1);
      } finally {
        fetchMock.mockRestore();
      }
    });

    it("should return empty array when no videos match publishedAfter", async () => {
      const fetchMock = spyOn(globalThis, "fetch").mockImplementation(((
        input: unknown,
      ) => {
        const url = typeof input === "string" ? input : (input as Request).url;

        if (url.includes("/playlistItems")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                items: [
                  makePlaylistItem("vid1", "Old Video", "2024-01-01T00:00:00Z"),
                ],
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              },
            ),
          );
        }

        return Promise.resolve(new Response("Not Found", { status: 404 }));
      }) as FetchMockFn);

      try {
        const videos = await getChannelVideos(
          "fake-key",
          "UCchannel123",
          "2024-01-02T00:00:00Z",
        );

        expect(videos).toHaveLength(0);

        // Should not call /videos endpoint since no videos matched
        const videoCalls = fetchMock.mock.calls.filter((call) => {
          const url = call[0] as string;
          return url.includes("/videos");
        });
        expect(videoCalls.length).toBe(0);
      } finally {
        fetchMock.mockRestore();
      }
    });

    it("should return empty array when playlist has no items", async () => {
      const fetchMock = spyOn(globalThis, "fetch").mockImplementation(((
        input: unknown,
      ) => {
        const url = typeof input === "string" ? input : (input as Request).url;

        if (url.includes("/playlistItems")) {
          return Promise.resolve(
            new Response(JSON.stringify({ items: [] }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }),
          );
        }

        return Promise.resolve(new Response("Not Found", { status: 404 }));
      }) as FetchMockFn);

      try {
        const videos = await getChannelVideos("fake-key", "UCchannel123");
        expect(videos).toHaveLength(0);
      } finally {
        fetchMock.mockRestore();
      }
    });

    it("should accept all YouTube thumbnail sizes", async () => {
      const fetchMock = spyOn(globalThis, "fetch").mockImplementation(((
        input: unknown,
      ) => {
        const url = typeof input === "string" ? input : (input as Request).url;

        if (url.includes("/playlistItems")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                items: [
                  {
                    snippet: {
                      title: "All Thumbnails",
                      description: "Has all thumbnail sizes",
                      publishedAt: "2024-01-01T00:00:00Z",
                      thumbnails: {
                        default: { url: "https://thumb.com/default.jpg" },
                        medium: { url: "https://thumb.com/medium.jpg" },
                        high: { url: "https://thumb.com/high.jpg" },
                        standard: { url: "https://thumb.com/standard.jpg" },
                        maxres: { url: "https://thumb.com/maxres.jpg" },
                      },
                    },
                    contentDetails: { videoId: "vid1" },
                  },
                ],
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              },
            ),
          );
        }

        return Promise.resolve(new Response("Not Found", { status: 404 }));
      }) as FetchMockFn);

      try {
        const videos = await getChannelVideos("fake-key", "UCchannel123");
        expect(videos).toHaveLength(1);
        expect(videos[0]?.videoId).toBe("vid1");
        expect(videos[0]?.title).toBe("All Thumbnails");
      } finally {
        fetchMock.mockRestore();
      }
    });

    it("should skip items with missing videoId", async () => {
      const fetchMock = spyOn(globalThis, "fetch").mockImplementation(((
        input: unknown,
      ) => {
        const url = typeof input === "string" ? input : (input as Request).url;

        if (url.includes("/playlistItems")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
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
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              },
            ),
          );
        }

        return Promise.resolve(new Response("Not Found", { status: 404 }));
      }) as FetchMockFn);

      try {
        const videos = await getChannelVideos("fake-key", "UCchannel123");
        expect(videos).toHaveLength(1);
        expect(videos[0]?.videoId).toBe("vid1");
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
      const fetchMock = spyOn(globalThis, "fetch").mockImplementation(((
        input: unknown,
      ) => {
        const url = typeof input === "string" ? input : (input as Request).url;

        if (url.includes("/videos")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
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
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              },
            ),
          );
        }

        return Promise.resolve(new Response("Not Found", { status: 404 }));
      }) as FetchMockFn);

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
      const fetchMock = spyOn(globalThis, "fetch").mockImplementation(((
        input: unknown,
      ) => {
        const url = typeof input === "string" ? input : (input as Request).url;

        if (url.includes("/videos")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                items: [
                  {
                    id: "vid1",
                    contentDetails: { duration: "PT10M30S" },
                  },
                ],
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              },
            ),
          );
        }

        return Promise.resolve(new Response("Not Found", { status: 404 }));
      }) as FetchMockFn);

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
