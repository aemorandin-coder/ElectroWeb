// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: 1,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    // DISABLED: Session Replay causes "Cannot read properties of null (reading 'ref')" errors
    // because it modifies the DOM in a way that conflicts with React's reconciliation
    replaysOnErrorSampleRate: 0,
    replaysSessionSampleRate: 0,

    // NO replay integration - removed to prevent ref errors
    integrations: [],

    // Configure which errors to ignore
    ignoreErrors: [
        // Random plugins/extensions
        "top.GLOBALS",
        // Facebook borance
        "fb_xd_fragment",
        // Network errors
        "Failed to fetch",
        "NetworkError",
        "Load failed",
        // Browser extensions
        "ResizeObserver loop",
        // Ref errors from Sentry replay (in case any slip through)
        "Cannot read properties of null (reading 'ref')",
    ],

    // Set environment
    environment: process.env.NODE_ENV,
});
