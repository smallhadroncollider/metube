import { createSlice, createAction } from "@reduxjs/toolkit";
import type { Subscription, ApiChannel } from "../types/index.js";

type SubscriptionsState = {
  subscriptions: Subscription[];
  searchResults: ApiChannel[];
  isLoading: boolean;
  error: string | null;
};

const initialState: SubscriptionsState = {
  subscriptions: [],
  searchResults: [],
  isLoading: false,
  error: null,
};

export const sagaFetchSubscriptionsStarted = createAction(
  "saga/subscriptions/fetchStarted",
);
export const sagaFetchSubscriptionsSucceeded = createAction<Subscription[]>(
  "saga/subscriptions/fetchSucceeded",
);
export const sagaSearchChannelsRequested = createAction<string>(
  "saga/subscriptions/searchRequested",
);
export const sagaSearchChannelsSucceeded = createAction<ApiChannel[]>(
  "saga/subscriptions/searchSucceeded",
);
export const sagaSubscribeRequested = createAction<{
  channelId: string;
  channelTitle: string;
  channelThumbnail: string;
}>("saga/subscriptions/subscribeRequested");
export const sagaSubscribeSucceeded = createAction<Subscription>(
  "saga/subscriptions/subscribeSucceeded",
);
export const sagaUnsubscribeRequested = createAction<string>(
  "saga/subscriptions/unsubscribeRequested",
);
export const sagaUnsubscribeSucceeded = createAction<string>(
  "saga/subscriptions/unsubscribeSucceeded",
);

const subscriptionsSlice = createSlice({
  name: "subscriptions",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(sagaFetchSubscriptionsStarted, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sagaFetchSubscriptionsSucceeded, (state, action) => {
        state.subscriptions = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(sagaSearchChannelsSucceeded, (state, action) => {
        state.searchResults = action.payload;
      })
      .addCase(sagaSubscribeSucceeded, (state, action) => {
        state.subscriptions.push(action.payload);
      })
      .addCase(sagaUnsubscribeSucceeded, (state, action) => {
        state.subscriptions = state.subscriptions.filter(
          (s) => s.channel_id !== action.payload,
        );
      });
  },
});

export default subscriptionsSlice.reducer;
