import { takeEvery, put, call, all } from "redux-saga/effects";
import type { CallEffect, PutEffect } from "redux-saga/effects";
import {
	sagaCheckAuthStarted,
	sagaCheckAuthSucceeded,
	sagaCheckAuthFailed,
	sagaAuthError,
	sagaLogoutRequested,
	sagaLogoutSucceeded,
} from "../slices/authSlice.js";
import {
	sagaFetchVideosStarted,
	sagaFetchVideosSucceeded,
	sagaFetchVideosFailed,
	sagaAddVideoRequested,
	sagaAddVideoSucceeded,
	sagaAddVideoFailed,
	sagaIgnoreVideoRequested,
	sagaIgnoreVideoSucceeded,
	sagaSyncVideosRequested,
} from "../slices/videosSlice.js";
import { addToast } from "../slices/toastsSlice.js";
import {
	sagaFetchSubscriptionsStarted,
	sagaFetchSubscriptionsSucceeded,
	sagaSearchChannelsRequested,
	sagaSearchChannelsSucceeded,
	sagaSubscribeRequested,
	sagaSubscribeSucceeded,
	sagaUnsubscribeRequested,
	sagaUnsubscribeSucceeded,
} from "../slices/subscriptionsSlice.js";
import * as api from "../api/index.js";
import type {
	AuthStatus,
	VideosResponse,
	SubscriptionsResponse,
	SearchResponse,
	SuccessResponse,
	SyncResponse,
} from "../api/types.js";
import type { User } from "../types/index.js";

function* checkAuth(): Generator<CallEffect | PutEffect, void, never> {
	try {
		const status = (yield call(api.checkAuthStatus)) as AuthStatus;
		if (status.authenticated) {
			const userResponse = (yield call(api.getUser)) as {
				user: User;
				playlistId: string;
			};
			yield put(sagaCheckAuthSucceeded(userResponse.user));
			yield put(sagaFetchVideosStarted());
			yield put(sagaFetchSubscriptionsStarted());
		} else {
			yield put(sagaCheckAuthFailed());
		}
	} catch {
		yield put(sagaCheckAuthFailed());
	}
}

function* logout(_action: {
	payload: void;
}): Generator<CallEffect | PutEffect, void, SuccessResponse> {
	try {
		yield call(api.logout);
		yield put(sagaLogoutSucceeded());
	} catch (error) {
		yield put(sagaAuthError((error as Error).message));
	}
}

function* fetchVideos(): Generator<
	CallEffect | PutEffect,
	void,
	VideosResponse
> {
	try {
		const response: VideosResponse = yield call(api.getVideos);
		yield put(sagaFetchVideosSucceeded(response.videos));
	} catch (error) {
		yield put(sagaFetchVideosFailed((error as Error).message));
	}
}

function* addVideo(action: {
	payload: { videoId: string; channelId: string };
}): Generator<CallEffect | PutEffect, void, SuccessResponse> {
	try {
		yield call(api.addVideo, action.payload.videoId, action.payload.channelId);
		yield put(sagaAddVideoSucceeded({ videoId: action.payload.videoId }));
	} catch (error) {
		const errorMessage = (error as Error).message;
		yield put(sagaAddVideoFailed({ videoId: action.payload.videoId, error: errorMessage }));
		yield put(addToast({ message: errorMessage, type: "error" }));
	}
}

function* ignoreVideo(action: {
	payload: { videoId: string; channelId: string };
}): Generator<CallEffect | PutEffect, void, SuccessResponse> {
	try {
		yield call(
			api.ignoreVideo,
			action.payload.videoId,
			action.payload.channelId,
		);
		yield put(sagaIgnoreVideoSucceeded({ videoId: action.payload.videoId }));
	} catch (error) {
		yield put(sagaFetchVideosFailed((error as Error).message));
	}
}

function* syncVideos(): Generator<CallEffect | PutEffect, void, SyncResponse> {
	try {
		yield call(api.syncVideos);
		yield put(sagaFetchVideosStarted());
	} catch (error) {
		yield put(sagaFetchVideosFailed((error as Error).message));
	}
}

function* fetchSubscriptions(): Generator<
	CallEffect | PutEffect,
	void,
	SubscriptionsResponse
> {
	try {
		const response: SubscriptionsResponse = yield call(api.getSubscriptions);
		yield put(sagaFetchSubscriptionsSucceeded(response.subscriptions));
	} catch (error) {
		yield put(sagaFetchVideosFailed((error as Error).message));
	}
}

function* searchChannels(action: {
	payload: string;
}): Generator<CallEffect | PutEffect, void, SearchResponse> {
	try {
		const response: SearchResponse = yield call(
			api.searchChannels,
			action.payload,
		);
		yield put(sagaSearchChannelsSucceeded(response.channels));
	} catch (error) {
		yield put(sagaFetchVideosFailed((error as Error).message));
	}
}

function* subscribe(action: {
	payload: {
		channelId: string;
		channelTitle: string;
		channelThumbnail: string;
	};
}): Generator<CallEffect | PutEffect, void, { subscription: unknown }> {
	try {
		const response: { subscription: unknown } = yield call(
			api.addSubscription,
			action.payload.channelId,
			action.payload.channelTitle,
			action.payload.channelThumbnail,
		);
		yield put(sagaSubscribeSucceeded(response.subscription as never));
		yield put(sagaSearchChannelsSucceeded([]));
	} catch (error) {
		yield put(sagaFetchVideosFailed((error as Error).message));
	}
}

function* unsubscribe(_action: {
	payload: string;
}): Generator<CallEffect | PutEffect, void, SuccessResponse> {
	try {
		yield call(api.removeSubscription, _action.payload as string);
		yield put(sagaUnsubscribeSucceeded(_action.payload as string));
	} catch (error) {
		yield put(sagaFetchVideosFailed((error as Error).message));
	}
}

export default function* rootSaga(): Generator<unknown, void, unknown> {
	yield all([
		takeEvery(sagaCheckAuthStarted, checkAuth),
		takeEvery(sagaLogoutRequested, logout),
		takeEvery(sagaFetchVideosStarted, fetchVideos),
		takeEvery(sagaAddVideoRequested, addVideo),
		takeEvery(sagaIgnoreVideoRequested, ignoreVideo),
		takeEvery(sagaSyncVideosRequested, syncVideos),
		takeEvery(sagaFetchSubscriptionsStarted, fetchSubscriptions),
		takeEvery(sagaSearchChannelsRequested, searchChannels),
		takeEvery(sagaSubscribeRequested, subscribe),
		takeEvery(sagaUnsubscribeRequested, unsubscribe),
	]);
}
