import browserPolyfill from 'webextension-polyfill';

export const browserApi = browserPolyfill;
export const runtime = browserPolyfill.runtime;
export const storage = browserPolyfill.storage;
export const tabs = browserPolyfill.tabs;
