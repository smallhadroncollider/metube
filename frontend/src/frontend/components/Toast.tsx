import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { removeToast } from "../slices/toastsSlice.js";
import styles from "./Toast.module.scss";

type ToastProps = {
  id: string;
  message: string;
  type: "error" | "success";
};

const Toast = ({ id, message, type }: ToastProps) => {
  const dispatch = useDispatch();

  useEffect(() => {
    const duration = type === "error" ? 10000 : 5000;
    const timer = setTimeout(() => {
      dispatch(removeToast(id));
    }, duration);
    return () => clearTimeout(timer);
  }, [id, dispatch, type]);

  return (
    <div className={`${styles.toast} ${styles[type]}`}>
      <span className={styles.message}>{message}</span>
      <button
        className={styles.closeBtn}
        onClick={() => dispatch(removeToast(id))}
      >
        &times;
      </button>
    </div>
  );
};

export default Toast;
