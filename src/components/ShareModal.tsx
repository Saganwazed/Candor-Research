"use client";

import { useState, useRef, useEffect } from "react";

interface ShareModalProps {
  publicUrl: string;
  articleTitle: string | null;
  onClose: () => void;
  onToggleVisibility: (isPublic: boolean) => Promise<void>;
}

export default function ShareModal({
  publicUrl,
  articleTitle,
  onClose,
  onToggleVisibility,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [toggling, setToggling] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the URL input on mount
  useEffect(() => {
    inputRef.current?.select();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the input text
      inputRef.current?.select();
    }
  }

  async function handleToggle() {
    setToggling(true);
    const newState = !isPublic;
    try {
      await onToggleVisibility(newState);
      setIsPublic(newState);
    } catch {
      // Toggle failed — keep current state
    }
    setToggling(false);
  }

  // Build X/Twitter intent URL
  const tweetText = articleTitle
    ? `I ran a bias analysis on "${articleTitle}" — here's what Candor found:`
    : `I ran a bias analysis on a news article — here's what Candor found:`;

  const tweetUrl =
    `https://twitter.com/intent/tweet` +
    `?text=${encodeURIComponent(tweetText)}` +
    `&url=${encodeURIComponent(publicUrl)}`;

  return (
    <div
      className="share-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Share report"
      id="share-modal"
    >
      <div className="share-modal">
        {/* Header */}
        <div className="share-modal-header">
          <h2 className="share-modal-title">Share report</h2>
          <button
            className="share-modal-close"
            onClick={onClose}
            aria-label="Close share dialog"
            id="btn-share-close"
          >
            ×
          </button>
        </div>

        {/* URL Copy Row */}
        <div className="share-url-row">
          <input
            ref={inputRef}
            type="text"
            className="share-url-input"
            value={publicUrl}
            readOnly
            aria-label="Shareable report URL"
            id="input-share-url"
          />
          <button
            className="btn-copy"
            onClick={handleCopy}
            aria-label={copied ? "Copied" : "Copy link"}
            id="btn-copy-url"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        {/* Share to X Button */}
        <a
          href={tweetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-share-x"
          id="btn-share-x"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Share to X
        </a>

        {/* Privacy Toggle */}
        <div className="share-privacy-row">
          <div className="share-privacy-label">
            <span className="share-privacy-text">
              {isPublic
                ? "Anyone with the link can view"
                : "Link disabled"}
            </span>
            <span className="share-privacy-note">
              This toggle works in your current browser session.
            </span>
          </div>
          <button
            className="share-toggle"
            role="switch"
            aria-checked={isPublic}
            aria-label="Report visibility"
            onClick={handleToggle}
            disabled={toggling}
            id="btn-toggle-visibility"
          >
            <span
              className="share-toggle-track"
              data-active={isPublic ? "true" : "false"}
            >
              <span className="share-toggle-thumb" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
