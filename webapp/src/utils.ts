// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import manifest from 'manifest';

export function getPluginURL(): string {
    if (window.basename) {
        return `${window.basename}/plugins/${manifest.id}`;
    }
    return `/plugins/${manifest.id}`;
}
