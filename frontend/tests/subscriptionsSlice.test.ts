import { describe, it, expect } from "bun:test";
import { configureStore } from "@reduxjs/toolkit";
import subscriptionsReducer from "../src/frontend/slices/subscriptionsSlice.js";
import {
	sagaFetchSubscriptionsStarted,
	sagaFetchSubscriptionsSucceeded,
	sagaSearchChannelsSucceeded,
	sagaSubscribeSucceeded,
	sagaUnsubscribeSucceeded,
} from "../src/frontend/slices/subscriptionsSlice.js";
import type { Subscription, ApiChannel } from "../src/frontend/types/index.js";

const mockSubscriptions: Subscription[] = [
	{
		id: 1,
		user_id: 1,
		channel_id: "UC1",
		channel_title: "Channel 1",
		channel_thumbnail: "https://thumb.com/c1.jpg",
		subscribed_at: "2024-01-01T00:00:00Z",
	},
];

const mockChannels: ApiChannel[] = [
	{
		channelId: "UC2",
		title: "Channel 2",
		thumbnail: "https://thumb.com/c2.jpg",
	},
];

describe("Subscriptions Slice", () => {
	it("should have correct initial state", () => {
		const store = configureStore({
			reducer: { subscriptions: subscriptionsReducer },
		});
		const state = store.getState() as {
			subscriptions: {
				subscriptions: Subscription[];
				searchResults: ApiChannel[];
				isLoading: boolean;
			};
		};
		expect(state.subscriptions.subscriptions).toEqual([]);
		expect(state.subscriptions.searchResults).toEqual([]);
		expect(state.subscriptions.isLoading).toBe(false);
	});

	it("should set loading on fetch started", () => {
		const store = configureStore({
			reducer: { subscriptions: subscriptionsReducer },
		});
		store.dispatch(sagaFetchSubscriptionsStarted());
		const state = store.getState() as { subscriptions: { isLoading: boolean } };
		expect(state.subscriptions.isLoading).toBe(true);
	});

	it("should set subscriptions on fetch succeeded", () => {
		const store = configureStore({
			reducer: { subscriptions: subscriptionsReducer },
		});
		store.dispatch(sagaFetchSubscriptionsSucceeded(mockSubscriptions));
		const state = store.getState() as {
			subscriptions: { subscriptions: Subscription[] };
		};
		expect(state.subscriptions.subscriptions).toHaveLength(1);
	});

	it("should set search results", () => {
		const store = configureStore({
			reducer: { subscriptions: subscriptionsReducer },
		});
		store.dispatch(sagaSearchChannelsSucceeded(mockChannels));
		const state = store.getState() as {
			subscriptions: { searchResults: ApiChannel[] };
		};
		expect(state.subscriptions.searchResults).toHaveLength(1);
		expect(state.subscriptions.searchResults[0]?.channelId).toBe("UC2");
	});

	it("should add subscription on subscribe succeeded", () => {
		const store = configureStore({
			reducer: { subscriptions: subscriptionsReducer },
		});
		store.dispatch(sagaFetchSubscriptionsSucceeded(mockSubscriptions));
		store.dispatch(
			sagaSubscribeSucceeded({
				id: 2,
				user_id: 1,
				channel_id: "UC2",
				channel_title: "Channel 2",
				channel_thumbnail: "https://thumb.com/c2.jpg",
				subscribed_at: "2024-01-02T00:00:00Z",
			}),
		);
		const state = store.getState() as {
			subscriptions: { subscriptions: Subscription[] };
		};
		expect(state.subscriptions.subscriptions).toHaveLength(2);
	});

	it("should remove subscription on unsubscribe succeeded", () => {
		const store = configureStore({
			reducer: { subscriptions: subscriptionsReducer },
		});
		store.dispatch(sagaFetchSubscriptionsSucceeded(mockSubscriptions));
		store.dispatch(sagaUnsubscribeSucceeded("UC1"));
		const state = store.getState() as {
			subscriptions: { subscriptions: Subscription[] };
		};
		expect(state.subscriptions.subscriptions).toHaveLength(0);
	});
});
