import { createSlice, createAction } from "@reduxjs/toolkit";
import type { Video } from "../types/index.js";

type VideosState = {
	videos: Video[];
	isLoading: boolean;
	error: string | null;
};

const initialState: VideosState = {
	videos: [],
	isLoading: false,
	error: null,
};

export const sagaFetchVideosStarted = createAction("saga/videos/fetchStarted");
export const sagaFetchVideosSucceeded = createAction<Video[]>(
	"saga/videos/fetchSucceeded",
);
export const sagaFetchVideosFailed = createAction<string>(
	"saga/videos/fetchFailed",
);
export const sagaAddVideoRequested = createAction<{
	videoId: string;
	channelId: string;
}>("saga/videos/addRequested");
export const sagaAddVideoSucceeded = createAction<{ videoId: string }>(
	"saga/videos/addSucceeded",
);
export const sagaAddVideoFailed = createAction<{ videoId: string; error: string }>(
	"saga/videos/addFailed",
);
export const sagaIgnoreVideoRequested = createAction<{
	videoId: string;
	channelId: string;
}>("saga/videos/ignoreRequested");
export const sagaIgnoreVideoSucceeded = createAction<{
	videoId: string;
}>("saga/videos/ignoreSucceeded");
export const sagaSyncVideosRequested = createAction(
	"saga/videos/syncRequested",
);
export const sagaSyncVideosSucceeded = createAction(
	"saga/videos/syncSucceeded",
);

const videosSlice = createSlice({
	name: "videos",
	initialState,
	reducers: {},
	extraReducers: (builder) => {
		builder
			.addCase(sagaFetchVideosStarted, (state) => {
				state.isLoading = true;
				state.error = null;
			})
			.addCase(sagaFetchVideosSucceeded, (state, action) => {
				state.videos = action.payload;
				state.isLoading = false;
				state.error = null;
			})
			.addCase(sagaFetchVideosFailed, (state, action) => {
				state.isLoading = false;
				state.error = action.payload;
			})
			.addCase(sagaAddVideoSucceeded, (state, action) => {
				state.videos = state.videos.filter(
					(v) => v.video_id !== action.payload.videoId,
				);
			})
			.addCase(sagaIgnoreVideoSucceeded, (state, action) => {
				state.videos = state.videos.filter(
					(v) => v.video_id !== action.payload.videoId,
				);
			})
			.addCase(sagaAddVideoFailed, (state, action) => {
				state.error = action.payload.error;
			});
	},
});

export default videosSlice.reducer;
