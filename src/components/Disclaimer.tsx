"use client";

import { useEffect, useState } from "react";

export default function Disclaimer() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Show disclaimer once per session
    const dismissed = sessionStorage.getItem("candor_disclaimer_seen");
    if (!dismissed) {
      setShow(true);
    }
  }, []);

  function handleDismiss() {
    sessionStorage.setItem("candor_disclaimer_seen", "true");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="content-warning report-reveal" role="note" aria-label="AI analysis disclaimer" id="disclaimer">
      <p className="content-warning-text">
        Candor uses AI to analyze article text for bias signals, credibility
        concerns, and persuasive framing. Results are generated automatically and
        should be treated as a starting point for critical reading, not a
        definitive verdict. AI analysis can miss context, misinterpret tone, or
        reflect its own training biases. Always read the original source and form
        your own conclusions.
      </p>
      <button
        className="btn-primary"
        onClick={handleDismiss}
        style={{ marginTop: "16px", padding: "8px 20px" }}
        aria-label="Dismiss disclaimer"
        id="btn-dismiss-disclaimer"
      >
        Understood
      </button>
    </div>
  );
}
