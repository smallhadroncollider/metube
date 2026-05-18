import { describe, it, expect } from "bun:test";
import { configureStore } from "@reduxjs/toolkit";
import videosReducer from "../src/slices/videosSlice.js";
import {
  sagaFetchVideosStarted,
  sagaFetchVideosSucceeded,
  sagaFetchVideosFailed,
  sagaAddVideoSucceeded,
  sagaAddVideoFailed,
  sagaIgnoreVideoSucceeded,
  sagaSyncChannelVideosRequested,
  sagaSyncChannelVideosSucceeded,
  sagaSyncScheduleUpdated,
  sagaPeriodicFetchVideosRequested,
} from "../src/slices/videosSlice.js";
import type { Video } from "../src/types/index.js";

const mockVideos: Video[] = [
  {
    id: 1,
    channel_id: "UC1",
    video_id: "vid1",
    title: "Video 1",
    description: "Desc 1",
    thumbnail: "https://thumb.com/1.jpg",
    duration: "PT10M30S",
    published_at: "2024-01-01T00:00:00Z",
    status: "pending",
    added_at: null,
  },
  {
    id: 2,
    channel_id: "UC1",
    video_id: "vid2",
    title: "Video 2",
    description: "Desc 2",
    thumbnail: "https://thumb.com/2.jpg",
    duration: "PT5M15S",
    published_at: "2024-01-02T00:00:00Z",
    status: "pending",
    added_at: null,
  },
];

describe("Videos Slice", () => {
  it("should have correct initial state", () => {
    const store = configureStore({ reducer: { videos: videosReducer } });
    const state = store.getState() as {
      videos: {
        videos: Video[];
        isLoading: boolean;
        isSyncing: boolean;
        nextSyncAt: string | null;
        error: string | null;
      };
    };
    expect(state.videos.videos).toEqual([]);
    expect(state.videos.isLoading).toBe(false);
    expect(state.videos.isSyncing).toBe(false);
    expect(state.videos.nextSyncAt).toBeNull();
    expect(state.videos.error).toBeNull();
  });

  it("should set loading on fetch started", () => {
    const store = configureStore({ reducer: { videos: videosReducer } });
    store.dispatch(sagaFetchVideosStarted());
    const state = store.getState() as { videos: { isLoading: boolean } };
    expect(state.videos.isLoading).toBe(true);
  });

  it("should set videos on fetch succeeded", () => {
    const store = configureStore({ reducer: { videos: videosReducer } });
    store.dispatch(sagaFetchVideosSucceeded(mockVideos));
    const state = store.getState() as {
      videos: { videos: Video[]; isLoading: boolean };
    };
    expect(state.videos.videos).toHaveLength(2);
    expect(state.videos.isLoading).toBe(false);
  });

  it("should set error on fetch failed", () => {
    const store = configureStore({ reducer: { videos: videosReducer } });
    store.dispatch(sagaFetchVideosStarted());
    store.dispatch(sagaFetchVideosFailed("Network error"));
    const state = store.getState() as {
      videos: { error: string | null; isLoading: boolean };
    };
    expect(state.videos.error).toBe("Network error");
    expect(state.videos.isLoading).toBe(false);
  });

  it("should remove video on add succeeded", () => {
    const store = configureStore({ reducer: { videos: videosReducer } });
    store.dispatch(sagaFetchVideosSucceeded(mockVideos));
    store.dispatch(sagaAddVideoSucceeded({ videoId: "vid1" }));
    const state = store.getState() as { videos: { videos: Video[] } };
    expect(state.videos.videos).toHaveLength(1);
    expect(state.videos.videos[0]?.video_id).toBe("vid2");
  });

  it("should remove video on ignore succeeded", () => {
    const store = configureStore({ reducer: { videos: videosReducer } });
    store.dispatch(sagaFetchVideosSucceeded(mockVideos));
    store.dispatch(sagaIgnoreVideoSucceeded({ videoId: "vid2" }));
    const state = store.getState() as { videos: { videos: Video[] } };
    expect(state.videos.videos).toHaveLength(1);
    expect(state.videos.videos[0]?.video_id).toBe("vid1");
  });

  it("should keep video on add failed", () => {
    const store = configureStore({ reducer: { videos: videosReducer } });
    store.dispatch(sagaFetchVideosSucceeded(mockVideos));
    store.dispatch(
      sagaAddVideoFailed({ videoId: "vid1", error: "Failed to add" }),
    );
    const state = store.getState() as { videos: { videos: Video[] } };
    expect(state.videos.videos).toHaveLength(2);
  });

  it("should set error on add failed", () => {
    const store = configureStore({ reducer: { videos: videosReducer } });
    store.dispatch(sagaFetchVideosSucceeded(mockVideos));
    store.dispatch(
      sagaAddVideoFailed({ videoId: "vid1", error: "Failed to add" }),
    );
    const state = store.getState() as {
      videos: { error: string | null };
    };
    expect(state.videos.error).toBe("Failed to add");
  });

  it("should set syncing on channel sync requested", () => {
    const store = configureStore({ reducer: { videos: videosReducer } });
    store.dispatch(sagaSyncChannelVideosRequested("UC1"));
    const state = store.getState() as { videos: { isSyncing: boolean } };
    expect(state.videos.isSyncing).toBe(true);
  });

  it("should clear syncing on channel sync succeeded", () => {
    const store = configureStore({ reducer: { videos: videosReducer } });
    store.dispatch(sagaSyncChannelVideosRequested("UC1"));
    store.dispatch(sagaSyncChannelVideosSucceeded());
    const state = store.getState() as { videos: { isSyncing: boolean } };
    expect(state.videos.isSyncing).toBe(false);
  });

  it("should update next sync at on sync schedule update", () => {
    const store = configureStore({ reducer: { videos: videosReducer } });
    store.dispatch(sagaSyncScheduleUpdated("2024-01-01T00:10:00Z"));
    const state = store.getState() as { videos: { nextSyncAt: string | null } };
    expect(state.videos.nextSyncAt).toBe("2024-01-01T00:10:00Z");
  });

  it("should clear next sync at on null", () => {
    const store = configureStore({ reducer: { videos: videosReducer } });
    store.dispatch(sagaSyncScheduleUpdated("2024-01-01T00:10:00Z"));
    store.dispatch(sagaSyncScheduleUpdated(null));
    const state = store.getState() as { videos: { nextSyncAt: string | null } };
    expect(state.videos.nextSyncAt).toBeNull();
  });

  it("should handle periodic fetch action type", () => {
    expect(sagaPeriodicFetchVideosRequested.type).toBe(
      "saga/videos/periodicFetchRequested",
    );
  });

  it("should update videos on periodic fetch succeeded", () => {
    const store = configureStore({ reducer: { videos: videosReducer } });
    store.dispatch(sagaFetchVideosStarted());
    store.dispatch(sagaFetchVideosSucceeded(mockVideos));
    const state = store.getState() as {
      videos: { videos: Video[]; isLoading: boolean };
    };
    expect(state.videos.videos).toHaveLength(2);
    expect(state.videos.isLoading).toBe(false);
  });

  it("should set error on periodic fetch failed", () => {
    const store = configureStore({ reducer: { videos: videosReducer } });
    store.dispatch(sagaFetchVideosStarted());
    store.dispatch(sagaFetchVideosFailed("Periodic fetch failed"));
    const state = store.getState() as {
      videos: { error: string | null; isLoading: boolean };
    };
    expect(state.videos.error).toBe("Periodic fetch failed");
    expect(state.videos.isLoading).toBe(false);
  });
});
