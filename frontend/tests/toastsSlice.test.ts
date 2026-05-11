import { describe, it, expect } from "bun:test";
import { configureStore } from "@reduxjs/toolkit";
import toastsReducer from "../src/frontend/slices/toastsSlice.js";
import { addToast, removeToast } from "../src/frontend/slices/toastsSlice.js";

describe("Toasts Slice", () => {
  it("should have correct initial state", () => {
    const store = configureStore({ reducer: { toasts: toastsReducer } });
    const state = store.getState() as {
      toasts: { toasts: { id: string; message: string; type: string }[] };
    };
    expect(state.toasts.toasts).toEqual([]);
  });

  it("should add a toast", () => {
    const store = configureStore({ reducer: { toasts: toastsReducer } });
    store.dispatch(addToast({ message: "Test error", type: "error" }));
    const state = store.getState() as {
      toasts: { toasts: { id: string; message: string; type: string }[] };
    };
    expect(state.toasts.toasts).toHaveLength(1);
    expect(state.toasts.toasts[0]?.message).toBe("Test error");
    expect(state.toasts.toasts[0]?.type).toBe("error");
  });

  it("should remove a toast by id", () => {
    const store = configureStore({ reducer: { toasts: toastsReducer } });
    store.dispatch(addToast({ message: "Test error", type: "error" }));
    const state = store.getState() as {
      toasts: { toasts: { id: string; message: string; type: string }[] };
    };
    const toastId = state.toasts.toasts[0]?.id ?? "";
    store.dispatch(removeToast(toastId));
    const newState = store.getState() as {
      toasts: { toasts: { id: string; message: string; type: string }[] };
    };
    expect(newState.toasts.toasts).toHaveLength(0);
  });

  it("should support success toasts", () => {
    const store = configureStore({ reducer: { toasts: toastsReducer } });
    store.dispatch(addToast({ message: "Success!", type: "success" }));
    const state = store.getState() as {
      toasts: { toasts: { id: string; message: string; type: string }[] };
    };
    expect(state.toasts.toasts[0]?.type).toBe("success");
  });
});
