import { connect } from "react-redux";
import type { RootState, AppDispatch } from "../../store/configureStore.js";
import Header from "../Header.js";
import {
	sagaLogoutRequested,
} from "../../slices/authSlice.js";
import { toggleDarkMode } from "../../slices/uiSlice.js";

const mapState = (state: RootState) => ({
	isAuthenticated: state.auth.isAuthenticated,
	userName: state.auth.user?.name ?? "User",
	userPicture: state.auth.user?.picture ?? "",
	darkMode: state.ui.darkMode,
});

const mapDispatch = (dispatch: AppDispatch) => ({
	onLogout: () => dispatch(sagaLogoutRequested()),
	onToggleDarkMode: () => dispatch(toggleDarkMode()),
});

export default connect(mapState, mapDispatch)(Header);