"use client";

import { useState, useCallback } from "react";
import { usePostHog } from "posthog-js/react";

export default function FeedbackBar() {
  const [selected, setSelected] = useState<"helpful" | "not-helpful" | null>(
    null
  );
  const posthog = usePostHog();

  const submitFeedback = useCallback(
    async (useful: boolean) => {
      const sessionId =
        sessionStorage.getItem("candor_session_id") || generateSessionId();
      sessionStorage.setItem("candor_session_id", sessionId);

      // Track feedback with PostHog
      posthog.capture("feedback_submitted", {
        feedback_type: useful ? "helpful" : "not_helpful",
      });

      try {
        await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId, useful }),
        });
      } catch {
        // Silent failure for feedback — not critical
      }
    },
    [posthog]
  );

  function handleSelect(choice: "helpful" | "not-helpful") {
    if (selected) return; // Already selected
    setSelected(choice);
    submitFeedback(choice === "helpful");
  }

  return (
    <div className="feedback-bar" id="feedback-bar">
      <span className="feedback-label">Was this report useful?</span>
      <button
        className="feedback-button"
        data-selected={selected === "helpful" ? "true" : "false"}
        data-dimmed={selected && selected !== "helpful" ? "true" : "false"}
        onClick={() => handleSelect("helpful")}
        disabled={selected !== null}
        aria-label="Report was helpful"
        id="btn-feedback-helpful"
      >
        👍 Helpful
      </button>
      <button
        className="feedback-button"
        data-selected={selected === "not-helpful" ? "true" : "false"}
        data-dimmed={selected && selected !== "not-helpful" ? "true" : "false"}
        onClick={() => handleSelect("not-helpful")}
        disabled={selected !== null}
        aria-label="Report was not helpful"
        id="btn-feedback-not-helpful"
      >
        👎 Not helpful
      </button>
    </div>
  );
}

function generateSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for very old browsers
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
