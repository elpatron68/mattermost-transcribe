// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {FormattedMessage} from 'react-intl';
import {changeOpacity} from 'mattermost-redux/utils/theme_utils';

import LevelMeter from './level_meter';
import './root.css';

type Props = {
    visible: boolean;
    duration: number;
    level: number;
    isLoading: boolean;
    transcriptionText: string;
    channelId: string;
    rootId: string;
    cancel: () => void;
    stopAndTranscribe: (channelId: string, rootId: string) => void;
    updateTranscriptionText: (text: string) => void;
    sendTranscription: (channelId: string, rootId: string) => void;
    theme: {
        centerChannelBg: string;
        centerChannelColor: string;
        linkColor: string;
        errorTextColor: string;
    };
};

function pad2(value: number): string {
    const n = value | 0;
    return n < 10 ? `0${n}` : `${Math.min(n, 99)}`;
}

function pad2NoZero(value: number): string {
    const n = value | 0;
    return n < 10 ? `${n}` : `${Math.min(n, 99)}`;
}

function formatDuration(durationMs: number): string {
    const secs = Math.round(durationMs / 1000);
    return `${pad2NoZero(Math.floor(secs / 60))}:${pad2(secs % 60)}`;
}

export default class Root extends React.PureComponent<Props> {
    private handleStop = (): void => {
        this.props.stopAndTranscribe(this.props.channelId, this.props.rootId);
    };

    private handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
        this.props.updateTranscriptionText(event.target.value);
    };

    private handleSend = (): void => {
        this.props.sendTranscription(this.props.channelId, this.props.rootId);
    };

    private renderReview(): React.ReactNode {
        const style = getStyle(this.props.theme);
        const isSending = this.props.isLoading;
        const canSend = this.props.transcriptionText.trim().length > 0 && !isSending;

        return (
            <>
                <div className='recording-modal__header'>
                    <span className='recording-modal__label'>
                        <FormattedMessage
                            id='transcribe.modal.review'
                            defaultMessage='Review transcription'
                        />
                    </span>
                </div>

                <textarea
                    className='recording-modal__textarea'
                    style={style.textarea}
                    value={this.props.transcriptionText}
                    onChange={this.handleTextChange}
                    disabled={isSending}
                    rows={5}
                    aria-label='Transcription'
                />

                <div className='recording-modal__actions'>
                    {isSending ? (
                        <span className='recording-modal__status'>
                            <FormattedMessage
                                id='transcribe.modal.sending'
                                defaultMessage='Sending...'
                            />
                        </span>
                    ) : (
                        <>
                            <button
                                type='button'
                                className='recording-modal__button'
                                style={style.button}
                                onClick={this.props.cancel}
                            >
                                <FormattedMessage
                                    id='transcribe.modal.discard'
                                    defaultMessage='Discard'
                                />
                            </button>
                            <button
                                type='button'
                                className='recording-modal__button'
                                style={style.button}
                                onClick={this.handleSend}
                                disabled={!canSend}
                            >
                                <FormattedMessage
                                    id='transcribe.modal.send'
                                    defaultMessage='Send'
                                />
                            </button>
                        </>
                    )}
                </div>
            </>
        );
    }

    private renderRecording(): React.ReactNode {
        const style = getStyle(this.props.theme);
        const isRecording = !this.props.isLoading;
        const pulseOpacity = 0.45 + (this.props.level * 0.55);

        return (
            <>
                <div className='recording-modal__header'>
                    <span
                        className='recording-modal__icon'
                        style={isRecording ? {opacity: pulseOpacity} : undefined}
                        aria-hidden='true'
                    >
                        ●
                    </span>
                    <span className='recording-modal__duration'>
                        {formatDuration(this.props.duration)}
                    </span>
                    {isRecording && (
                        <span className='recording-modal__label'>
                            <FormattedMessage
                                id='transcribe.modal.recording'
                                defaultMessage='Recording'
                            />
                        </span>
                    )}
                </div>

                {isRecording && (
                    <LevelMeter
                        level={this.props.level}
                        accentColor={this.props.theme.errorTextColor || '#d24b4e'}
                        inactiveColor={changeOpacity(this.props.theme.centerChannelColor, 0.15)}
                    />
                )}

                <div className='recording-modal__actions'>
                    {this.props.isLoading ? (
                        <span className='recording-modal__status'>
                            <FormattedMessage
                                id='transcribe.modal.transcribing'
                                defaultMessage='Transcribing...'
                            />
                        </span>
                    ) : (
                        <>
                            <button
                                type='button'
                                className='recording-modal__button'
                                style={style.button}
                                onClick={this.props.cancel}
                            >
                                <FormattedMessage
                                    id='transcribe.modal.cancel'
                                    defaultMessage='Cancel'
                                />
                            </button>
                            <button
                                type='button'
                                className='recording-modal__button'
                                style={style.button}
                                onClick={this.handleStop}
                            >
                                <FormattedMessage
                                    id='transcribe.modal.stop'
                                    defaultMessage='Stop & Transcribe'
                                />
                            </button>
                        </>
                    )}
                </div>
            </>
        );
    }

    render(): React.ReactNode {
        if (!this.props.visible) {
            return null;
        }

        const style = getStyle(this.props.theme);
        const isReviewing = this.props.transcriptionText.length > 0;

        return (
            <div style={style.overlay}>
                <div
                    style={style.panel}
                    className={'recording-modal__panel' + (isReviewing ? ' recording-modal__panel--review' : '')}
                >
                    {isReviewing ? this.renderReview() : this.renderRecording()}
                </div>
            </div>
        );
    }
}

function getStyle(theme: Props['theme']) {
    return {
        overlay: {
            position: 'absolute' as const,
            display: 'flex',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 2000,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
        panel: {
            backgroundColor: theme.centerChannelBg,
            color: theme.centerChannelColor,
            border: `1px solid ${changeOpacity(theme.centerChannelColor, 0.1)}`,
        },
        button: {
            color: theme.linkColor,
        },
        textarea: {
            color: theme.centerChannelColor,
            backgroundColor: theme.centerChannelBg,
            border: `1px solid ${changeOpacity(theme.centerChannelColor, 0.16)}`,
        },
    };
}
