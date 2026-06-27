// Copyright (c) 2026 MediSoftware GmbH & Co. KG
// See LICENSE for license information.

import {
    BACKEND_OPENAI,
    BACKEND_PARAKEET,
    adminSettingKeyFor,
    backendFromSettings,
    pluginAdminSettingKey,
    settingsForBackendSwitch,
} from './transcription_service_settings';

describe('transcription_service_settings', () => {
    it('defaults to Parakeet backend', () => {
        expect(backendFromSettings({})).toBe(BACKEND_PARAKEET);
    });

    it('recognizes OpenAI backend', () => {
        expect(backendFromSettings({TranscriptionBackend: BACKEND_OPENAI})).toBe(BACKEND_OPENAI);
        expect(backendFromSettings({transcriptionbackend: BACKEND_OPENAI})).toBe(BACKEND_OPENAI);
    });

    it('applies OpenAI defaults when switching backend', () => {
        expect(settingsForBackendSwitch(BACKEND_OPENAI)).toEqual({
            TranscriptionBackend: BACKEND_OPENAI,
            ParakeetURL: 'https://api.openai.com',
            TranscriptionModel: 'whisper-1',
        });
    });

    it('applies Parakeet defaults when switching backend', () => {
        expect(settingsForBackendSwitch(BACKEND_PARAKEET)).toEqual({
            TranscriptionBackend: BACKEND_PARAKEET,
            ParakeetURL: 'http://parakeet:5092',
            TranscriptionModel: '',
        });
    });

    it('builds Mattermost admin console setting keys', () => {
        expect(pluginAdminSettingKey('TranscriptionBackend')).toBe(
            'PluginSettings.Plugins.de+medisoftware+mattermost-transcribe.transcriptionbackend',
        );
        expect(adminSettingKeyFor(
            'PluginSettings.Plugins.de+medisoftware+mattermost-transcribe.transcriptionservice',
            'TranscriptionBackend',
        )).toBe('PluginSettings.Plugins.de+medisoftware+mattermost-transcribe.transcriptionbackend');
    });
});
