"use client";

import { useState, useRef } from "react";

interface InputSectionProps {
  onAnalyze: (mode: "url" | "text", value: string) => void;
  isLoading: boolean;
}

export default function InputSection({
  onAnalyze,
  isLoading,
}: InputSectionProps) {
  const [mode, setMode] = useState<"url" | "text">("url");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function validate(): boolean {
    if (mode === "url") {
      if (!value.trim() || !/^https?:\/\/.+\..+/.test(value.trim())) {
        setError(
          "That doesn’t look like a valid URL. Try pasting the article text instead."
        );
        return false;
      }
    } else {
      if (value.trim().length < 150) {
        setError(
          "Paste the full article text — this looks too short."
        );
        return false;
      }
    }
    setError("");
    return true;
  }

  function handleAnalyze() {
    if (validate()) {
      onAnalyze(mode, value.trim());
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && mode === "url" && !e.shiftKey) {
      e.preventDefault();
      handleAnalyze();
    }
  }

  function switchMode(newMode: "url" | "text") {
    setMode(newMode);
    setError("");
    // Focus the new input after mode switch
    setTimeout(() => {
      if (newMode === "url") {
        inputRef.current?.focus();
      } else {
        textareaRef.current?.focus();
      }
    }, 50);
  }

  return (
    <div>
      {/* Tab Switcher */}
      <div className="tab-switcher" role="tablist" aria-label="Input mode">
        <div className="tab-switcher-indicator" data-active={mode} />
        <button
          className="tab-button"
          role="tab"
          id="tab-url"
          aria-selected={mode === "url"}
          aria-controls="panel-url"
          data-active={mode === "url" ? "true" : "false"}
          onClick={() => switchMode("url")}
          tabIndex={mode === "url" ? 0 : -1}
        >
          URL
        </button>
        <button
          className="tab-button"
          role="tab"
          id="tab-text"
          aria-selected={mode === "text"}
          aria-controls="panel-text"
          data-active={mode === "text" ? "true" : "false"}
          onClick={() => switchMode("text")}
          tabIndex={mode === "text" ? 0 : -1}
        >
          Text
        </button>
      </div>

      {/* Input Area */}
      <div className="input-area">
        {mode === "url" ? (
          <div role="tabpanel" id="panel-url" aria-labelledby="tab-url">
            <input
              ref={inputRef}
              type="url"
              className="input-field"
              placeholder="Paste a news article URL…"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError("");
              }}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              aria-label="Article URL"
              id="input-url"
            />
          </div>
        ) : (
          <div role="tabpanel" id="panel-text" aria-labelledby="tab-text">
            <textarea
              ref={textareaRef}
              className="input-field"
              placeholder="Paste the full article text here…"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError("");
              }}
              disabled={isLoading}
              maxLength={50000}
              aria-label="Article text"
              id="input-text"
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="error-message" role="alert" id="input-error">
            {error}
          </div>
        )}

        {/* Analyze Button */}
        <button
          className="btn-primary"
          onClick={handleAnalyze}
          disabled={isLoading || !value.trim()}
          aria-label="Analyze article"
          id="btn-analyze"
        >
          {isLoading ? "Analyzing…" : "Analyze"}
        </button>
      </div>
    </div>
  );
}
