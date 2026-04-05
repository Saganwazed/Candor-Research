"use client";

import * as Sentry from "@sentry/nextjs";

export default function SentryExamplePage() {
  const throwError = () => {
    throw new Error("Sentry Example Frontend Error");
  };

  return (
    <main style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
        Sentry Example Page
      </h1>
      <p style={{ color: "#666", marginBottom: "2rem" }}>
        Use the buttons below to test your Sentry integration.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

        {/* Frontend Error */}
        <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "1.5rem" }}>
          <h2 style={{ fontWeight: "600", marginBottom: "0.5rem" }}>Frontend Error</h2>
          <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: "1rem" }}>
            Throws an error in the browser and captures it with Sentry.
          </p>
          <button
            onClick={throwError}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#e53e3e",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            Throw Frontend Error
          </button>
        </div>

        {/* Test Log */}
        <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "1.5rem" }}>
          <h2 style={{ fontWeight: "600", marginBottom: "0.5rem" }}>Test Log</h2>
          <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: "1rem" }}>
            Sends a structured log to Sentry using <code>Sentry.logger</code>.
          </p>
          <button
            onClick={() => {
              Sentry.logger.info("User triggered test log", { log_source: "sentry_test" });
              alert("Log sent to Sentry! Check your Logs dashboard.");
            }}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#38a169",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            Send Test Log
          </button>
        </div>

        {/* Capture Message */}
        <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "1.5rem" }}>
          <h2 style={{ fontWeight: "600", marginBottom: "0.5rem" }}>Capture Message</h2>
          <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: "1rem" }}>
            Sends a test message to Sentry without throwing an error.
          </p>
          <button
            onClick={() => {
              Sentry.captureMessage("Test message from Sentry Example Page");
              alert("Message sent to Sentry! Check your dashboard.");
            }}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#3182ce",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            Send Test Message
          </button>
        </div>

        {/* Server Error */}
        <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "1.5rem" }}>
          <h2 style={{ fontWeight: "600", marginBottom: "0.5rem" }}>Server Error</h2>
          <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: "1rem" }}>
            Triggers an error on the server and captures it with Sentry.
          </p>
          <button
            onClick={async () => {
              const res = await fetch("/api/sentry-example-api");
              const data = await res.json();
              alert(JSON.stringify(data));
            }}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#805ad5",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            Trigger Server Error
          </button>
        </div>

      </div>

      <p style={{ marginTop: "2rem", fontSize: "0.85rem", color: "#999" }}>
        Check your{" "}
        <a
          href="https://sagan-chowdhury.sentry.io/issues/"
          target="_blank"
          rel="noreferrer"
          style={{ color: "#3182ce" }}
        >
          Sentry Issues dashboard
        </a>{" "}
        to verify events are captured.
      </p>
    </main>
  );
}
