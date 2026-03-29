"use client";

import type { CredibilityFlag, FlagType } from "@/lib/schema";

interface CredibilityFlagsProps {
  flags: CredibilityFlag[];
}

const FLAG_COLOR_MAP: Record<FlagType, string> = {
  "Unverified Claim": "amber",
  "Missing Context": "amber",
  "Loaded Language": "orange",
  "Anonymous Sourcing": "yellow",
  "Statistical Misuse": "red",
  "False Balance": "orange",
};

export default function CredibilityFlags({ flags }: CredibilityFlagsProps) {
  return (
    <div className="report-section report-reveal report-reveal-delay-2" id="section-credibility-flags">
      <h2 className="section-heading">Credibility flags</h2>

      {flags.length === 0 ? (
        <p className="no-flags-message">
          No significant credibility issues detected.
        </p>
      ) : (
        <div>
          {flags.map((flag, index) => {
            const colorClass = FLAG_COLOR_MAP[flag.flag_type] || "amber";
            return (
              <div className="flag-item" key={index}>
                <span
                  className={`flag-chip flag-chip--${colorClass}`}
                  aria-label={`Flag type: ${flag.flag_type}`}
                >
                  {flag.flag_type}
                </span>
                <p className="flag-description">{flag.description}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
