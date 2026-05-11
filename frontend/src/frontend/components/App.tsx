import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { sagaCheckAuthStarted } from "../slices/authSlice.js";
import Layout from "./Layout.js";

const App = () => {
	const dispatch = useDispatch();

	useEffect(() => {
		dispatch(sagaCheckAuthStarted());
	}, [dispatch]);

	return <Layout />;
};

export default App;
