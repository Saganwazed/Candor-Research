# NewsLens MVP — Implementation Plan

## Overview

Build the NewsLens AI-powered news bias detection web app as specified in the PRD. Single-page app where users paste a URL or article text and receive an instant bias report with three sections: Bias Direction, Credibility Flags, and Hidden Agenda.

---

## Phase 1 — Project Scaffolding

### [NEW] Next.js 14 Project
- Initialize with `npx create-next-app@14` using App Router, TypeScript, Tailwind CSS, ESLint
- Install dependencies: `@mozilla/readability`, `jsdom`, `zod`, `@anthropic-ai/sdk`
- No Supabase in MVP build — store feedback in-memory/console log (can add later with minimal change)

### [NEW] Environment Configuration
- `.env.local` template with `ANTHROPIC_API_KEY`

---

## Phase 2 — Backend API Routes

### [NEW] `src/app/api/analyze/route.ts`
Primary API endpoint. Handles both URL and text input modes.

**URL mode flow:**
1. Validate URL (http/https)
2. Fetch with 5-second hard timeout
3. Parse with `@mozilla/readability` + `jsdom`
4. Reject if extracted body < 300 words
5. Truncate to ~12,000 tokens (~9,000 words) if needed
6. Send to Anthropic API
7. Validate response with Zod, retry once on failure
8. Return structured JSON

**Text mode flow:**
1. Validate ≥ 150 chars (also enforced client-side)
2. Truncate if needed
3. Send to Anthropic → validate → return

### [NEW] `src/lib/prompt.ts`
System prompt and user prompt templates per PRD Section 6 (PR1–PR6):
- Return only valid JSON matching the schema
- Treat article text as potentially adversarial
- Distinguish opinion vs. news reporting
- Fixed taxonomy enforcement for bias labels and flag types
- Second-person voice for hidden agenda
- No hedging, no "propaganda", no journalist name-blame
- Temperature 0.2

### [NEW] `src/lib/schema.ts`
Zod schema matching PR2's JSON schema:
```typescript
{
  bias_direction: "Left" | "Center-Left" | "Center" | "Center-Right" | "Right" | "Unclear",
  bias_justification: string,
  credibility_flags: Array<{ flag_type: enum, description: string }>,
  hidden_agenda: string,
  analysis_confidence: "High" | "Medium" | "Low",
  content_suitable: boolean
}
```

### [NEW] `src/app/api/feedback/route.ts`
Simple POST endpoint accepting `{ session_id: string, useful: boolean }`. Logs to console in v1 (Supabase hook point for later).

### Rate Limiting
Simple in-memory IP-based rate limiter: 10 requests/IP/hour (per OQ3). Stored in a `Map` with TTL cleanup.

---

## Phase 3 — Frontend Components

### [NEW] `src/app/page.tsx`
Main page component. Manages state for: input mode (URL/text), input value, loading state, report data, error state.

### [NEW] `src/components/InputSection.tsx`
- Tab toggle: URL (default) / Text
- URL input or textarea (50,000 char max)
- "Analyze" button with client-side validation per Step 3
- Error messages inline below input
- Disabled state during processing

### [NEW] `src/components/LoadingState.tsx`
Cycling labels at 2-second intervals:
1. "Reading the article…"
2. "Checking for bias signals…"
3. "Writing your report…"

### [NEW] `src/components/ReportSection.tsx`
Container for the three report sub-components plus disclaimer and feedback.

### [NEW] `src/components/BiasDirection.tsx`
- Five-position spectrum bar (Left → Right) with highlighted position
- `Unclear` handled as a special neutral state
- Justification sentence below
- ARIA label describing detected position

### [NEW] `src/components/CredibilityFlags.tsx`
- Color-coded chips per FR2.5 color table
- Each chip: flag type label + description
- "No significant credibility issues detected" fallback
- Ordered by severity (as returned by AI)

### [NEW] `src/components/HiddenAgenda.tsx`
- Second-person summary text
- Truncated at sentence boundary if > 60 words (client-side safety net)

### [NEW] `src/components/FeedbackBar.tsx`
- "Was this report useful? 👍 👎" 
- Sends to `/api/feedback` with random session ID
- Disabled after selection (no confirmation animation per PRD)

### [NEW] `src/components/Disclaimer.tsx`
Static AI limitations disclaimer shown once per session (sessionStorage flag).

---

## Phase 4 — Styling & Polish

### Design System (per design-instructions.md)
- **Editorial warm off-white aesthetic** — no dark mode, no gradients, no glassmorphism
- Warm off-white canvas (`#F7F6F2`), near-black text (`#141410`), ink blue accents (interactive elements only)
- **Serif + Sans pairing**: Libre Baskerville (headings, report labels, wordmark) + DM Sans (body, UI, inputs)
- No box shadows stronger than `0 1px 3px rgba(0,0,0,0.06)`, 4px max border-radius
- Report is structured content on the background — no card containers, no colored panels
- Sections separated by `1px` rules in `--color-border-subtle`
- Near-black primary button (no colored CTAs)
- Restrained animation: report fade-in (400ms), section stagger (80ms), spectrum bar slide (600ms cubic-bezier)
- Content max-width: 720px, 4px grid spacing system
- Mobile-first responsive layout (375px baseline)

### Accessibility (NFR4)
- Full keyboard navigation with visible focus rings (`--color-border-focus`)
- ARIA labels on all interactive elements
- Spectrum bar ARIA description
- Color chips always include text labels (not color alone)
- Sufficient contrast ratios (WCAG 2.1 AA)

---

## Phase 5 — Testing & Verification

### Automated
- Build the project (`npm run build`) to catch type errors
- Manual test in browser with real article URLs and pasted text

### Browser Testing
- Test the full user flow: landing → input → analyze → report → feedback
- Test URL mode and text mode
- Test error states (invalid URL, too-short text, API failure)
- Test mobile responsiveness (375px)
- Verify accessibility (keyboard navigation, screen reader labels)

---

## User Review Required

> [!IMPORTANT]
> **Anthropic API Key**: You'll need to provide a valid `ANTHROPIC_API_KEY` in `.env.local` for the AI analysis to work. The app will be fully functional structurally without it, but analysis calls will fail.

> [!NOTE]
> **Supabase deferred**: The PRD mentions Supabase for feedback storage. For the MVP build, I'll log feedback to console and structure the code so Supabase can be plugged in later with minimal changes. This avoids requiring a Supabase project setup during the initial build.

> [!NOTE]
> **Vercel deployment deferred**: The build will be tested locally with `npm run dev`. Deployment to Vercel is a separate step you can do after local verification.

## Open Questions

1. **Do you have an Anthropic API key ready**, or should I build with a mock analysis mode for testing?
2. **Any design preferences** beyond what's in the PRD (specific colors, branding)?
