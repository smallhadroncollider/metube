import type { Video, Subscription } from "../types/index.js";
import VideoCard from "./VideoCard.js";
import styles from "./VideoList.module.scss";

type VideoListProps = {
  videos: Video[];
  subscriptions: Subscription[];
  isLoading: boolean;
  isSyncing: boolean;
  onAddVideo: (videoId: string, channelId: string) => void;
  onIgnoreVideo: (videoId: string, channelId: string) => void;
  onSync: () => void;
};

const VideoList = ({
  videos,
  subscriptions,
  isLoading,
  isSyncing,
  onAddVideo,
  onIgnoreVideo,
  onSync,
}: VideoListProps) => {
  const getChannelThumbnail = (channelId: string): string | null =>
    subscriptions.find((s) => s.channel_id === channelId)?.channel_thumbnail ??
    null;
  return (
    <div className={styles.list}>
      <div className={styles.header}>
        <h2>New Videos</h2>
        <button
          className={styles.syncBtn}
          onClick={onSync}
          disabled={isSyncing}
        >
          {isSyncing && <span className={styles.spinner} />}
          {isSyncing ? "Syncing..." : "Sync Channels"}
        </button>
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
          {videos.map((video) => (
            <VideoCard
              key={video.video_id}
              video={video}
              channelThumbnail={getChannelThumbnail(video.channel_id)}
              onAdd={() => onAddVideo(video.video_id, video.channel_id)}
              onIgnore={() => onIgnoreVideo(video.video_id, video.channel_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoList;
