// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

declare module 'react-intl' {
    import type React from 'react';

    export type MessageDescriptor = {
        id: string;
        defaultMessage?: string;
        description?: string;
    };

    export const FormattedMessage: React.FC<MessageDescriptor & {
        values?: Record<string, React.ReactNode>;
    }>;
}
