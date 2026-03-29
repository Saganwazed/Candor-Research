"use client";

import { useState, useEffect, useRef } from "react";

const LABELS = [
  "Reading the article\u2026",
  "Checking for bias signals\u2026",
  "Writing your report\u2026",
];

const CYCLE_INTERVAL = 2000;

export default function LoadingState() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % LABELS.length);
        setIsFading(false);
      }, 200); // match the CSS cross-fade duration
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
          className={`loading-label-text ${isFading ? "fading" : ""}`}
          aria-label={LABELS[currentIndex]}
        >
          {LABELS[currentIndex]}
        </span>
      </div>
    </div>
  );
}
