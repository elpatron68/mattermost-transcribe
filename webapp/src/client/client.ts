// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from 'mattermost-redux/client';

import {AudioRecorder, type RecordingResult} from 'recorder';
import {getPluginURL} from 'utils';

type ClientConfig = {
    maxRecordingDuration: number;
};

export default class Client {
    private recorder = new AudioRecorder();
    private cachedConfig: ClientConfig | null = null;
    private pendingRecording: RecordingResult | null = null;

    async loadConfig(): Promise<ClientConfig> {
        if (this.cachedConfig) {
            return this.cachedConfig;
        }

        const response = await fetch(`${getPluginURL()}/api/v1/config`, {
            headers: Client4.getOptions({method: 'get'}).headers,
        });

        if (!response.ok) {
            throw new Error('Failed to load plugin configuration');
        }

        this.cachedConfig = await response.json() as ClientConfig;
        return this.cachedConfig;
    }

    async startRecording(
        onUpdate: (duration: number, level: number) => void,
        onMaxDuration: () => void,
    ): Promise<void> {
        const config = await this.loadConfig();
        this.pendingRecording = null;
        await this.recorder.start(
            config.maxRecordingDuration,
            ({duration, level}) => onUpdate(duration, level),
            onMaxDuration,
        );
    }

    cancelRecording(): void {
        this.pendingRecording = null;
        this.recorder.cancel();
    }

    async stopRecording(): Promise<RecordingResult> {
        if (this.pendingRecording) {
            const recording = this.pendingRecording;
            this.pendingRecording = null;
            return recording;
        }

        const recording = await this.recorder.stop();
        this.pendingRecording = recording;
        return recording;
    }

    async captureRecordingAtMaxDuration(): Promise<RecordingResult> {
        const recording = await this.recorder.stop();
        this.pendingRecording = recording;
        return recording;
    }

    async transcribe(recording: RecordingResult): Promise<string> {
        const formData = new FormData();
        formData.append('audio', recording.blob, recording.filename);

        const response = await fetch(`${getPluginURL()}/api/v1/transcribe`, {
            method: 'POST',
            headers: Client4.getOptions({method: 'post'}).headers,
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Transcription failed');
        }

        const data = await response.json() as {text: string};
        return data.text;
    }

    async createTextPost(channelId: string, rootId: string, message: string): Promise<void> {
        await Client4.createPost({
            channel_id: channelId,
            root_id: rootId,
            message,
        });
    }

    async createEphemeralError(channelId: string, userId: string, message: string): Promise<void> {
        await Client4.createPost({
            user_id: userId,
            channel_id: channelId,
            message,
            type: 'system_ephemeral',
        });
    }
}
