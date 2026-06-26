// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export type RecordingResult = {
    blob: Blob;
    duration: number;
    filename: string;
};

function getSupportedMimeType(): string {
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
    for (const mimeType of candidates) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
            return mimeType;
        }
    }
    return '';
}

function extensionForMimeType(mimeType: string): string {
    if (mimeType.includes('mp4')) {
        return 'm4a';
    }
    if (mimeType.includes('ogg')) {
        return 'ogg';
    }
    return 'webm';
}

export class AudioRecorder {
    private mediaRecorder: MediaRecorder | null = null;
    private stream: MediaStream | null = null;
    private chunks: Blob[] = [];
    private mimeType = '';
    private startTime = 0;
    private updateTimer: ReturnType<typeof setInterval> | null = null;
    private maxDurationTimer: ReturnType<typeof setTimeout> | null = null;
    private onUpdate: ((duration: number) => void) | null = null;
    private onMaxDuration: (() => void) | null = null;

    async start(
        maxDurationSeconds: number,
        onUpdate: (duration: number) => void,
        onMaxDuration: () => void,
    ): Promise<void> {
        this.onUpdate = onUpdate;
        this.onMaxDuration = onMaxDuration;
        this.chunks = [];

        this.stream = await navigator.mediaDevices.getUserMedia({audio: true});
        this.mimeType = getSupportedMimeType();

        const options = this.mimeType ? {mimeType: this.mimeType} : undefined;
        this.mediaRecorder = new MediaRecorder(this.stream, options);
        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.chunks.push(event.data);
            }
        };

        this.mediaRecorder.start(250);
        this.startTime = Date.now();

        this.updateTimer = setInterval(() => {
            if (this.onUpdate) {
                this.onUpdate(Date.now() - this.startTime);
            }
        }, 200);

        this.maxDurationTimer = setTimeout(() => {
            if (this.onMaxDuration) {
                this.onMaxDuration();
            }
        }, maxDurationSeconds * 1000);
    }

    private clearTimers(): void {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
        if (this.maxDurationTimer) {
            clearTimeout(this.maxDurationTimer);
            this.maxDurationTimer = null;
        }
    }

    private stopTracks(): void {
        if (this.stream) {
            this.stream.getTracks().forEach((track) => track.stop());
            this.stream = null;
        }
    }

    private async finalizeRecording(): Promise<RecordingResult> {
        const duration = Date.now() - this.startTime;
        const type = this.mimeType || this.chunks[0]?.type || 'audio/webm';
        const blob = new Blob(this.chunks, {type});
        const filename = `recording-${Date.now()}.${extensionForMimeType(type)}`;

        this.clearTimers();
        this.stopTracks();
        this.onUpdate = null;
        this.onMaxDuration = null;
        this.mediaRecorder = null;
        this.chunks = [];

        return {blob, duration, filename};
    }

    async stop(): Promise<RecordingResult> {
        if (!this.mediaRecorder) {
            throw new Error('Recorder is not initialized');
        }

        if (this.mediaRecorder.state === 'inactive') {
            return this.finalizeRecording();
        }

        return new Promise((resolve, reject) => {
            this.mediaRecorder!.onstop = () => {
                this.finalizeRecording().then(resolve).catch(reject);
            };
            this.mediaRecorder!.onerror = () => {
                reject(new Error('Recording failed'));
            };
            this.mediaRecorder!.stop();
        });
    }

    cancel(): void {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        this.clearTimers();
        this.stopTracks();
        this.onUpdate = null;
        this.onMaxDuration = null;
        this.mediaRecorder = null;
        this.chunks = [];
    }
}
