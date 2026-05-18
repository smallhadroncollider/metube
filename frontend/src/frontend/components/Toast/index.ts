import { connect } from "react-redux";
import type { AppDispatch } from "../../store/configureStore.js";
import { Toast } from "./Toast.js";
import { removeToast } from "../../slices/toastsSlice.js";

const mapDispatch = (dispatch: AppDispatch) => ({
  onRemoveToast: (id: string) => dispatch(removeToast(id)),
});

const ConnectedToast = connect(undefined, mapDispatch)(Toast);

export { ConnectedToast as Toast };
