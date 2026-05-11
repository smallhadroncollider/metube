import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { configureStore } from "@reduxjs/toolkit";
import uiReducer from "../src/frontend/slices/uiSlice.js";
import { toggleDarkMode } from "../src/frontend/slices/uiSlice.js";

const mockLocalStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  };
};

describe("UI Slice", () => {
  let storage: ReturnType<typeof mockLocalStorage>;

  beforeEach(() => {
    storage = mockLocalStorage();
    Object.assign(globalThis, { localStorage: storage });
  });

  afterEach(() => {
    storage.clear();
    delete (globalThis as Record<string, unknown>).localStorage;
  });

  it("should toggle dark mode", () => {
    const store = configureStore({ reducer: { ui: uiReducer } });
    const initialState = store.getState() as { ui: { darkMode: boolean } };
    store.dispatch(toggleDarkMode());
    const newState = store.getState() as { ui: { darkMode: boolean } };
    expect(newState.ui.darkMode).toBe(!initialState.ui.darkMode);
  });

  it("should persist dark mode to localStorage", () => {
    const store = configureStore({ reducer: { ui: uiReducer } });
    store.dispatch(toggleDarkMode());
    const state = store.getState() as { ui: { darkMode: boolean } };
    expect(storage.getItem("darkMode")).toBe(String(state.ui.darkMode));
  });
});
