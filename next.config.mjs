import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // 'unsafe-eval' removed — only needed in dev mode (Next.js HMR).
      // 'unsafe-inline' kept because Next.js requires it for inline styles/scripts.
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      // PostHog analytics + Sentry ingest
      "connect-src 'self' https://us.i.posthog.com https://us-assets.i.posthog.com https://o4511163749695488.ingest.us.sentry.io",
      "font-src 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["jsdom", "@mozilla/readability"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options
  org: "sagan-chowdhury",
  project: "javascript-nextjs",

  // Only print logs for uploading source maps related to errors
  silent: true,

  // Hides source maps from generated client bundles
  hideSourceMaps: true,
});
