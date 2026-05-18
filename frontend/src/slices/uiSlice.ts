import { createSlice } from "@reduxjs/toolkit";

type UiState = {
  darkMode: boolean;
};

const loadDarkMode = (): boolean => {
  if (typeof localStorage === "undefined") {
    return false;
  }
  const stored = localStorage.getItem("darkMode");
  if (stored !== null) {
    return stored === "true";
  }
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
};

const initialState: UiState = {
  darkMode: loadDarkMode(),
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
      localStorage.setItem("darkMode", String(state.darkMode));
    },
  },
});

export const { toggleDarkMode } = uiSlice.actions;
export default uiSlice.reducer;
