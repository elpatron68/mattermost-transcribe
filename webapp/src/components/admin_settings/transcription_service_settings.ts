// Copyright (c) 2026 MediSoftware GmbH & Co. KG
// See LICENSE for license information.

import manifest from 'manifest';

export const BACKEND_PARAKEET = 'parakeet';
export const BACKEND_OPENAI = 'openai';

export const DEFAULT_PARAKEET_URL = 'http://parakeet:5092';
export const DEFAULT_OPENAI_URL = 'https://api.openai.com';
export const DEFAULT_OPENAI_MODEL = 'whisper-1';

export type PluginSettings = Record<string, string | number | boolean | undefined>;

/** Mattermost admin console escapes dots in plugin IDs when building setting paths. */
export function escapePathPart(pathPart: string): string {
    return pathPart.replace(/\./g, '+');
}

/** Full SchemaAdminSettings state key for a plugin setting (see Mattermost custom_plugin_settings). */
export function pluginAdminSettingKey(settingKey: string): string {
    return `PluginSettings.Plugins.${escapePathPart(manifest.id)}.${settingKey.toLowerCase()}`;
}

/** Resolve admin state key from the hosting custom setting id, if available. */
export function adminSettingKeyFor(hostSettingId: string | undefined, settingKey: string): string {
    if (hostSettingId && hostSettingId.includes('.')) {
        const lastDot = hostSettingId.lastIndexOf('.');
        return hostSettingId.slice(0, lastDot + 1) + settingKey.toLowerCase();
    }

    return pluginAdminSettingKey(settingKey);
}

export function stringSetting(settings: PluginSettings, key: string, fallback = ''): string {
    const value = settings[key];
    if (value === undefined || value === null) {
        return fallback;
    }
    return String(value);
}

export function backendFromSettings(settings: PluginSettings): string {
    const backend = stringSetting(settings, 'TranscriptionBackend', BACKEND_PARAKEET);
    return backend === BACKEND_OPENAI ? BACKEND_OPENAI : BACKEND_PARAKEET;
}

export function defaultsForBackend(backend: string): {url: string; model: string} {
    if (backend === BACKEND_OPENAI) {
        return {url: DEFAULT_OPENAI_URL, model: DEFAULT_OPENAI_MODEL};
    }
    return {url: DEFAULT_PARAKEET_URL, model: ''};
}

export function settingsForBackendSwitch(
    backend: string,
): {TranscriptionBackend: string; ParakeetURL: string; TranscriptionModel: string} {
    const defaults = defaultsForBackend(backend);
    return {
        TranscriptionBackend: backend,
        ParakeetURL: defaults.url,
        TranscriptionModel: defaults.model,
    };
}
