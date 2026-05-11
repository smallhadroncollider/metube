import { useSelector } from "react-redux";
import type { RootState } from "../store/configureStore.js";
import VideoList from "./connected/VideoList.js";
import SubscriptionManager from "./connected/SubscriptionManager.js";
import DeviceAuthPolling from "./DeviceAuthPolling.js";
import styles from "./MainContent.module.scss";

const MainContent = () => {
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated,
  );
  const deviceUserCode = useSelector(
    (state: RootState) => state.auth.deviceUserCode,
  );
  const deviceVerificationUrl = useSelector(
    (state: RootState) => state.auth.deviceVerificationUrl,
  );
  const devicePolling = useSelector(
    (state: RootState) => state.auth.devicePolling,
  );
  const deviceAuthExpiresIn = useSelector(
    (state: RootState) => state.auth.deviceAuthExpiresIn,
  );

  if (!isAuthenticated) {
    if (devicePolling && deviceUserCode) {
      return (
        <div className={styles.authContainer}>
          <DeviceAuthPolling
            userCode={deviceUserCode}
            verificationUrl={deviceVerificationUrl ?? ""}
            expiresIn={deviceAuthExpiresIn}
          />
        </div>
      );
    }

    return (
      <div className={styles.authContainer}>
        <div className={styles.authPrompt}>
          <h1>MeTube</h1>
          <p>Loading sign in...</p>
        </div>
      </div>
    );
  }

  return (
    <main className={styles.container}>
      <div className={styles.grid}>
        <VideoList />
        <SubscriptionManager />
      </div>
    </main>
  );
};

export default MainContent;
