import { useState, useEffect } from "react";
import type { Subscription, ApiChannel } from "../types/index.js";
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

const erroredImages = new Set<string>();

const ChannelAvatar = ({
  src,
  alt,
  className,
  delay = 0,
}: {
  src: string;
  alt: string;
  className: string | undefined;
  delay?: number;
}) => {
  const [isErrored, setIsErrored] = useState(() => erroredImages.has(src));
  const [revealed, setRevealed] = useState(delay === 0);

  useEffect(() => {
    if (delay === 0) return;
    const timer = setTimeout(() => setRevealed(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (isErrored || !revealed) {
    return (
      <div className={styles.fallbackAvatar}>{alt.charAt(0).toUpperCase()}</div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => {
        erroredImages.add(src);
        setIsErrored(true);
      }}
    />
  );
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
          {searchResults.map((channel, index) => (
            <div key={channel.channelId} className={styles.channel}>
              <ChannelAvatar
                src={channel.thumbnail}
                alt={channel.title}
                className={styles.channelThumb}
                delay={index * 250}
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
        {subscriptions.map((sub, index) => (
          <div key={sub.channel_id} className={styles.channel}>
            <ChannelAvatar
              src={sub.channel_thumbnail}
              alt={sub.channel_title}
              className={styles.channelThumb}
              delay={index * 100}
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
