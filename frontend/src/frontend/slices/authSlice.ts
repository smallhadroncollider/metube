import { createSlice, createAction } from "@reduxjs/toolkit";
import type { User } from "../types/index.js";

type AuthState = {
	isAuthenticated: boolean;
	user: User | null;
	isLoading: boolean;
	error: string | null;
};

const initialState: AuthState = {
	isAuthenticated: false,
	user: null,
	isLoading: false,
	error: null,
};

export const sagaCheckAuthStarted = createAction("saga/auth/checkStarted");
export const sagaCheckAuthSucceeded = createAction<User>("saga/auth/checkSucceeded");
export const sagaCheckAuthFailed = createAction("saga/auth/checkFailed");
export const sagaAuthError = createAction<string>("saga/auth/error");
export const sagaLogoutSucceeded = createAction("saga/logoutSucceeded");
export const sagaLogoutRequested = createAction("saga/logoutRequested");

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
			});
	},
});

export default authSlice.reducer;
