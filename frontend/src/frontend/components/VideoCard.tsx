import { useState, useRef, useCallback } from "react";
import type { Video } from "../types/index.js";
import styles from "./VideoCard.module.scss";

type VideoCardProps = {
  video: Video;
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

const VideoCard = ({ video, onAdd, onIgnore }: VideoCardProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<{ x: number; offset: number } | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      startRef.current = { x: e.clientX, offset: dragOffset };
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [dragOffset],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!startRef.current || !isDragging) return;
      const dx = e.clientX - startRef.current.x;
      setDragOffset(
        Math.max(-100, Math.min(100, startRef.current.offset + dx)),
      );
    },
    [isDragging],
  );

  const handlePointerUp = useCallback(() => {
    if (dragOffset > 50) {
      onAdd();
    } else if (dragOffset < -50) {
      onIgnore();
    }
    setDragOffset(0);
    setIsDragging(false);
    startRef.current = null;
  }, [dragOffset, onAdd, onIgnore]);

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

  const truncatedDescription =
    video.description.length > 120
      ? video.description.slice(0, 120) + "..."
      : video.description;

  return (
    <div
      ref={cardRef}
      className={styles.card}
      style={{
        transform: `translateX(${dragOffset}px)`,
        opacity: isDragging ? 0.8 : 1,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className={styles.background}>
        <div className={styles.addBg}>ADD</div>
        <div className={styles.ignoreBg}>IGNORE</div>
      </div>
      <div className={styles.content}>
        <div className={styles.thumbnailWrapper}>
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

export default VideoCard;
