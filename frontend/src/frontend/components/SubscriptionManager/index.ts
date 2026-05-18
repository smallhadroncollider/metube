import { connect } from "react-redux";
import type { RootState, AppDispatch } from "../../store/configureStore.js";
import { SubscriptionManager } from "./SubscriptionManager.js";
import {
  sagaSearchChannelsRequested,
  sagaSubscribeRequested,
  sagaUnsubscribeRequested,
} from "../../slices/subscriptionsSlice.js";

const mapState = (state: RootState) => ({
  subscriptions: state.subscriptions.subscriptions,
  searchResults: state.subscriptions.searchResults,
});

const mapDispatch = (dispatch: AppDispatch) => ({
  onSearch: (query: string) => dispatch(sagaSearchChannelsRequested(query)),
  onSubscribe: (
    channelId: string,
    channelTitle: string,
    channelThumbnail: string,
  ) =>
    dispatch(
      sagaSubscribeRequested({ channelId, channelTitle, channelThumbnail }),
    ),
  onUnsubscribe: (channelId: string) =>
    dispatch(sagaUnsubscribeRequested(channelId)),
});

const ConnectedSubscriptionManager = connect(
  mapState,
  mapDispatch,
)(SubscriptionManager);

export { ConnectedSubscriptionManager as SubscriptionManager };
