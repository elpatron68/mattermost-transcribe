// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import type {Store} from 'redux';
import {FormattedMessage} from 'react-intl';

import type {GlobalState} from '@mattermost/types/store';

import manifest from 'manifest';
import type {PluginRegistry} from 'types/mattermost-webapp';

import {recordTranscription} from 'actions/recording';
import HiddenPluginSetting from 'components/admin_settings/hidden_plugin_setting';
import TranscriptionServiceSection from 'components/admin_settings/transcription_service_section';
import MicrophoneIcon from 'components/icons/microphone';
import Root from 'components/root';
import {getTranslationsForLocale} from 'i18n';
import reducer from 'reducer';

export default class Plugin {
    public async initialize(registry: PluginRegistry, store: Store<GlobalState>): Promise<void> {
        registry.registerReducer(reducer);
        registry.registerRootComponent(Root);
        registry.registerTranslations(getTranslationsForLocale);
        registry.registerAdminConsoleCustomSetting('TranscriptionService', TranscriptionServiceSection, {showTitle: true});
        registry.registerAdminConsoleCustomSetting('TranscriptionBackend', HiddenPluginSetting, {showTitle: false});
        registry.registerAdminConsoleCustomSetting('ParakeetURL', HiddenPluginSetting, {showTitle: false});
        registry.registerAdminConsoleCustomSetting('ParakeetAPIKey', HiddenPluginSetting, {showTitle: false});
        registry.registerAdminConsoleCustomSetting('TranscriptionModel', HiddenPluginSetting, {showTitle: false});

        registry.registerFileUploadMethod(
            <MicrophoneIcon/>,
            () => {
                recordTranscription('', '')(store.dispatch, store.getState);
            },
            <FormattedMessage
                id='transcribe.file_upload.label'
                defaultMessage='Transcribe'
            />,
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
