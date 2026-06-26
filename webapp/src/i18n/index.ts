// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';

import type {GlobalState} from '@mattermost/types/store';

import de from 'i18n/de.json';
import en from 'i18n/en.json';

type MessageCatalog = Record<string, string>;

const catalogs: Record<string, MessageCatalog> = {
    de: de as MessageCatalog,
    en: en as MessageCatalog,
};

export function getTranslationsForLocale(locale: string): MessageCatalog {
    if (catalogs[locale]) {
        return catalogs[locale];
    }

    const language = locale.split(/[-_]/)[0];
    if (catalogs[language]) {
        return catalogs[language];
    }

    return catalogs.en;
}

export function getLocaleFromState(state: GlobalState): string {
    const extendedState = state as GlobalState & {
        entities?: {
            general?: {
                config?: {
                    DefaultClientLocale?: string;
                };
            };
            preferences?: {
                myPreferences?: Record<string, {value?: string}>;
            };
        };
    };

    const userId = getCurrentUserId(state);
    const languagePreference = userId ?
        extendedState.entities?.preferences?.myPreferences?.[`${userId}--language`]?.value :
        '';

    if (languagePreference) {
        return languagePreference;
    }

    return extendedState.entities?.general?.config?.DefaultClientLocale || 'en';
}

export function getMessage(
    locale: string,
    id: string,
    defaultMessage: string,
    values?: Record<string, string>,
): string {
    const catalog = getTranslationsForLocale(locale);
    let message = catalog[id] || catalogs.en[id] || defaultMessage;

    if (values) {
        for (const [key, value] of Object.entries(values)) {
            message = message.replaceAll(`{${key}}`, value);
        }
    }

    return message;
}

export function getMessageFromState(
    state: GlobalState,
    id: string,
    defaultMessage: string,
    values?: Record<string, string>,
): string {
    return getMessage(getLocaleFromState(state), id, defaultMessage, values);
}
