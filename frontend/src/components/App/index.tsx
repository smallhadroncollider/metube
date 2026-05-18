import { useEffect } from "react";
import { connect } from "react-redux";
import type { AppDispatch } from "../../store/configureStore.js";
import { Layout } from "../Layout/index.js";
import { sagaCheckAuthStarted } from "../../slices/authSlice.js";

const mapDispatch = (dispatch: AppDispatch) => ({
  onInit: () => dispatch(sagaCheckAuthStarted()),
});

const App = ({ onInit }: { onInit: () => void }) => {
  useEffect(() => {
    onInit();
  }, [onInit]);

  return <Layout />;
};

const ConnectedApp = connect(undefined, mapDispatch)(App);

export { ConnectedApp as App };
