import { connect } from "react-redux";
import type { RootState, AppDispatch } from "../../store/configureStore.js";
import VideoList from "../VideoList.js";
import {
  sagaAddVideoRequested,
  sagaIgnoreVideoRequested,
  sagaSyncVideosRequested,
} from "../../slices/videosSlice.js";

const mapState = (state: RootState) => ({
  videos: state.videos.videos,
  isLoading: state.videos.isLoading,
  isSyncing: state.videos.isSyncing,
});

const mapDispatch = (dispatch: AppDispatch) => ({
  onAddVideo: (videoId: string, channelId: string) =>
    dispatch(sagaAddVideoRequested({ videoId, channelId })),
  onIgnoreVideo: (videoId: string, channelId: string) =>
    dispatch(sagaIgnoreVideoRequested({ videoId, channelId })),
  onSync: () => dispatch(sagaSyncVideosRequested()),
});

export default connect(mapState, mapDispatch)(VideoList);
