import { useSelector } from "react-redux";
import type { RootState } from "../store/configureStore.js";
import "../styles/global.scss";
import Header from "./connected/Header.js";
import MainContent from "./MainContent.js";
import ToastContainer from "./ToastContainer.js";

const Layout = () => {
  const darkMode = useSelector((state: RootState) => state.ui.darkMode);

  return (
    <div className={darkMode ? "dark" : "light"}>
      <Header />
      <MainContent />
      <ToastContainer />
    </div>
  );
};

export default Layout;
