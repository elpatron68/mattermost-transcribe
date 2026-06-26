// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export type RecordingUpdate = {
    duration: number;
    level: number;
};

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
    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private chunks: Blob[] = [];
    private mimeType = '';
    private startTime = 0;
    private updateTimer: ReturnType<typeof setInterval> | null = null;
    private maxDurationTimer: ReturnType<typeof setTimeout> | null = null;
    private onUpdate: ((update: RecordingUpdate) => void) | null = null;
    private onMaxDuration: (() => void) | null = null;

    async start(
        maxDurationSeconds: number,
        onUpdate: (update: RecordingUpdate) => void,
        onMaxDuration: () => void,
    ): Promise<void> {
        this.onUpdate = onUpdate;
        this.onMaxDuration = onMaxDuration;
        this.chunks = [];

        this.stream = await navigator.mediaDevices.getUserMedia({audio: true});
        this.setupLevelMonitoring(this.stream);
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
                this.onUpdate({
                    duration: Date.now() - this.startTime,
                    level: this.measureLevel(),
                });
            }
        }, 100);

        this.maxDurationTimer = setTimeout(() => {
            if (this.onMaxDuration) {
                this.onMaxDuration();
            }
        }, maxDurationSeconds * 1000);
    }

    private setupLevelMonitoring(stream: MediaStream): void {
        this.audioContext = new AudioContext();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 512;
        this.analyser.smoothingTimeConstant = 0.5;

        const source = this.audioContext.createMediaStreamSource(stream);
        source.connect(this.analyser);
    }

    private measureLevel(): number {
        if (!this.analyser) {
            return 0;
        }

        const buffer = new Uint8Array(this.analyser.fftSize);
        this.analyser.getByteTimeDomainData(buffer);

        let sumSquares = 0;
        for (let i = 0; i < buffer.length; i++) {
            const sample = (buffer[i] - 128) / 128;
            sumSquares += sample * sample;
        }

        const rms = Math.sqrt(sumSquares / buffer.length);
        return Math.min(1, rms * 6);
    }

    private teardownLevelMonitoring(): void {
        if (this.audioContext) {
            void this.audioContext.close();
        }
        this.audioContext = null;
        this.analyser = null;
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
        this.teardownLevelMonitoring();
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
