// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import type {Store} from 'redux';

import type {GlobalState} from '@mattermost/types/store';

import manifest from 'manifest';
import type {PluginRegistry} from 'types/mattermost-webapp';

import {recordTranscription} from 'actions/recording';
import MicrophoneIcon from 'components/icons/microphone';
import Root from 'components/root';
import reducer from 'reducer';

export default class Plugin {
    public async initialize(registry: PluginRegistry, store: Store<GlobalState>): Promise<void> {
        registry.registerReducer(reducer);
        registry.registerRootComponent(Root);

        registry.registerFileUploadMethod(
            <MicrophoneIcon/>,
            () => {
                recordTranscription('', '')(store.dispatch, store.getState);
            },
            'Transcribe',
        );

        registry.registerSlashCommandWillBePostedHook((message, args) => {
            if (message.trim() === '/transcribe') {
                recordTranscription(args.channel_id, args.root_id)(store.dispatch, store.getState);
                return {};
            }
            return {message, args};
        });
    }
}

declare global {
    interface Window {
        registerPlugin(pluginId: string, plugin: Plugin): void;
        basename?: string;
    }
}

window.registerPlugin(manifest.id, new Plugin());
