/**
 * Version of this web app, resolved at build time by vite.config.ts from the
 * release tag or the VITE_APP_VERSION the Docker build passes in.
 */
export const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? 'unknown';
