import { describe, it, expect } from "bun:test";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../src/frontend/slices/authSlice.js";
import {
	sagaCheckAuthStarted,
	sagaCheckAuthSucceeded,
	sagaCheckAuthFailed,
	sagaAuthError,
	sagaLogoutSucceeded,
	sagaDeviceAuthRequested,
	sagaDeviceAuthPolling,
	sagaDeviceAuthFailed,
	sagaDeviceAuthExpired,
} from "../src/frontend/slices/authSlice.js";
import type { User } from "../src/frontend/types/index.js";

const mockUser: User = {
	id: 1,
	email: "test@test.com",
	name: "Test User",
	picture: "https://pic.com/test.jpg",
};

describe("Auth Slice", () => {
	it("should have correct initial state", () => {
		const store = configureStore({ reducer: { auth: authReducer } });
		const state = store.getState() as {
			auth: {
				isAuthenticated: boolean;
				user: User | null;
				isLoading: boolean;
				error: string | null;
			};
		};
		expect(state.auth.isAuthenticated).toBe(false);
		expect(state.auth.user).toBeNull();
		expect(state.auth.isLoading).toBe(false);
		expect(state.auth.error).toBeNull();
	});

	it("should set loading on check started", () => {
		const store = configureStore({ reducer: { auth: authReducer } });
		store.dispatch(sagaCheckAuthStarted());
		const state = store.getState() as {
			auth: { isLoading: boolean; error: string | null };
		};
		expect(state.auth.isLoading).toBe(true);
		expect(state.auth.error).toBeNull();
	});

	it("should set authenticated on check succeeded", () => {
		const store = configureStore({ reducer: { auth: authReducer } });
		store.dispatch(sagaCheckAuthStarted());
		store.dispatch(sagaCheckAuthSucceeded(mockUser));
		const state = store.getState() as {
			auth: { isAuthenticated: boolean; user: User | null; isLoading: boolean };
		};
		expect(state.auth.isAuthenticated).toBe(true);
		expect(state.auth.user).toEqual(mockUser);
		expect(state.auth.isLoading).toBe(false);
	});

	it("should set not authenticated on check failed", () => {
		const store = configureStore({ reducer: { auth: authReducer } });
		store.dispatch(sagaCheckAuthStarted());
		store.dispatch(sagaCheckAuthFailed());
		const state = store.getState() as {
			auth: { isAuthenticated: boolean; isLoading: boolean };
		};
		expect(state.auth.isAuthenticated).toBe(false);
		expect(state.auth.isLoading).toBe(false);
	});

	it("should set error on auth error", () => {
		const store = configureStore({ reducer: { auth: authReducer } });
		store.dispatch(sagaCheckAuthStarted());
		store.dispatch(sagaAuthError("Test error"));
		const state = store.getState() as {
			auth: { error: string | null; isLoading: boolean };
		};
		expect(state.auth.error).toBe("Test error");
		expect(state.auth.isLoading).toBe(false);
	});

	it("should logout successfully", () => {
		const store = configureStore({ reducer: { auth: authReducer } });
		store.dispatch(sagaCheckAuthSucceeded(mockUser));
		store.dispatch(sagaLogoutSucceeded());
		const state = store.getState() as {
			auth: { isAuthenticated: boolean; user: User | null };
		};
		expect(state.auth.isAuthenticated).toBe(false);
		expect(state.auth.user).toBeNull();
	});

	it("should set device auth state on device auth requested", () => {
		const store = configureStore({ reducer: { auth: authReducer } });
		store.dispatch(
			sagaDeviceAuthRequested({
				userCode: "ABC123",
				verificationUrl: "https://google.com/device",
				deviceCode: "devicecode123",
				interval: 5,
				expiresIn: 300,
			}),
		);
		const state = store.getState() as {
			auth: {
				deviceUserCode: string | null;
				deviceVerificationUrl: string | null;
				devicePolling: boolean;
				deviceAuthExpiresIn: number;
			};
		};
		expect(state.auth.deviceUserCode).toBe("ABC123");
		expect(state.auth.deviceVerificationUrl).toBe("https://google.com/device");
		expect(state.auth.devicePolling).toBe(true);
		expect(state.auth.deviceAuthExpiresIn).toBe(300);
	});

	it("should set devicePolling false on slow_down", () => {
		const store = configureStore({ reducer: { auth: authReducer } });
		store.dispatch(
			sagaDeviceAuthPolling({ status: "slow_down" }),
		);
		const state = store.getState() as {
			auth: { devicePolling: boolean };
		};
		expect(state.auth.devicePolling).toBe(false);
	});

	it("should set devicePolling true on pending", () => {
		const store = configureStore({ reducer: { auth: authReducer } });
		store.dispatch(
			sagaDeviceAuthPolling({ status: "pending" }),
		);
		const state = store.getState() as {
			auth: { devicePolling: boolean };
		};
		expect(state.auth.devicePolling).toBe(true);
	});

	it("should clear device auth state on device auth failed", () => {
		const store = configureStore({ reducer: { auth: authReducer } });
		store.dispatch(
			sagaDeviceAuthRequested({
				userCode: "ABC123",
				verificationUrl: "https://google.com/device",
				deviceCode: "devicecode123",
				interval: 5,
				expiresIn: 300,
			}),
		);
		store.dispatch(sagaDeviceAuthFailed());
		const state = store.getState() as {
			auth: {
				deviceUserCode: string | null;
				deviceVerificationUrl: string | null;
				devicePolling: boolean;
				deviceAuthExpiresIn: number;
			};
		};
		expect(state.auth.deviceUserCode).toBeNull();
		expect(state.auth.deviceVerificationUrl).toBeNull();
		expect(state.auth.devicePolling).toBe(false);
		expect(state.auth.deviceAuthExpiresIn).toBe(0);
	});

	it("should clear device auth state on device auth expired", () => {
		const store = configureStore({ reducer: { auth: authReducer } });
		store.dispatch(
			sagaDeviceAuthRequested({
				userCode: "ABC123",
				verificationUrl: "https://google.com/device",
				deviceCode: "devicecode123",
				interval: 5,
				expiresIn: 300,
			}),
		);
		store.dispatch(sagaDeviceAuthExpired());
		const state = store.getState() as {
			auth: {
				deviceUserCode: string | null;
				deviceVerificationUrl: string | null;
				devicePolling: boolean;
				deviceAuthExpiresIn: number;
			};
		};
		expect(state.auth.deviceUserCode).toBeNull();
		expect(state.auth.deviceVerificationUrl).toBeNull();
		expect(state.auth.devicePolling).toBe(false);
		expect(state.auth.deviceAuthExpiresIn).toBe(0);
	});

	it("should clear device auth state on check succeeded", () => {
		const store = configureStore({ reducer: { auth: authReducer } });
		store.dispatch(
			sagaDeviceAuthRequested({
				userCode: "ABC123",
				verificationUrl: "https://google.com/device",
				deviceCode: "devicecode123",
				interval: 5,
				expiresIn: 300,
			}),
		);
		store.dispatch(sagaCheckAuthSucceeded(mockUser));
		const state = store.getState() as {
			auth: {
				deviceUserCode: string | null;
				deviceVerificationUrl: string | null;
				devicePolling: boolean;
				deviceAuthExpiresIn: number;
			};
		};
		expect(state.auth.deviceUserCode).toBeNull();
		expect(state.auth.deviceVerificationUrl).toBeNull();
		expect(state.auth.devicePolling).toBe(false);
		expect(state.auth.deviceAuthExpiresIn).toBe(0);
	});
});