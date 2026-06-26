// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineReducers} from 'redux';

import {
    CANCEL_RECORDING,
    CLOSE_RECORDING_MODAL,
    OPEN_RECORDING_MODAL,
    SET_LOADING,
    SET_RECORDING_CONTEXT,
    START_RECORDING,
    STOP_RECORDING,
    UPDATE_RECORDING,
} from './action_types';

const recordingModalVisible = (state = false, action: {type: string}) => {
    switch (action.type) {
    case OPEN_RECORDING_MODAL:
        return true;
    case CLOSE_RECORDING_MODAL:
        return false;
    default:
        return state;
    }
};

const recordingDuration = (state = 0, action: {type: string; duration?: number}) => {
    switch (action.type) {
    case START_RECORDING:
    case STOP_RECORDING:
    case CANCEL_RECORDING:
        return 0;
    case UPDATE_RECORDING:
        return action.duration ?? 0;
    default:
        return state;
    }
};

const isLoading = (state = false, action: {type: string; loading?: boolean}) => {
    switch (action.type) {
    case SET_LOADING:
        return Boolean(action.loading);
    case CLOSE_RECORDING_MODAL:
        return false;
    default:
        return state;
    }
};

const channelId = (state = '', action: {type: string; channelId?: string}) => {
    switch (action.type) {
    case SET_RECORDING_CONTEXT:
        return action.channelId ?? '';
    case CLOSE_RECORDING_MODAL:
        return '';
    default:
        return state;
    }
};

const rootId = (state = '', action: {type: string; rootId?: string}) => {
    switch (action.type) {
    case SET_RECORDING_CONTEXT:
        return action.rootId ?? '';
    case CLOSE_RECORDING_MODAL:
        return '';
    default:
        return state;
    }
};

export default combineReducers({
    recordingModalVisible,
    recordingDuration,
    isLoading,
    channelId,
    rootId,
});
