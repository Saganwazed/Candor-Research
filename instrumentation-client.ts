import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://6afb47272e805e7f887ab7750c181a32@o4511163749695488.ingest.us.sentry.io/4511163751464960",

  // Tracing
  tracesSampleRate: 1.0,

  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Environment
  environment: process.env.NODE_ENV,

  // Release (optional, but recommended)
  release: process.env.NEXT_PUBLIC_APP_VERSION || "unknown",

  // Integrations
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    // Send console.log, console.warn, and console.error calls as logs to Sentry
    Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
  ],

  // Enable logs to be sent to Sentry
  enableLogs: true,
});

// Required for tracing navigations in App Router
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
