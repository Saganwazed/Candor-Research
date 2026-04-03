"use client";

interface ShareButtonProps {
  onShare: () => void;
  isSharing: boolean;
  hasShared: boolean;
}

export default function ShareButton({
  onShare,
  isSharing,
  hasShared,
}: ShareButtonProps) {
  return (
    <button
      className="btn-share"
      onClick={onShare}
      disabled={isSharing}
      aria-label={hasShared ? "View share link" : "Share this report"}
      id="btn-share-report"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <polyline points="16 6 12 2 8 6" />
        <line x1="12" y1="2" x2="12" y2="15" />
      </svg>
      {isSharing ? "Sharing…" : hasShared ? "Shared" : "Share"}
    </button>
  );
}
