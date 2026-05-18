import { connect } from "react-redux";
import type { RootState } from "../../store/configureStore.js";
import { MainContent } from "./MainContent.js";

const mapState = (state: RootState) => ({
  isAuthenticated: state.auth.isAuthenticated,
  deviceUserCode: state.auth.deviceUserCode,
  deviceVerificationUrl: state.auth.deviceVerificationUrl,
  devicePolling: state.auth.devicePolling,
  deviceAuthExpiresIn: state.auth.deviceAuthExpiresIn,
});

const ConnectedMainContent = connect(mapState)(MainContent);

export { ConnectedMainContent as MainContent };
