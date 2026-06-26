// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

const BAR_COUNT = 8;

type Props = {
    level: number;
    accentColor: string;
    inactiveColor: string;
};

export default function LevelMeter({level, accentColor, inactiveColor}: Props): React.ReactElement {
    const clampedLevel = Math.max(0, Math.min(1, level));

    return (
        <div
            className='recording-modal__meter'
            role='meter'
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(clampedLevel * 100)}
            aria-label='Microphone level'
        >
            <div className='recording-modal__meter-bars'>
                {Array.from({length: BAR_COUNT}, (_, index) => {
                    const threshold = (index + 1) / BAR_COUNT;
                    const active = clampedLevel >= threshold - 0.08;
                    return (
                        <span
                            key={index}
                            className={'recording-modal__meter-bar' + (active ? ' recording-modal__meter-bar--active' : '')}
                            style={{
                                backgroundColor: active ? accentColor : inactiveColor,
                                height: `${30 + ((index + 1) / BAR_COUNT) * 70}%`,
                            }}
                        />
                    );
                })}
            </div>
            <div className='recording-modal__meter-track'>
                <div
                    className='recording-modal__meter-fill'
                    style={{
                        width: `${clampedLevel * 100}%`,
                        backgroundColor: accentColor,
                    }}
                />
            </div>
        </div>
    );
}
