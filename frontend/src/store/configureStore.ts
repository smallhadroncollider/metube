import { configureStore } from "@reduxjs/toolkit";
import createSagaMiddleware from "redux-saga";
import rootSaga from "../sagas/rootSaga.js";
import authReducer from "../slices/authSlice.js";
import videosReducer from "../slices/videosSlice.js";
import subscriptionsReducer from "../slices/subscriptionsSlice.js";
import uiReducer from "../slices/uiSlice.js";
import toastsReducer from "../slices/toastsSlice.js";

const sagaMiddleware = createSagaMiddleware();

export const store = configureStore({
  reducer: {
    auth: authReducer,
    videos: videosReducer,
    subscriptions: subscriptionsReducer,
    ui: uiReducer,
    toasts: toastsReducer,
  },
  middleware: (getDefault) => getDefault().concat(sagaMiddleware),
});

sagaMiddleware.run(rootSaga);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
