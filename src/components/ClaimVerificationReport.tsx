"use client";

import type { ClaimVerificationReport } from "@/lib/claim-verification-schema";
import ClaimCard from "./ClaimCard";
import ClaimConflicts from "./ClaimConflicts";
import ClaimGraphVisualization from "./ClaimGraphVisualization";
import { useState } from "react";

interface Props {
  report: ClaimVerificationReport;
}

export default function ClaimVerificationReport({ report }: Props) {
  const [showGraph, setShowGraph] = useState(false);

  const supportedClaimsCount = report.claims.filter(
    (c) => c.verification_status === "Supported"
  ).length;
  const contradictedClaimsCount = report.claims.filter(
    (c) => c.verification_status === "Contradicted"
  ).length;

  return (
    <div className="claim-verification-report space-y-6">
      <div className="border-t border-black/10 pt-6 mt-6">
        <h2 className="text-lg font-serif mb-4">Claim Verification</h2>

        <div className="space-y-4 mb-6">
          <p className="text-sm text-black/70">{report.summary}</p>

          {report.key_conflicts.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded p-4">
              <p className="text-sm font-medium text-orange-900 mb-2">
                ⚠️ {report.key_conflicts.length} conflicting claim
                {report.key_conflicts.length > 1 ? "s" : ""} found
              </p>
              <ClaimConflicts conflicts={report.key_conflicts} />
            </div>
          )}
        </div>

        <div className="flex gap-4 mb-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-600"></span>
            <span>{supportedClaimsCount} supported</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-600"></span>
            <span>{contradictedClaimsCount} contradicted</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-gray-400"></span>
            <span>
              {report.claims.filter((c) => c.verification_status === "Unclear")
                .length}{" "}
              unclear
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowGraph(!showGraph)}
          className="text-sm font-medium text-blue-600 hover:text-blue-800 underline mb-4"
        >
          {showGraph ? "Hide" : "Show"} claim graph
        </button>

        {showGraph && <ClaimGraphVisualization graph={report.graph} />}

        <div className="space-y-4 mt-6">
          {report.claims.map((claim) => (
            <ClaimCard key={claim.id} claim={claim} />
          ))}
        </div>
      </div>
    </div>
  );
}
