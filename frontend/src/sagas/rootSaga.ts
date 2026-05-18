import {
  takeEvery,
  put,
  call,
  all,
  delay,
  fork,
  cancelled,
} from "redux-saga/effects";
import { createAction } from "@reduxjs/toolkit";
import type {
  CallEffect,
  ForkEffect,
  PutEffect,
  Effect,
} from "redux-saga/effects";
import {
  sagaCheckAuthStarted,
  sagaCheckAuthSucceeded,
  sagaCheckAuthFailed,
  sagaAuthError,
  sagaLogoutRequested,
  sagaLogoutSucceeded,
  sagaDeviceAuthStart,
  sagaDeviceAuthRequested,
  sagaDeviceAuthPolling,
  sagaDeviceAuthFailed,
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
  sagaSyncVideosSucceeded,
  sagaSyncChannelVideosRequested,
  sagaSyncChannelVideosSucceeded,
  sagaIgnoreAllVideosRequested,
  sagaSyncScheduleUpdated,
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
  DeviceAuthResponse,
  DevicePollResponse,
  VideosResponse,
  SubscriptionsResponse,
  SearchResponse,
  SuccessResponse,
  SubscriptionResponse,
  SyncResponse,
  ChannelSyncResponse,
} from "../api/types.js";
import type { User } from "../types/index.js";

export const sagaStartSse = createAction("saga/sse/start");
export const sagaStopSse = createAction("saga/sse/stop");

let sseAbortController: AbortController | null = null;

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
      yield put(sagaStartSse());
    } else {
      yield put(sagaCheckAuthFailed());
      yield put(sagaDeviceAuthStart());
    }
  } catch {
    yield put(sagaCheckAuthFailed());
  }
}

function* requestDeviceAuth(): Generator<
  CallEffect | PutEffect,
  void,
  DeviceAuthResponse
> {
  try {
    const deviceAuth = (yield call(
      api.requestDeviceAuth,
    )) as DeviceAuthResponse;
    yield put(
      sagaDeviceAuthRequested({
        userCode: deviceAuth.user_code,
        verificationUrl: deviceAuth.verification_url,
        deviceCode: deviceAuth.device_code,
        interval: deviceAuth.interval,
        expiresIn: deviceAuth.expires_in,
      }),
    );
  } catch (error) {
    yield put(sagaAuthError((error as Error).message));
  }
}

const getWaitTime = (
  pollResponse: DevicePollResponse,
  interval: number,
): number => (pollResponse.status === "slow_down" ? 2000 : interval * 1000);

function* pollDeviceToken(action: {
  payload: { deviceCode: string; interval: number; expiresIn: number };
}): Generator<CallEffect | PutEffect, void, unknown> {
  const { deviceCode, interval } = action.payload;

  while (true) {
    const pollResponse = (yield call(
      api.pollDeviceToken,
      deviceCode,
    )) as DevicePollResponse;

    if (pollResponse.status === "complete") {
      const userResponse = (yield call(api.getUser)) as {
        user: User;
        playlistId: string;
      };
      yield put(sagaCheckAuthSucceeded(userResponse.user));
      yield put(sagaFetchVideosStarted());
      yield put(sagaFetchSubscriptionsStarted());
      yield put(
        addToast({ message: "Signed in successfully", type: "success" }),
      );
      break;
    }

    if (pollResponse.status === "error") {
      yield put(
        addToast({
          message:
            pollResponse.error === "invalid_grant"
              ? "Authorization expired. Please try signing in again."
              : `Auth failed: ${pollResponse.error}`,
          type: "error",
        }),
      );
      yield put(sagaDeviceAuthFailed());
      break;
    }

    yield put(
      sagaDeviceAuthPolling({
        status: pollResponse.status === "slow_down" ? "slow_down" : "pending",
      }),
    );

    yield delay(getWaitTime(pollResponse, interval));
  }
}

function* logout(): Generator<CallEffect | PutEffect, void, SuccessResponse> {
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
    yield put(sagaSyncScheduleUpdated(response.next_sync_at));
  } catch (error) {
    const errorMessage = (error as Error).message;
    yield put(sagaFetchVideosFailed(errorMessage));
    yield put(addToast({ message: errorMessage, type: "error" }));
  }
}

const SSE_POLL_INTERVAL_MS = 30_000;

function* listenToSse(): Generator<Effect, void, void> {
  let lastNextSyncAt: string | null = null;
  let pendingSyncComplete = false;

  const eventSource = new EventSource("/api/sync/sse");

  eventSource.addEventListener("init", (event: MessageEvent): void => {
    try {
      const data = JSON.parse(event.data);
      lastNextSyncAt = data.next_sync_at;
    } catch {
      // ignore parse errors
    }
  });

  eventSource.addEventListener("sync_schedule", (event: MessageEvent): void => {
    try {
      const data = JSON.parse(event.data);
      lastNextSyncAt = data.next_sync_at;
    } catch {
      // ignore parse errors
    }
  });

  eventSource.addEventListener("sync_complete", (): void => {
    pendingSyncComplete = true;
  });

  try {
    while (true) {
      yield delay(SSE_POLL_INTERVAL_MS);

      if (pendingSyncComplete) {
        pendingSyncComplete = false;
        yield put(sagaFetchVideosStarted());
      }

      if (lastNextSyncAt) {
        yield put(sagaSyncScheduleUpdated(lastNextSyncAt));
      }
    }
  } finally {
    yield cancelled();
    eventSource.close();
  }
}

