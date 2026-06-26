// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import manifest from 'manifest';

import type {GlobalState} from '@mattermost/types/store';

type PluginState = {
    recordingModalVisible: boolean;
    recordingDuration: number;
    recordingLevel: number;
    isLoading: boolean;
    channelId: string;
    rootId: string;
};

function getPluginState(state: GlobalState): PluginState | undefined {
    return (state as GlobalState & Record<string, PluginState>)['plugins-' + manifest.id];
}

export function isRecordingModalVisible(state: GlobalState): boolean {
    return getPluginState(state)?.recordingModalVisible ?? false;
}

export function recordingDuration(state: GlobalState): number {
    return getPluginState(state)?.recordingDuration ?? 0;
}

export function recordingLevel(state: GlobalState): number {
    return getPluginState(state)?.recordingLevel ?? 0;
}

export function isTranscribing(state: GlobalState): boolean {
    return getPluginState(state)?.isLoading ?? false;
}

export function recordingChannelId(state: GlobalState): string {
    return getPluginState(state)?.channelId ?? '';
}

export function recordingRootId(state: GlobalState): string {
    return getPluginState(state)?.rootId ?? '';
}
