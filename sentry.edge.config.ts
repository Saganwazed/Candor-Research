import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://6afb47272e805e7f887ab7750c181a32@o4511163749695488.ingest.us.sentry.io/4511163751464960",

  // Tracing
  tracesSampleRate: 1.0,

  // Environment
  environment: process.env.NODE_ENV,

  // Release (optional, but recommended)
  release: process.env.NEXT_PUBLIC_APP_VERSION || "unknown",
});
