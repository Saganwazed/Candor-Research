"use client";

import { useState, useEffect, useRef } from "react";

const LABELS = [
  "Reading the article…",
  "Extracting claims and sources…",
  "Building claim graph…",
  "Reasoning over evidence…",
  "Writing analysis report…",
];

const CYCLE_INTERVAL = 2000;

interface LoadingStateProps {
  customMessage?: string;
}

export default function LoadingState({ customMessage }: LoadingStateProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % LABELS.length);
        setIsFading(false);
      }, 200);
    }, CYCLE_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="loading-container" role="status" aria-live="polite" id="loading-state">
      <div className="spinner" aria-hidden="true" />
      <div className="loading-label">
        <span
          className={`loading-label-text ${!customMessage && isFading ? "fading" : ""}`}
          aria-label={customMessage || LABELS[currentIndex]}
        >
          {customMessage || LABELS[currentIndex]}
        </span>
      </div>
    </div>
  );
}
