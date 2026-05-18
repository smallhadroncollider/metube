import { connect } from "react-redux";
import type { RootState } from "../../store/configureStore.js";
import { Layout } from "./Layout.js";

const mapState = (state: RootState) => ({
  darkMode: state.ui.darkMode,
});

const ConnectedLayout = connect(mapState)(Layout);

export { ConnectedLayout as Layout };