function* startSseListener(): Generator<CallEffect | ForkEffect, void, void> {
  if (sseAbortController) {
    return;
  }
  sseAbortController = new AbortController();
  yield fork(listenToSse);
}

function* stopSseListener(): Generator<CallEffect, void, void> {
  // The listenToSse saga handles cleanup in its finally block
}

function* addVideo(action: {
  payload: { videoId: string; channelId: string };
}): Generator<CallEffect | PutEffect, void, SuccessResponse> {
  try {
    yield call(api.addVideo, action.payload.videoId, action.payload.channelId);
    yield put(sagaAddVideoSucceeded({ videoId: action.payload.videoId }));
  } catch (error) {
    const errorMessage = (error as Error).message;
    yield put(
      sagaAddVideoFailed({
        videoId: action.payload.videoId,
        error: errorMessage,
      }),
    );
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

function* ignoreAllVideos(): Generator<CallEffect | PutEffect, void, void> {
  try {
    yield call(api.ignoreAllVideos);
    yield put(sagaFetchVideosStarted());
    const response = (yield call(api.getVideos)) as unknown as VideosResponse;
    yield put(sagaFetchVideosSucceeded(response.videos));
  } catch (error) {
    yield put(sagaFetchVideosFailed((error as Error).message));
  }
}

function* syncVideos(): Generator<CallEffect | PutEffect, void, SyncResponse> {
  try {
    yield call(api.syncVideos);
    yield put(sagaSyncVideosSucceeded());
    yield put(sagaFetchVideosStarted());
  } catch (error) {
    const errorMessage = (error as Error).message;
    yield put(sagaSyncVideosSucceeded());
    yield put(sagaFetchVideosFailed(errorMessage));
    yield put(addToast({ message: errorMessage, type: "error" }));
  }
}

function* syncChannelVideos(action: {
  payload: string;
}): Generator<CallEffect | PutEffect, void, ChannelSyncResponse> {
  try {
    yield call(api.syncChannelVideos, action.payload);
    yield put(sagaSyncChannelVideosSucceeded());
    yield put(sagaFetchVideosStarted());
  } catch (error) {
    const errorMessage = (error as Error).message;
    yield put(sagaSyncChannelVideosSucceeded());
    yield put(sagaFetchVideosFailed(errorMessage));
    yield put(addToast({ message: errorMessage, type: "error" }));
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
    const errorMessage = (error as Error).message;
    yield put(sagaFetchVideosFailed(errorMessage));
    yield put(addToast({ message: errorMessage, type: "error" }));
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
    const errorMessage = (error as Error).message;
    yield put(sagaFetchVideosFailed(errorMessage));
    yield put(addToast({ message: errorMessage, type: "error" }));
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
    const response = (yield call(
      api.addSubscription,
      action.payload.channelId,
      action.payload.channelTitle,
      action.payload.channelThumbnail,
    )) as SubscriptionResponse;
    yield put(sagaSubscribeSucceeded(response.subscription));
    yield put(sagaSearchChannelsSucceeded([]));
    yield put(sagaSyncChannelVideosRequested(action.payload.channelId));
  } catch (error) {
    const errorMessage = (error as Error).message;
    yield put(sagaFetchVideosFailed(errorMessage));
    yield put(addToast({ message: errorMessage, type: "error" }));
  }
}

function* unsubscribe(action: {
  payload: string;
}): Generator<CallEffect | PutEffect, void, SuccessResponse> {
  try {
    yield call(api.removeSubscription, action.payload);
    yield put(sagaUnsubscribeSucceeded(action.payload));
  } catch (error) {
    const errorMessage = (error as Error).message;
    yield put(sagaFetchVideosFailed(errorMessage));
    yield put(addToast({ message: errorMessage, type: "error" }));
  }
}

export default function* rootSaga(): Generator<unknown, void, unknown> {
  yield all([
    takeEvery(sagaCheckAuthStarted, checkAuth),
    takeEvery(sagaLogoutRequested, logout),
    takeEvery(sagaDeviceAuthStart, requestDeviceAuth),
    takeEvery(sagaDeviceAuthRequested, pollDeviceToken),
    takeEvery(sagaFetchVideosStarted, fetchVideos),
    takeEvery(sagaAddVideoRequested, addVideo),
    takeEvery(sagaIgnoreVideoRequested, ignoreVideo),
    takeEvery(sagaIgnoreAllVideosRequested, ignoreAllVideos),
    takeEvery(sagaSyncVideosRequested, syncVideos),
    takeEvery(sagaSyncChannelVideosRequested, syncChannelVideos),
    takeEvery(sagaFetchSubscriptionsStarted, fetchSubscriptions),
    takeEvery(sagaSearchChannelsRequested, searchChannels),
    takeEvery(sagaSubscribeRequested, subscribe),
    takeEvery(sagaUnsubscribeRequested, unsubscribe),
    takeEvery(sagaStartSse, startSseListener),
    takeEvery(sagaStopSse, stopSseListener),
  ]);
}
