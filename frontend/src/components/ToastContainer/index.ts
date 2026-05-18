import { connect } from "react-redux";
import type { RootState } from "../../store/configureStore.js";
import { ToastContainer } from "./ToastContainer.js";

const mapState = (state: RootState) => ({
  toasts: state.toasts.toasts,
});

const ConnectedToastContainer = connect(mapState)(ToastContainer);

export { ConnectedToastContainer as ToastContainer };
