// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Dispatch} from 'redux';

import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';

import type {GlobalState} from '@mattermost/types/store';

import {
    CANCEL_RECORDING,
    CLEAR_TRANSCRIPTION_TEXT,
    CLOSE_RECORDING_MODAL,
    OPEN_RECORDING_MODAL,
    SET_LOADING,
    SET_RECORDING_CONTEXT,
    SET_TRANSCRIPTION_TEXT,
    START_RECORDING,
    STOP_RECORDING,
    UPDATE_RECORDING,
} from '../action_types';
import Client from '../client';
import {getMessageFromState} from '../i18n';
import {transcriptionText as selectTranscriptionText} from '../selectors';

let client: Client | null = null;

const KNOWN_ERRORS: Record<string, {id: string; defaultMessage: string}> = {
    'No channel selected': {
        id: 'transcribe.error.no_channel',
        defaultMessage: 'No channel selected',
    },
    'No speech detected in recording': {
        id: 'transcribe.error.no_speech',
        defaultMessage: 'No speech detected in recording',
    },
    'Failed to start recording': {
        id: 'transcribe.error.start_recording_failed',
        defaultMessage: 'Failed to start recording',
    },
    'Failed to load plugin configuration': {
        id: 'transcribe.error.config_load_failed',
        defaultMessage: 'Failed to load plugin configuration',
    },
    'Transcription failed': {
        id: 'transcribe.error.transcription_failed',
        defaultMessage: 'Transcription failed',
    },
    'Recorder is not initialized': {
        id: 'transcribe.error.recorder_not_initialized',
        defaultMessage: 'Recorder is not initialized',
    },
    'Recording failed': {
        id: 'transcribe.error.recording_failed',
        defaultMessage: 'Recording failed',
    },
};

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

function localizeError(state: GlobalState, message: string): string {
    const knownError = KNOWN_ERRORS[message];
    if (knownError) {
        return getMessageFromState(state, knownError.id, knownError.defaultMessage);
    }

    return message;
}

async function showError(dispatch: Dispatch, state: GlobalState, channelId: string, message: string): Promise<void> {
    const resolvedChannelId = resolveChannelId(state, channelId);
    const userId = getCurrentUserId(state);
    if (!resolvedChannelId || !userId) {
        return;
    }

    const localizedMessage = localizeError(state, message);
    const errorText = getMessageFromState(
        state,
        'transcribe.error.failed',
        '**Transcription failed:** {message}',
        {message: localizedMessage},
    );

    try {
        await getClient().createEphemeralError(
            resolvedChannelId,
            userId,
            errorText,
        );
    } catch {
        // Ignore secondary failures when reporting errors.
    }
}

async function transcribeForReview(
    dispatch: Dispatch,
    getState: () => GlobalState,
    channelId: string,
    rootId: string,
): Promise<void> {
    const state = getState();
    const resolvedChannelId = resolveChannelId(state, channelId);

    if (!resolvedChannelId) {
        await showError(
            dispatch,
            state,
            channelId,
            getMessageFromState(state, 'transcribe.error.no_channel', 'No channel selected'),
        );
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

        dispatch({type: SET_TRANSCRIPTION_TEXT, text: text.trim()});
    } catch (error) {
        const message = error instanceof Error ? error.message : getMessageFromState(
            getState(),
            'transcribe.error.unknown',
            'Unknown error',
        );
        await showError(dispatch, getState(), resolvedChannelId, message);
        closeRecordingModal()(dispatch);
    } finally {
        dispatch({type: SET_LOADING, loading: false});
    }
}

export const updateTranscriptionText = (text: string) => (dispatch: Dispatch) => {
    dispatch({type: SET_TRANSCRIPTION_TEXT, text});
};

export const sendTranscription = (channelId: string, rootId: string) => async (
    dispatch: Dispatch,
    getState: () => GlobalState,
) => {
    const state = getState();
    const resolvedChannelId = resolveChannelId(state, channelId);
    const resolvedRootId = resolveRootId(state, rootId);
    const message = selectTranscriptionText(state).trim();

    if (!resolvedChannelId || !message) {
        return;
    }

    dispatch({type: SET_LOADING, loading: true});

    try {
        await getClient().createTextPost(resolvedChannelId, resolvedRootId, message);
        dispatch({type: CLEAR_TRANSCRIPTION_TEXT});
        closeRecordingModal()(dispatch);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : getMessageFromState(
            getState(),
            'transcribe.error.unknown',
            'Unknown error',
        );
        await showError(dispatch, getState(), resolvedChannelId, errorMessage);
    } finally {
        dispatch({type: SET_LOADING, loading: false});
    }
};

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
) => transcribeForReview(dispatch, getState, channelId, rootId);

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
            (duration, level) => {
                dispatch({type: UPDATE_RECORDING, duration, level});
            },
            () => {
                transcribeForReview(dispatch, getState, channelId, rootId);
            },
        );
        dispatch({type: START_RECORDING});
    } catch (error) {
        const state = getState();
        const message = error instanceof Error ? error.message : getMessageFromState(
            state,
            'transcribe.error.start_recording_failed',
            'Failed to start recording',
        );
        await showError(dispatch, state, channelId, message);
        closeRecordingModal()(dispatch);
    }
};

export const setClient = (nextClient: Client): void => {
    client = nextClient;
};
