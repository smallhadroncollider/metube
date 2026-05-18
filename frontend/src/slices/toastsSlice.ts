import { createSlice, nanoid } from "@reduxjs/toolkit";

type ToastType = "error" | "success";

type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

type ToastsState = {
  toasts: Toast[];
};

const initialState: ToastsState = {
  toasts: [],
};

const toastsSlice = createSlice({
  name: "toasts",
  initialState,
  reducers: {
    addToast: (
      state,
      action: { payload: { message: string; type: ToastType } },
    ) => {
      state.toasts.push({
        id: nanoid(),
        message: action.payload.message,
        type: action.payload.type,
      });
    },
    removeToast: (state, action: { payload: string }) => {
      state.toasts = state.toasts.filter(
        (toast) => toast.id !== action.payload,
      );
    },
  },
});

export const { addToast, removeToast } = toastsSlice.actions;
export default toastsSlice.reducer;
