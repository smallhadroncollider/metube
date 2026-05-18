import { useState, useCallback, useEffect } from "react";
import type { Video, Subscription } from "../../types/index.js";
import { VideoCard } from "../VideoCard/index.js";
import styles from "./VideoList.module.scss";

type VideoListProps = {
  videos: Video[];
  subscriptions: Subscription[];
  isLoading: boolean;
  isSyncing: boolean;
  nextSyncAt: string | null;
  onAddVideo: (videoId: string, channelId: string) => void;
  onIgnoreVideo: (videoId: string, channelId: string) => void;
  onIgnoreAllVideos: () => void;
  onSync: () => void;
};

const VideoList = ({
  videos,
  subscriptions,
  isLoading,
  isSyncing,
  nextSyncAt,
  onAddVideo,
  onIgnoreVideo,
  onIgnoreAllVideos,
  onSync,
}: VideoListProps) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [, setTick] = useState(0);

  const SYNC_WITHIN_THRESHOLD_MS = 5 * 60 * 1000;

  useEffect(() => {
    if (!nextSyncAt) {
      return;
    }

    const interval = setInterval(() => setTick((t) => t + 1), 1000);

    return () => clearInterval(interval);
  }, [nextSyncAt]);

  const formatSyncButtonLabel = useCallback(() => {
    if (isSyncing) {
      return "Syncing...";
    }

    if (!nextSyncAt) {
      return "Sync Channels";
    }

    const nextSyncTime = new Date(nextSyncAt).getTime();
    const now = Date.now();
    const remaining = nextSyncTime - now;

    if (remaining > SYNC_WITHIN_THRESHOLD_MS) {
      return "Sync Channels";
    }

    const seconds = Math.max(0, Math.ceil(remaining / 1000));
    return `Sync Channels (${seconds}s)`;
  }, [isSyncing, nextSyncAt, showConfirm]);

  const getChannelInfo = (channelId: string) => {
    const sub = subscriptions.find((s) => s.channel_id === channelId);
    return {
      thumbnail: sub?.channel_thumbnail ?? null,
      title: sub?.channel_title ?? "",
    };
  };

  const handleIgnoreAllClick = useCallback(() => {
    if (showConfirm) {
      onIgnoreAllVideos();
      setShowConfirm(false);
    } else {
      setShowConfirm(true);
    }
  }, [showConfirm, onIgnoreAllVideos]);

  const hasVideos = videos.length > 0;
  const isDisabled = isSyncing || !hasVideos;
  return (
    <div className={styles.list}>
      <div className={styles.header}>
        <h2>New Videos</h2>
        <div className={styles.headerActions}>
          <button
            className={
              showConfirm ? styles.ignoreAllSureBtn : styles.ignoreAllBtn
            }
            onClick={handleIgnoreAllClick}
            disabled={isDisabled}
          >
            {showConfirm ? "Sure?" : "Ignore All"}
          </button>
          <button
            className={styles.syncBtn}
            onClick={onSync}
            disabled={isSyncing}
          >
            {isSyncing && <span className={styles.spinner} />}
            {formatSyncButtonLabel()}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loading}>Loading...</div>
      ) : videos.length === 0 ? (
        <div className={styles.empty}>
          <p>No new videos</p>
          <p style={{ fontSize: 14, opacity: 0.7, marginTop: 8 }}>
            Subscribe to channels and sync to see new videos here
          </p>
        </div>
      ) : (
        <div className={styles.cards}>
          {videos.map((video) => {
            const { thumbnail, title } = getChannelInfo(video.channel_id);
            return (
              <VideoCard
                key={video.video_id}
                video={video}
                channelThumbnail={thumbnail}
                channelTitle={title}
                onAdd={() => onAddVideo(video.video_id, video.channel_id)}
                onIgnore={() => onIgnoreVideo(video.video_id, video.channel_id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export { VideoList };
