"use client";

import { useState } from "react";

interface Conflict {
  claim_1: string;
  claim_2: string;
  conflict_description: string;
  framing_differences?: string[];
}

interface Props {
  conflicts: Conflict[];
}

export default function ClaimConflicts({ conflicts }: Props) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const toggleExpanded = (idx: number) => {
    setExpanded((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  return (
    <div className="space-y-2">
      {conflicts.map((conflict, idx) => (
        <div key={idx} className="space-y-2">
          <button
            onClick={() => toggleExpanded(idx)}
            className="w-full text-left text-sm hover:bg-orange-100/50 p-2 rounded transition flex items-start gap-2"
          >
            <span className="text-orange-700 flex-shrink-0">
              {expanded[idx] ? "−" : "+"}
            </span>
            <div className="flex-1">
              <p className="text-orange-900 font-medium">
                Conflicting claims found
              </p>
              <p className="text-orange-800/70 text-xs mt-1">
                {conflict.conflict_description}
              </p>
            </div>
          </button>

          {expanded[idx] && (
            <div className="pl-4 pt-2 space-y-2 text-xs">
              <div className="bg-white/50 p-2 rounded border border-orange-100">
                <p className="font-medium text-orange-900 mb-1">Claim 1:</p>
                <p className="text-orange-800">{conflict.claim_1}</p>
              </div>

              <div className="bg-white/50 p-2 rounded border border-orange-100">
                <p className="font-medium text-orange-900 mb-1">Claim 2:</p>
                <p className="text-orange-800">{conflict.claim_2}</p>
              </div>

              {conflict.framing_differences &&
                conflict.framing_differences.length > 0 && (
                  <div className="bg-white/50 p-2 rounded border border-orange-100">
                    <p className="font-medium text-orange-900 mb-1">
                      Framing Differences:
                    </p>
                    <ul className="text-orange-800 space-y-1 list-disc list-inside">
                      {conflict.framing_differences.map((diff, diffIdx) => (
                        <li key={diffIdx}>{diff}</li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
