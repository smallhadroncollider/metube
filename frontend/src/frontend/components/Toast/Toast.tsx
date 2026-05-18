import { useEffect } from "react";
import { removeToast } from "../../slices/toastsSlice.js";
import styles from "./Toast.module.scss";

type ToastProps = {
  id: string;
  message: string;
  type: "error" | "success";
  onRemoveToast: (id: string) => void;
};

const Toast = ({ id, message, type, onRemoveToast }: ToastProps) => {
  useEffect(() => {
    const duration = type === "error" ? 10000 : 5000;
    const timer = setTimeout(() => {
      onRemoveToast(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, type, onRemoveToast]);

  return (
    <div className={`${styles.toast} ${styles[type]}`}>
      <span className={styles.message}>{message}</span>
      <button
        className={styles.closeBtn}
        onClick={() => onRemoveToast(id)}
      >
        &times;
      </button>
    </div>
  );
};

export { Toast };
