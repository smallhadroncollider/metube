import { useSelector } from "react-redux";
import type { RootState } from "../store/configureStore.js";
import Toast from "./Toast.js";
import styles from "./ToastContainer.module.scss";

const ToastContainer = () => {
  const toasts = useSelector((state: RootState) => state.toasts.toasts);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
        />
      ))}
    </div>
  );
};

export default ToastContainer;
