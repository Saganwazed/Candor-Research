"use client";

import { Claim } from "@/lib/claim-verification-schema";
import { useState } from "react";

interface Props {
  claim: Claim;
}

export default function ClaimCard({ claim }: Props) {
  const [expanded, setExpanded] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Supported":
        return "bg-green-100 text-green-900 border-green-300";
      case "Contradicted":
        return "bg-red-100 text-red-900 border-red-300";
      case "Partially Supported":
        return "bg-yellow-100 text-yellow-900 border-yellow-300";
      case "Unclear":
        return "bg-gray-100 text-gray-900 border-gray-300";
      default:
        return "bg-gray-100 text-gray-900 border-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Supported":
        return "✓";
      case "Contradicted":
        return "✗";
      case "Partially Supported":
        return "◐";
      case "Unclear":
        return "?";
      default:
        return "?";
    }
  };

  return (
    <div className="border border-black/10 rounded p-4 hover:bg-black/2 transition">
      <div className="flex items-start gap-3 justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`inline-flex items-center justify-center w-6 h-6 rounded border font-medium text-sm ${getStatusColor(claim.verification_status)}`}
            >
              {getStatusIcon(claim.verification_status)}
            </span>
            <span
              className={`text-xs font-medium px-2 py-1 rounded border ${getStatusColor(claim.verification_status)}`}
            >
              {claim.verification_status}
            </span>
            <span className="text-xs text-black/60 font-medium">
              {claim.confidence}% confidence
            </span>
          </div>

          <p className="text-sm mb-2">{claim.text}</p>

          {claim.sources.length > 0 && (
            <div className="text-xs text-black/60 mb-2">
              <span className="font-medium">Sources:</span>{" "}
              {claim.sources.join(", ")}
            </div>
          )}
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xl text-black/40 hover:text-black/60 flex-shrink-0 ml-4"
          aria-label="Toggle claim details"
        >
          {expanded ? "−" : "+"}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-black/10 space-y-3">
          {claim.reasoning && (
            <div>
              <h4 className="text-xs font-medium text-black/70 mb-1">
                Reasoning
              </h4>
              <p className="text-sm text-black/60">{claim.reasoning}</p>
            </div>
          )}

          {claim.supporting_evidence && claim.supporting_evidence.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-green-700 mb-1">
                Supporting Evidence
              </h4>
              <ul className="text-sm text-black/60 space-y-1 list-disc list-inside">
                {claim.supporting_evidence.map((evidence, idx) => (
                  <li key={idx}>{evidence}</li>
                ))}
              </ul>
            </div>
          )}

          {claim.conflicting_evidence &&
            claim.conflicting_evidence.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-red-700 mb-1">
                  Conflicting Evidence
                </h4>
                <ul className="text-sm text-black/60 space-y-1 list-disc list-inside">
                  {claim.conflicting_evidence.map((evidence, idx) => (
                    <li key={idx}>{evidence}</li>
                  ))}
                </ul>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
