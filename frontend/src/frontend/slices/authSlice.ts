import { createSlice, createAction } from "@reduxjs/toolkit";
import type { User } from "../types/index.js";

type AuthState = {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  deviceUserCode: string | null;
  deviceVerificationUrl: string | null;
  devicePolling: boolean;
  deviceAuthExpiresIn: number;
};

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  isLoading: false,
  error: null,
  deviceUserCode: null,
  deviceVerificationUrl: null,
  devicePolling: false,
  deviceAuthExpiresIn: 0,
};

export const sagaCheckAuthStarted = createAction("saga/auth/checkStarted");
export const sagaCheckAuthSucceeded = createAction<User>(
  "saga/auth/checkSucceeded",
);
export const sagaCheckAuthFailed = createAction("saga/auth/checkFailed");
export const sagaAuthError = createAction<string>("saga/auth/error");
export const sagaLogoutSucceeded = createAction("saga/logoutSucceeded");
export const sagaLogoutRequested = createAction("saga/logoutRequested");

export const sagaDeviceAuthStart = createAction("saga/auth/deviceAuthStart");

export const sagaDeviceAuthRequested = createAction<{
  userCode: string;
  verificationUrl: string;
  deviceCode: string;
  interval: number;
  expiresIn: number;
}>("saga/auth/deviceAuthRequested");

export const sagaDeviceAuthPolling = createAction<{
  status: "pending" | "slow_down";
}>("saga/auth/deviceAuthPolling");

export const sagaDeviceAuthFailed = createAction("saga/auth/deviceAuthFailed");

export const sagaDeviceAuthExpired = createAction(
  "saga/auth/deviceAuthExpired",
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(sagaCheckAuthStarted, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sagaCheckAuthSucceeded, (state, action) => {
        state.isAuthenticated = true;
        state.user = action.payload;
        state.isLoading = false;
        state.error = null;
        state.deviceUserCode = null;
        state.deviceVerificationUrl = null;
        state.devicePolling = false;
        state.deviceAuthExpiresIn = 0;
      })
      .addCase(sagaCheckAuthFailed, (state) => {
        state.isAuthenticated = false;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(sagaAuthError, (state, action) => {
        state.error = action.payload;
        state.isLoading = false;
      })
      .addCase(sagaLogoutSucceeded, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(sagaDeviceAuthRequested, (state, action) => {
        state.deviceUserCode = action.payload.userCode;
        state.deviceVerificationUrl = action.payload.verificationUrl;
        state.devicePolling = true;
        state.deviceAuthExpiresIn = action.payload.expiresIn;
      })
      .addCase(sagaDeviceAuthPolling, (state, action) => {
        state.devicePolling = action.payload.status !== "slow_down";
      })
      .addCase(sagaDeviceAuthFailed, (state) => {
        state.devicePolling = false;
        state.deviceUserCode = null;
        state.deviceVerificationUrl = null;
        state.deviceAuthExpiresIn = 0;
      })
      .addCase(sagaDeviceAuthExpired, (state) => {
        state.devicePolling = false;
        state.deviceUserCode = null;
        state.deviceVerificationUrl = null;
        state.deviceAuthExpiresIn = 0;
      });
  },
});

export default authSlice.reducer;
