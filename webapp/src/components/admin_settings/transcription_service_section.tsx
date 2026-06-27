// Copyright (c) 2026 MediSoftware GmbH & Co. KG
// See LICENSE for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';

import type {AdminConfig} from '@mattermost/types/config';

import manifest from 'manifest';

import {
    BACKEND_OPENAI,
    BACKEND_PARAKEET,
    DEFAULT_OPENAI_MODEL,
    DEFAULT_OPENAI_URL,
    DEFAULT_PARAKEET_URL,
    backendFromSettings,
    defaultsForBackend,
    stringSetting,
    settingsForBackendSwitch,
} from './transcription_service_settings';

import './transcription_service_section.css';

type Props = {
    config?: Partial<AdminConfig>;
    disabled?: boolean;
    onChange?: (key: string, value: string) => void;
    onSettingChange?: (key: string, value: string) => void;
    informChange?: (key: string, value: string) => void;
    setSaveNeeded?: () => void;
};

type FormState = {
    backend: string;
    url: string;
    apiKey: string;
    model: string;
};

function pluginSettings(config?: Partial<AdminConfig>) {
    return config?.PluginSettings?.Plugins?.[manifest.id] ?? {};
}

function formStateFromConfig(config?: Partial<AdminConfig>): FormState {
    const settings = pluginSettings(config);
    const backend = backendFromSettings(settings);
    const defaults = defaultsForBackend(backend);

    return {
        backend,
        url: stringSetting(settings, 'ParakeetURL', defaults.url),
        apiKey: stringSetting(settings, 'ParakeetAPIKey'),
        model: stringSetting(settings, 'TranscriptionModel', defaults.model),
    };
}

export default function TranscriptionServiceSection(props: Props) {
    const configSnapshot = useMemo(
        () => JSON.stringify(pluginSettings(props.config)),
        [props.config],
    );

    const [form, setForm] = useState<FormState>(() => formStateFromConfig(props.config));

    useEffect(() => {
        setForm(formStateFromConfig(props.config));
    }, [configSnapshot, props.config]);

    const notifyChange = useCallback((key: string, value: string) => {
        const handler = props.onChange ?? props.onSettingChange ?? props.informChange;
        handler?.(key, value);
        props.setSaveNeeded?.();
    }, [props]);

    const setBackend = useCallback((nextBackend: string) => {
        const nextSettings = settingsForBackendSwitch(nextBackend);
        setForm((current) => ({
            ...current,
            backend: nextBackend,
            url: nextSettings.ParakeetURL,
            model: nextSettings.TranscriptionModel,
        }));
        notifyChange('TranscriptionBackend', nextSettings.TranscriptionBackend);
        notifyChange('ParakeetURL', nextSettings.ParakeetURL);
        notifyChange('TranscriptionModel', nextSettings.TranscriptionModel);
    }, [notifyChange]);

    const isParakeet = form.backend === BACKEND_PARAKEET;
    const disabled = Boolean(props.disabled);

    return (
        <div className='transcribe-admin-section'>
            <fieldset className='transcribe-admin-section__backend'>
                <legend className='transcribe-admin-section__legend'>Backend</legend>
                <label
                    className={'transcribe-admin-section__option' + (isParakeet ? ' transcribe-admin-section__option--active' : '')}
                    onClick={() => !disabled && !isParakeet && setBackend(BACKEND_PARAKEET)}
                >
                    <input
                        type='radio'
                        name='transcription-backend'
                        value={BACKEND_PARAKEET}
                        checked={isParakeet}
                        disabled={disabled}
                        onChange={() => setBackend(BACKEND_PARAKEET)}
                    />
                    <span className='transcribe-admin-section__option-title'>Parakeet</span>
                    <span className='transcribe-admin-section__option-help'>Self-hosted ASR on your infrastructure</span>
                </label>
                <label
                    className={'transcribe-admin-section__option' + (!isParakeet ? ' transcribe-admin-section__option--active' : '')}
                    onClick={() => !disabled && isParakeet && setBackend(BACKEND_OPENAI)}
                >
                    <input
                        type='radio'
                        name='transcription-backend'
                        value={BACKEND_OPENAI}
                        checked={!isParakeet}
                        disabled={disabled}
                        onChange={() => setBackend(BACKEND_OPENAI)}
                    />
                    <span className='transcribe-admin-section__option-title'>OpenAI Whisper</span>
                    <span className='transcribe-admin-section__option-help'>Cloud API — audio is sent to OpenAI</span>
                </label>
            </fieldset>

            {isParakeet ? (
                <>
                    <label className='transcribe-admin-section__field'>
                        <span className='transcribe-admin-section__label'>Parakeet Server URL</span>
                        <input
                            className='form-control'
                            type='text'
                            value={form.url}
                            disabled={disabled}
                            placeholder={DEFAULT_PARAKEET_URL}
                            onChange={(e) => {
                                const value = e.target.value;
                                setForm((current) => ({...current, url: value}));
                                notifyChange('ParakeetURL', value);
                            }}
                        />
                        <span className='transcribe-admin-section__help'>Base URL reachable from the Mattermost server, e.g. http://parakeet:5092</span>
                    </label>
                    <label className='transcribe-admin-section__field'>
                        <span className='transcribe-admin-section__label'>Parakeet API Key (optional)</span>
                        <input
                            className='form-control'
                            type='password'
                            value={form.apiKey}
                            disabled={disabled}
                            autoComplete='off'
                            onChange={(e) => {
                                const value = e.target.value;
                                setForm((current) => ({...current, apiKey: value}));
                                notifyChange('ParakeetAPIKey', value);
                            }}
                        />
                        <span className='transcribe-admin-section__help'>Must match PARAKEET_API_KEY on the Parakeet server, if set</span>
                    </label>
                </>
            ) : (
                <>
                    <label className='transcribe-admin-section__field'>
                        <span className='transcribe-admin-section__label'>OpenAI API Key</span>
                        <input
                            className='form-control'
                            type='password'
                            value={form.apiKey}
                            disabled={disabled}
                            autoComplete='off'
                            onChange={(e) => {
                                const value = e.target.value;
                                setForm((current) => ({...current, apiKey: value}));
                                notifyChange('ParakeetAPIKey', value);
                            }}
                        />
                        <span className='transcribe-admin-section__help'>Bearer token for https://api.openai.com</span>
                    </label>
                    <label className='transcribe-admin-section__field'>
                        <span className='transcribe-admin-section__label'>Model</span>
                        <input
                            className='form-control'
                            type='text'
                            value={form.model}
                            disabled={disabled}
                            placeholder={DEFAULT_OPENAI_MODEL}
                            onChange={(e) => {
                                const value = e.target.value;
                                setForm((current) => ({...current, model: value}));
                                notifyChange('TranscriptionModel', value);
                            }}
                        />
                        <span className='transcribe-admin-section__help'>OpenAI Whisper model (default: whisper-1)</span>
                    </label>
                    <p className='transcribe-admin-section__note'>
                        API endpoint: <code>{DEFAULT_OPENAI_URL}/v1/audio/transcriptions</code>
                    </p>
                </>
            )}
        </div>
    );
}
