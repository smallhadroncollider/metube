import { useSelector } from "react-redux";
import type { RootState } from "../store/configureStore.js";
import VideoList from "./connected/VideoList.js";
import SubscriptionManager from "./connected/SubscriptionManager.js";
import styles from "./MainContent.module.scss";

const MainContent = () => {
	const isAuthenticated = useSelector(
		(state: RootState) => state.auth.isAuthenticated,
	);

	if (!isAuthenticated) {
		return (
			<div className={styles.authPrompt}>
				<h1>MeTube</h1>
				<p>Curate YouTube videos for your child</p>
				<a href="/auth/google" className={styles.loginBtn}>
					Sign in with Google
				</a>
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
