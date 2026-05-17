import Avatar from "./Avatar.js";
import styles from "./Header.module.scss";

type HeaderProps = {
  isAuthenticated: boolean;
  userName: string;
  userPicture: string;
  darkMode: boolean;
  onLogout: () => void;
  onToggleDarkMode: () => void;
};

const Header = ({
  isAuthenticated,
  userName,
  userPicture,
  darkMode,
  onLogout,
  onToggleDarkMode,
}: HeaderProps) => {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <h1>MeTube</h1>
        </div>
        <div className={styles.actions}>
          <button className={styles.themeToggle} onClick={onToggleDarkMode}>
            {darkMode ? "☀️" : "🌙"}
          </button>
          {isAuthenticated && (
            <div className={styles.user}>
              <Avatar
                src={userPicture}
                alt={userName}
                className={styles.avatar}
                size={32}
              />
              <span className={styles.userName}>{userName}</span>
              <button className={styles.logout} onClick={onLogout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
