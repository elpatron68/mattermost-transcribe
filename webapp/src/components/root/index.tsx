// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators, type Dispatch} from 'redux';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import type {GlobalState} from '@mattermost/types/store';

import {cancelRecording, sendTranscription, stopAndTranscribe, updateTranscriptionText} from 'actions/recording';
import {
    isRecordingModalVisible,
    isTranscribing,
    recordingChannelId,
    recordingDuration,
    recordingLevel,
    recordingRootId,
    transcriptionText,
} from 'selectors';

import Root from './root';

function mapStateToProps(state: GlobalState) {
    const extendedState = state as GlobalState & {
        views?: {
            rhs?: {
                selectedPostId?: string;
            };
        };
    };

    return {
        visible: isRecordingModalVisible(state),
        duration: recordingDuration(state),
        level: recordingLevel(state),
        isLoading: isTranscribing(state),
        transcriptionText: transcriptionText(state),
        channelId: recordingChannelId(state) || state.entities.channels.currentChannelId,
        rootId: recordingRootId(state) || extendedState.views?.rhs?.selectedPostId || '',
        theme: getTheme(state),
    };
}

function mapDispatchToProps(dispatch: Dispatch) {
    return bindActionCreators({
        cancel: cancelRecording,
        stopAndTranscribe,
        updateTranscriptionText,
        sendTranscription,
    }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Root);
