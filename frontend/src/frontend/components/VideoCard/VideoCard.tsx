import type { Video } from "../../types/index.js";
import styles from "./VideoCard.module.scss";

type VideoCardProps = {
  video: Video;
  channelThumbnail: string | null;
  onAdd: () => void;
  onIgnore: () => void;
};

const formatDuration = (isoDuration: string): string => {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "";
  const hours = parseInt(match[1] ?? "0", 10);
  const minutes = parseInt(match[2] ?? "0", 10);
  const seconds = parseInt(match[3] ?? "0", 10);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
};

const VideoCard = ({
  video,
  channelThumbnail,
  onAdd,
  onIgnore,
}: VideoCardProps) => {
  const truncatedDescription =
    video.description.length > 120
      ? video.description.slice(0, 120) + "..."
      : video.description;

  return (
    <div className={styles.card}>
      <div className={styles.content}>
        <div className={styles.thumbnailWrapper}>
          {channelThumbnail && (
            <img
              src={channelThumbnail}
              alt={video.title}
              className={styles.channelLogo}
            />
          )}
          <img
            src={video.thumbnail}
            alt={video.title}
            className={styles.thumbnail}
          />
          {video.duration && (
            <span className={styles.duration}>
              {formatDuration(video.duration)}
            </span>
          )}
        </div>
        <div className={styles.info}>
          <h3 className={styles.title}>{video.title}</h3>
          <p className={styles.description}>{truncatedDescription}</p>
          <span className={styles.date}>{formatDate(video.published_at)}</span>
        </div>
        <div className={styles.buttons}>
          <button className={styles.addButton} onClick={onAdd}>
            Add
          </button>
          <button className={styles.ignoreButton} onClick={onIgnore}>
            Ignore
          </button>
        </div>
      </div>
    </div>
  );
};

export { VideoCard };
