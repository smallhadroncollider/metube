import { useState, useEffect } from "react";
import styles from "./Avatar.module.scss";

const erroredImages = new Set<string>();

const Avatar = ({
  src,
  alt,
  className,
  delay = 0,
  size = 28,
}: {
  src: string;
  alt: string;
  className: string | undefined;
  delay?: number;
  size?: number;
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
      <div className={styles.fallback} style={{ width: size, height: size }}>
        {alt.charAt(0).toUpperCase()}
      </div>
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

export { Avatar };
