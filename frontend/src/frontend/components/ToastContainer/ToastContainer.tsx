import { Toast } from "../Toast/index.js";
import styles from "./ToastContainer.module.scss";

type ToastData = {
  id: string;
  message: string;
  type: "error" | "success";
};

type ToastContainerProps = {
  toasts: ToastData[];
};

const ToastContainer = ({ toasts }: ToastContainerProps) => {
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

export { ToastContainer };
