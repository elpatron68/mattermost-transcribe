// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Dispatch} from 'redux';

import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';

import type {GlobalState} from '@mattermost/types/store';

import {
    CANCEL_RECORDING,
    CLOSE_RECORDING_MODAL,
    OPEN_RECORDING_MODAL,
    SET_LOADING,
    SET_RECORDING_CONTEXT,
    START_RECORDING,
    STOP_RECORDING,
    UPDATE_RECORDING,
} from '../action_types';
import Client from '../client';

let client: Client | null = null;

function getClient(): Client {
    if (!client) {
        client = new Client();
    }
    return client;
}

function resolveChannelId(state: GlobalState, channelId: string): string {
    return channelId || state.entities.channels.currentChannelId;
}

function resolveRootId(state: GlobalState, rootId: string): string {
    if (rootId) {
        return rootId;
    }
    const extendedState = state as GlobalState & {
        views?: {
            rhs?: {
                selectedPostId?: string;
            };
        };
    };
    return extendedState.views?.rhs?.selectedPostId || '';
}

async function showError(dispatch: Dispatch, state: GlobalState, channelId: string, message: string): Promise<void> {
    const resolvedChannelId = resolveChannelId(state, channelId);
    const userId = getCurrentUserId(state);
    if (!resolvedChannelId || !userId) {
        return;
    }

    try {
        await getClient().createEphemeralError(
            resolvedChannelId,
            userId,
            `**Transcription failed:** ${message}`,
        );
    } catch {
        // Ignore secondary failures when reporting errors.
    }
}

async function transcribeAndPost(
    dispatch: Dispatch,
    getState: () => GlobalState,
    channelId: string,
    rootId: string,
): Promise<void> {
    const state = getState();
    const resolvedChannelId = resolveChannelId(state, channelId);
    const resolvedRootId = resolveRootId(state, rootId);

    if (!resolvedChannelId) {
        await showError(dispatch, state, channelId, 'No channel selected');
        closeRecordingModal()(dispatch);
        return;
    }

    dispatch({type: SET_LOADING, loading: true});
    dispatch({type: STOP_RECORDING});

    try {
        const recording = await getClient().stopRecording();
        const text = await getClient().transcribe(recording);

        if (!text.trim()) {
            throw new Error('No speech detected in recording');
        }

        await getClient().createTextPost(resolvedChannelId, resolvedRootId, text.trim());
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        await showError(dispatch, getState(), resolvedChannelId, message);
    } finally {
        dispatch({type: SET_LOADING, loading: false});
        closeRecordingModal()(dispatch);
    }
}

export const openRecordingModal = () => (dispatch: Dispatch) => {
    dispatch({type: OPEN_RECORDING_MODAL});
};

export const closeRecordingModal = () => (dispatch: Dispatch) => {
    dispatch({type: CLOSE_RECORDING_MODAL});
};

export const cancelRecording = () => (dispatch: Dispatch) => {
    getClient().cancelRecording();
    dispatch({type: CANCEL_RECORDING});
    closeRecordingModal()(dispatch);
};

export const stopAndTranscribe = (channelId: string, rootId: string) => (
    dispatch: Dispatch,
    getState: () => GlobalState,
) => transcribeAndPost(dispatch, getState, channelId, rootId);

export const recordTranscription = (channelId: string, rootId: string) => async (
    dispatch: Dispatch,
    getState: () => GlobalState,
) => {
    dispatch({
        type: SET_RECORDING_CONTEXT,
        channelId,
        rootId,
    });
    openRecordingModal()(dispatch);

    try {
        await getClient().startRecording(
            (duration) => {
                dispatch({type: UPDATE_RECORDING, duration});
            },
            () => {
                transcribeAndPost(dispatch, getState, channelId, rootId);
            },
        );
        dispatch({type: START_RECORDING});
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to start recording';
        await showError(dispatch, getState(), channelId, message);
        closeRecordingModal()(dispatch);
    }
};

export const setClient = (nextClient: Client): void => {
    client = nextClient;
};
