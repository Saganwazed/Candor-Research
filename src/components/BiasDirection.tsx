"use client";

import { useEffect, useState } from "react";
import type { BiasDirection as BiasDirectionType } from "@/lib/schema";

interface BiasDirectionProps {
  direction: BiasDirectionType;
  justification: string;
}

const POSITION_MAP: Record<BiasDirectionType, number> = {
  Left: 4,
  "Center-Left": 28,
  Center: 50,
  "Center-Right": 72,
  Right: 96,
  Unclear: 50,
};

export default function BiasDirection({
  direction,
  justification,
}: BiasDirectionProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger the spectrum bar animation after mount
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const position = POSITION_MAP[direction];

  return (
    <div className="report-section report-reveal report-reveal-delay-1" id="section-bias-direction">
      <h2 className="section-heading">Bias direction</h2>

      <div className="spectrum-container">
        <div className="spectrum-labels">
          <span>Left</span>
          <span>Right</span>
        </div>
        <div
          className="spectrum-track"
          role="img"
          aria-label={`Bias spectrum showing ${direction} position`}
        >
          <div
            className="spectrum-marker"
            style={{ left: mounted ? `calc(${position}% - 7px)` : "calc(50% - 7px)" }}
          />
        </div>
      </div>

      <div className="bias-label">{direction}</div>
      <p className="bias-justification">{justification}</p>
    </div>
  );
}
