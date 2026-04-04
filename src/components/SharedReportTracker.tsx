"use client";

import { useEffect } from "react";
import { usePostHog } from "posthog-js/react";

interface SharedReportTrackerProps {
  shareId: string;
  children: React.ReactNode;
}

export default function SharedReportTracker({
  shareId,
  children,
}: SharedReportTrackerProps) {
  const posthog = usePostHog();

  useEffect(() => {
    // Track shared report view
    posthog.capture("shared_report_viewed", {
      share_id: shareId,
    });
  }, [shareId, posthog]);

  return <>{children}</>;
}
