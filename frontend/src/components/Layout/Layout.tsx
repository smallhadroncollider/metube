import "../../styles/global.scss";
import type { User } from "../../types/index.js";
import { Header } from "../Header/index.js";
import { MainContent } from "../MainContent/index.js";
import { ToastContainer } from "../ToastContainer/index.js";

type LayoutProps = {
  darkMode: boolean;
};

const Layout = ({ darkMode }: LayoutProps) => {
  return (
    <div className={darkMode ? "dark" : "light"}>
      <Header />
      <MainContent />
      <ToastContainer />
    </div>
  );
};

export { Layout };
