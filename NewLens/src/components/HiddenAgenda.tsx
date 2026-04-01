"use client";

interface HiddenAgendaProps {
  agenda: string;
}

/**
 * Truncate text at the nearest sentence boundary below maxWords.
 */
function truncateAtSentence(text: string, maxWords: number): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;

  const truncated = words.slice(0, maxWords).join(" ");
  // Find the last sentence-ending punctuation
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf("."),
    truncated.lastIndexOf("!"),
    truncated.lastIndexOf("?")
  );

  if (lastSentenceEnd > 0) {
    return truncated.slice(0, lastSentenceEnd + 1);
  }
  return truncated + "…";
}

export default function HiddenAgenda({ agenda }: HiddenAgendaProps) {
  const displayText = truncateAtSentence(agenda, 60);

  return (
    <div className="report-section report-reveal report-reveal-delay-3" id="section-hidden-agenda">
      <h2 className="section-heading">Hidden agenda</h2>
      <p className="agenda-text">{displayText}</p>
    </div>
  );
}
