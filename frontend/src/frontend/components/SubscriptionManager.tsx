import { useState } from "react";
import type { Subscription, ApiChannel } from "../types/index.js";
import {
	sagaSearchChannelsRequested,
	sagaSubscribeRequested,
	sagaUnsubscribeRequested,
} from "../slices/subscriptionsSlice.js";
import styles from "./SubscriptionManager.module.scss";

type SubscriptionManagerProps = {
	subscriptions: Subscription[];
	searchResults: ApiChannel[];
	onSearch: (query: string) => void;
	onSubscribe: (
		channelId: string,
		channelTitle: string,
		channelThumbnail: string,
	) => void;
	onUnsubscribe: (channelId: string) => void;
};

const SubscriptionManager = ({
	subscriptions,
	searchResults,
	onSearch,
	onSubscribe,
	onUnsubscribe,
}: SubscriptionManagerProps) => {
	const [query, setQuery] = useState("");

	const handleSearch = () => {
		if (query.trim()) {
			onSearch(query.trim());
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleSearch();
		}
	};

	const isSubscribed = (channelId: string): boolean =>
		subscriptions.some((sub) => sub.channel_id === channelId);

	return (
		<div className={styles.manager}>
			<h2 className={styles.heading}>Channels</h2>

			<div className={styles.search}>
				<input
					type="text"
					placeholder="Search channels..."
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					onKeyDown={handleKeyDown}
				/>
				<button onClick={handleSearch}>Search</button>
			</div>

			{searchResults.length > 0 && (
				<div className={styles.results}>
					<h3>Search Results</h3>
					{searchResults.map((channel) => (
						<div key={channel.channelId} className={styles.channel}>
							<img
								src={channel.thumbnail}
								alt={channel.title}
								className={styles.channelThumb}
							/>
							<span className={styles.channelName}>{channel.title}</span>
							{isSubscribed(channel.channelId) ? (
								<span className={styles.subscribed}>Subscribed</span>
							) : (
								<button
									className={styles.subscribeBtn}
									onClick={() =>
										onSubscribe(
											channel.channelId,
											channel.title,
											channel.thumbnail,
										)
									}
								>
									Subscribe
								</button>
							)}
						</div>
					))}
				</div>
			)}

			<div className={styles.subscriptions}>
				<h3>Subscribed ({subscriptions.length})</h3>
				{subscriptions.map((sub) => (
					<div key={sub.channel_id} className={styles.channel}>
						<img
							src={sub.channel_thumbnail}
							alt={sub.channel_title}
							className={styles.channelThumb}
						/>
						<span className={styles.channelName}>{sub.channel_title}</span>
						<button
							className={styles.unsubscribeBtn}
							onClick={() => onUnsubscribe(sub.channel_id)}
						>
							Unsubscribe
						</button>
					</div>
				))}
			</div>
		</div>
	);
};

export default SubscriptionManager;
