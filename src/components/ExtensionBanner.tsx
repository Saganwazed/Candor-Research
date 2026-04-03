"use client";

import { useState, useEffect } from "react";

export default function ExtensionBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Don't show if already dismissed this session
    const wasDismissed = sessionStorage.getItem("candor_ext_dismissed");
    if (!wasDismissed) {
      setDismissed(false);
    }
  }, []);

  function handleDismiss() {
    setDismissed(true);
    sessionStorage.setItem("candor_ext_dismissed", "true");
  }

  if (dismissed) return null;

  return (
    <div className="extension-banner" id="extension-banner">
      <div className="extension-banner-content">
        <div className="extension-banner-icon">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </div>
        <div className="extension-banner-text">
          <p className="extension-banner-title">
            Analyze any page — even behind paywalls
          </p>
          <p className="extension-banner-subtitle">
            Get the Candor Chrome extension for one-click bias reports on any article.
          </p>
        </div>
      </div>
      <div className="extension-banner-actions">
        <a
          href="https://github.com/Saganwazed/Candor/tree/main/extension"
          target="_blank"
          rel="noopener noreferrer"
          className="extension-banner-btn"
          id="btn-get-extension"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ marginRight: 6, verticalAlign: -1 }}
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Get the extension
        </a>
        <button
          className="extension-banner-dismiss"
          onClick={handleDismiss}
          aria-label="Dismiss"
          id="btn-dismiss-extension"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
