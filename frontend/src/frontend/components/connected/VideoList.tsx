import { connect } from "react-redux";
import type { RootState, AppDispatch } from "../../store/configureStore.js";
import VideoList from "../VideoList.js";
import {
  sagaAddVideoRequested,
  sagaIgnoreVideoRequested,
  sagaIgnoreAllVideosRequested,
  sagaSyncVideosRequested,
} from "../../slices/videosSlice.js";

const mapState = (state: RootState) => ({
  videos: state.videos.videos,
  subscriptions: state.subscriptions.subscriptions,
  isLoading: state.videos.isLoading,
  isSyncing: state.videos.isSyncing,
});

const mapDispatch = (dispatch: AppDispatch) => ({
  onAddVideo: (videoId: string, channelId: string) =>
    dispatch(sagaAddVideoRequested({ videoId, channelId })),
  onIgnoreVideo: (videoId: string, channelId: string) =>
    dispatch(sagaIgnoreVideoRequested({ videoId, channelId })),
  onIgnoreAllVideos: (videos: Array<{ videoId: string; channelId: string }>) =>
    dispatch(sagaIgnoreAllVideosRequested({ videos })),
  onSync: () => dispatch(sagaSyncVideosRequested()),
});

export default connect(mapState, mapDispatch)(VideoList);
