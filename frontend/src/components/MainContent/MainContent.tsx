import type { Video, Subscription } from "../../types/index.js";
import { VideoList } from "../VideoList/index.js";
import { SubscriptionManager } from "../SubscriptionManager/index.js";
import { DeviceAuthPolling } from "../DeviceAuthPolling/index.js";
import styles from "./MainContent.module.scss";

type MainContentProps = {
  isAuthenticated: boolean;
  deviceUserCode: string | null;
  deviceVerificationUrl: string | null;
  devicePolling: boolean;
  deviceAuthExpiresIn: number;
};

const MainContent = ({
  isAuthenticated,
  deviceUserCode,
  deviceVerificationUrl,
  devicePolling,
  deviceAuthExpiresIn,
}: MainContentProps) => {
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

export { MainContent };
