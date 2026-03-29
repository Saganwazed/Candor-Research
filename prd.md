# NewsLens — AI-Powered News Bias Detection
## Product Requirements Document · MVP v1.0

| Field | Value |
|---|---|
| Status | Draft v1.0 |
| Version | MVP v1 |
| Date | March 29, 2026 |
| Audience | Engineering, Design, Legal |

---

## 1. Problem Statement and Target User

### Problem

Mainstream news consumers increasingly distrust media but lack the tools or training to independently evaluate what they read. Bias and rhetorical manipulation are embedded in article structure, word choice, and selective framing — none of which are visible to the average reader. Existing fact-checkers (Snopes, PolitiFact) address claims, not tone or agenda. Media bias raters (AllSides, Ad Fontes) rate *outlets*, not individual articles. There is no fast, on-demand tool that analyzes a specific article a user is about to read and answers: what direction is this pulling me in, what is missing or misleading, and what does it want me to do?

### Target User

**Primary:** News-literate adults aged 25–55 who consume online news regularly (at least 5 articles per week), are skeptical of media bias, but are not trained journalists or researchers. They are time-constrained — they want insight in under 60 seconds, not a lecture. They share articles on social media and care about appearing informed.

**Secondary (out of scope for v1):** Journalists fact-checking their own work, academic researchers, students doing media literacy coursework. These users have longer sessions and richer needs that would require v2+ features.

> ✅ **Self-check:** Problem and user are consistent. The 60-second user patience constraint defined here flows directly into latency targets and scope decisions throughout this document.

---

## 2. Goals and Success Metrics

### Product Goals

- **G1 — Speed:** Deliver a useful, trustworthy bias analysis on any English-language news article in under 10 seconds of processing time.
- **G2 — Legibility:** Make all three report sections immediately legible without reading instruction.
- **G3 — Honesty:** Flag when the tool cannot confidently assess something rather than fabricate a conclusion.

### Success Metrics — 8-Week Beta Targets

| Metric | Target |
|---|---|
| Time-to-report, URL input (p95) | ≤ 10 seconds from submission |
| Time-to-report, text input (p95) | ≤ 8 seconds from submission |
| Report completion rate | ≥ 90% of submitted articles |
| User-rated usefulness (1–5 scale) | ≥ 3.8 average |
| Return visit rate (within 7 days) | ≥ 30% |
| Session abandonment before load | ≤ 15% |

### Guardrail Metric

False confidence rate — defined as the AI asserting a strong bias direction or credibility flag on content it demonstrably cannot analyze (e.g., a recipe, a 404 page, or a non-news document) — must stay below **5%** of sessions. Monitored via weekly manual spot-check of 50 random reports.

> ✅ **Self-check:** All metrics are specific and testable. The p95 latency targets are consistent with the 60-second patience window from Section 1. The guardrail metric addresses a failure mode the AI/prompt section (Section 6) will explicitly handle. No conflicts.

---

## 3. Scope

### In Scope for v1

- Single-article analysis via URL or pasted raw text
- English-language articles only
- Three output sections: bias direction, credibility flags, hidden agenda
- Web-based interface, desktop and mobile responsive (≥ 375px)
- URL fetching and article body extraction from submitted URL
- Error handling for unextractable URLs (paywalled, 403, 404, timeout)
- A plain-language AI limitations disclaimer, shown once per session

### Out of Scope for v1

The following were considered and deliberately excluded to keep v1 shippable and focused.

| Feature | Reason Excluded | Target |
|---|---|---|
| Outlet-level bias history or scoring | Database dependency and legal risk | v2 |
| Claim-level sourcing | Requires web search; increases latency and cost | v2 |
| Multi-article comparison | Advanced user need, not primary persona | v2 |
| Non-English articles | Model quality degrades; adds QA burden | v2 |
| User accounts, history, saved reports | Unnecessary for core value proof | v2 |
| Browser extension | High distribution complexity for unproven product | v2 |
| Share / export report | Desirable UX but not core to value demonstration | v2 |
| Social media post analysis | Different format, different prompting challenges | v2 |
| Paywalled article support | Legally and technically complex | v2 |

> ✅ **Self-check:** Scope is consistent with the target user and success metrics. Nothing in the metrics requires an out-of-scope feature. URL fetching is confirmed in-scope and its latency is included in the p95 budget. No conflicts.

---

## 4. User Flow

### Step 1 — Landing
User arrives at the homepage. They see a single input area, a one-sentence product description ("Paste a news article or URL. Get an instant bias report."), and no other navigational noise. No sign-in required.

### Step 2 — Input
User pastes a URL or raw article text. Two input modes are presented as a tab toggle defaulting to URL. Raw text accepts up to 50,000 characters. A single "Analyze" button is below the input.

### Step 3 — Client-side Validation
On clicking "Analyze":
- **URL mode:** Validate well-formed URL (http/https + recognizable domain). Error: *"That doesn't look like a valid URL. Try pasting the article text instead."* Do not submit.
- **Text mode:** Validate ≥ 150 characters. Error: *"Paste the full article text — this looks too short."* Do not submit.

### Step 4 — Processing State
"Analyze" button disabled. Indeterminate spinner with cycling labels at 2-second intervals: "Reading the article…", "Checking for bias signals…", "Writing your report…" (cosmetic only — does not reflect actual processing stages).

### Step 5 — URL Fetching (URL mode only)
Server fetches URL, strips HTML boilerplate, extracts article body. On failure (4xx, 5xx, timeout >5s, or content <300 words post-extraction) returns a structured error. UI shows: *"We couldn't read that article — it may be paywalled or restricted. Try pasting the text directly."*

### Step 6 — AI Analysis
Extracted or user-submitted text is sent to the AI model with the structured prompt (see Section 6). Model returns structured JSON containing all three report sections.

### Step 7 — Report Display
Loading state clears. Report appears below input on the same page without a page reload. Input remains visible above the report so the user can analyze another article without navigating away.

### Step 8 — Post-Report Feedback
"Was this report useful? 👍 👎" appears below the report. Binary signal recorded against a random session ID. No user identity required. No confirmation animation. This is the primary signal for the usefulness success metric.

### Step 9 — Re-analysis
User may edit input and click "Analyze" again at any time. New report replaces previous report. No history or comparison view in v1.

> ✅ **Self-check:** The flow is internally consistent. Step 5 covers the URL failure case from Section 3. Step 7's no-reload approach is consistent with the SPA architecture (Section 8). The 150-char floor prevents garbage submissions. Step 8 directly feeds the usefulness metric in Section 2. No conflicts.

---

## 5. Functional Requirements — Output Sections

### FR1 — Bias Direction

**FR1.1 — Allowed Labels**
The bias direction label must be one of exactly six values: `Left`, `Center-Left`, `Center`, `Center-Right`, `Right`, `Unclear`. No other labels are permitted. `Unclear` is used when the article is not political, when confidence is insufficient, or when the content type is inappropriate for bias analysis (sports recap, recipe, etc.).

**FR1.2 — Justification Sentence**
One sentence, 20–40 words, in plain language. Must cite at least one specific, observable feature of the article (word choice, framing, source selection, omission). Must not be a general assertion.
- ✓ *"The article uses 'regime' to describe the government and quotes only opposition sources, both classic signals of hostile framing."*
- ✗ *"This article shows a leftward lean in how it covers the topic."*

**FR1.3 — Visual Indicator**
Direction label rendered with a five-position spectrum bar, detected position highlighted. Replaces free-text placement description and makes output scannable at a glance.

**FR1.4 — Unclear Handling**
If label is `Unclear`, the justification sentence must explain *why* it is unclear (e.g., *"This appears to be a sports recap with no political framing to evaluate."*), not restate the label.

---

### FR2 — Credibility Flags

**FR2.1 — Definition**
A list of discrete items identifying specific claims, phrases, or structural features in the article that are misleading, unverified, lack context, or use manipulative rhetorical technique.

**FR2.2 — Count Constraint**
Minimum 1, maximum 5 flags. If no flags are warranted, the section displays: *"No significant credibility issues detected."* Must not display an empty list or omit the section.

**FR2.3 — Flag Structure**
Each flag must include:
- A **flag type label** from this fixed taxonomy (no other values permitted in v1):
  - `Unverified Claim`
  - `Missing Context`
  - `Loaded Language`
  - `Anonymous Sourcing`
  - `Statistical Misuse`
  - `False Balance`
- A **description** (1–2 sentences, ≤40 words) naming the specific claim or phrase and explaining the concern. Must quote or paraphrase the article directly so the user can locate it.

**FR2.4 — Ordering**
Flags ordered by severity, most significant first. Ordering logic defined in the prompt, not post-processed by the application.

**FR2.5 — Color-Coded Chips**

| Flag Type | Color |
|---|---|
| Unverified Claim | Amber |
| Missing Context | Amber |
| Loaded Language | Orange |
| Anonymous Sourcing | Yellow |
| Statistical Misuse | Red |
| False Balance | Orange |

> Note: Color chips must not rely on color alone — each must include the flag type label text (WCAG 2.1 AA, see NFR4).

---

### FR3 — Hidden Agenda

**FR3.1 — Definition**
A 1–2 sentence summary of what emotional response or action the article appears designed to produce in the reader, beyond its stated informational purpose.

**FR3.2 — Second-Person Voice**
Written in second person: *"This article wants you to feel…"* or *"The framing pushes you to conclude…"* This makes the persuasion attempt personal and concrete.

**FR3.3 — Grounding Requirement**
Must be grounded in observable features (tone, structure, selective inclusion, call-to-action language). Must not restate the bias direction.

**FR3.4 — No-Agenda Case**
If no discernible hidden agenda: *"This article appears to present information without a strong persuasive agenda."* Must not be left blank.

**FR3.5 — Length Limit**
Maximum 60 words. If model output exceeds 60 words, the application truncates at the nearest sentence boundary below 60 words.

> ✅ **Self-check:** FR1/FR2/FR3 are non-overlapping — political lean, claim-level issues, and emotional intent respectively. The fixed taxonomies in FR1 and FR2 must be enforced in the prompt (Section 6) and validated in the application's JSON parsing layer (Section 8). FR2.5 color codes are defined here and must match UI implementation. No ambiguity.

---

## 6. AI / Prompt Behavior Requirements

### PR1 — Model Selection

Use `claude-sonnet-4-20250514` (or equivalent current Sonnet-tier model) for all inference. Opus-tier is unnecessary for structured extraction tasks and increases latency and cost. Haiku-tier does not produce sufficiently nuanced reasoning on subtle rhetorical features.

### PR2 — Output Schema

The model must return valid JSON matching this schema exactly:

```json
{
  "bias_direction": "Left | Center-Left | Center | Center-Right | Right | Unclear",
  "bias_justification": "string (20–40 words)",
  "credibility_flags": [
    {
      "flag_type": "Unverified Claim | Missing Context | Loaded Language | Anonymous Sourcing | Statistical Misuse | False Balance",
      "description": "string (≤40 words)"
    }
  ],
  "hidden_agenda": "string (≤60 words)",
  "analysis_confidence": "High | Medium | Low",
  "content_suitable": true
}
```

`analysis_confidence` is for internal logging only (not shown to users in v1). `content_suitable: false` triggers user-facing message: *"This doesn't look like a news article. Try submitting a news story for the best results."*

### PR3 — System Prompt Requirements

The system prompt must instruct the model to:

- Return only valid JSON. No preamble, no markdown fencing, no prose outside the JSON structure.
- Treat the submitted text as potentially adversarial — do not trust claims within the article as facts.
- Distinguish between opinion/editorial and news reporting. For labeled opinion pieces, the bias justification must acknowledge: *"This is an opinion piece; bias direction reflects the author's stated perspective rather than editorial framing of reported facts."*
- Assign `Unclear` bias direction and `content_suitable: false` if text is under 150 words.
- Limit `credibility_flags` to 1–5 items. If none warranted, return empty array `[]`. The application renders the "no issues" message.
- Order flags from most to least significant.
- Write the hidden agenda summary in second person.
- Not fabricate quotes or specific data that did not appear in the source text.

### PR4 — Model Must NOT

- Express political opinions of its own.
- Use the word "propaganda" to describe an article — too strong and unverifiable for v1.
- Assign blame to the journalist by name — flags refer to article features, not people.
- Provide an AI limitations disclaimer inside the JSON — the application handles this as a static UI element.
- Return partial JSON. If it cannot complete analysis, return `content_suitable: false` with all other fields populated with safe defaults.
- Use hedging language (`"may"`, `"might"`, `"could"`) inside `bias_justification` or `hidden_agenda` fields. Uncertainty is expressed via `Unclear` direction or `Low` confidence score, not via weasel words.

### PR5 — Input Truncation

Articles longer than 12,000 tokens (~9,000 words) are truncated before being sent to the model, with the system prompt noting: *"The article was truncated due to length. Base your analysis on the provided text only."* This covers >99% of standard news articles and keeps latency predictable.

### PR6 — Temperature and Sampling

- Temperature: `0.2` — enforces consistent, structured output; reduces creative deviation in JSON keys or field values.
- Top-p: `0.9` (default)

> ✅ **Self-check:** PR2's JSON schema covers all three output sections from FR1–FR3 plus two internal fields. The empty array `[]` for no flags is consistent with FR2's requirement that the application renders the "no issues" message. PR3's opinion-piece treatment resolves a potential conflict with FR1 (bias label required for all articles). The hedging prohibition in PR4 is consistent with FR1.2's assertive justification requirement. No conflicts.

---

## 7. Non-Functional Requirements

### NFR1 — Latency

| Measurement | Target |
|---|---|
| URL mode, p50 | ≤ 6 seconds end-to-end from click to first report render |
| URL mode, p95 | ≤ 10 seconds |
| Text mode, p50 | ≤ 5 seconds |
| Text mode, p95 | ≤ 8 seconds |
| URL fetch hard timeout | 5 seconds; no retry in v1 |
| AI inference timeout | 15 seconds; surface timeout error to user |

### NFR2 — Reliability

| Requirement | Target |
|---|---|
| Uptime during 8-week beta | ≥ 99% (~85 min downtime/month) |
| Error handling | AI failures must always surface as user-facing errors — never silent partial reports |
| Report completion rate | ≥ 90% |

### NFR3 — Output Tone

- **Reading level:** US 9th grade or below (Flesch-Kincaid validated during prompt development)
- **Register:** Analytical, not alarming or melodramatic
- **Political neutrality:** Left and right bias analyzed with equal rigor and without favoring either direction

### NFR4 — Accessibility

- WCAG 2.1 AA compliance
- Full keyboard navigation; ARIA labels on all interactive elements
- Bias spectrum bar must include an ARIA label describing the detected position for screen reader users
- Color chips must include flag type label text — color alone is not sufficient

### NFR5 — Privacy and Security

- Article text is not stored on disk or logged. Processed in memory, discarded after response.
- Thumbs feedback stored with randomly generated session ID only — no user-identifiable data
- Session ID cookie only. No user accounts, no tracking pixels.

### NFR6 — Mobile Responsiveness

- Minimum screen width: 375px (iPhone SE baseline)
- Full report visible without horizontal scrolling on mobile

> ✅ **Self-check:** NFR1 latency targets are consistent with Section 2 success metrics. URL fetch timeout (5s) fits within the p95 budget (5s fetch + ~4s inference = 9s, within 10s ceiling). NFR3 tone guidance is consistent with PR4's prohibition on "propaganda" and name-blame. NFR5 eliminates GDPR/CCPA surface area in the absence of user accounts. No conflicts.

---

## 8. Tech Stack Recommendation

| Component | Choice | Justification |
|---|---|---|
| Frontend | Next.js 14 + TypeScript | App Router enables future streaming; TypeScript reduces runtime bugs in JSON parsing; Tailwind CSS sufficient for MVP UI surface area |
| Backend | Next.js API Routes (Vercel serverless) | Single codebase, zero-ops, adequate for beta volume. Cold starts (~300ms) within p95 budget. Migrate to Railway/Fly.io if volume exceeds serverless limits. |
| URL Extraction | `@mozilla/readability` + `node-fetch` | Battle-tested on thousands of news layouts (same parser as Firefox Reader Mode); correctly strips ads/nav; MIT licensed. Avoids paid API dependency (Diffbot, Firecrawl). |
| AI Inference | Anthropic Messages API (direct) | No LangChain abstraction needed for single-prompt, single-model, structured-output use case. Easier to debug and test. JSON enforced via system prompt; validated with Zod. |
| Hosting | Vercel | Native Next.js deployment, edge network, zero-config SSL, free tier covers beta volume, predictable cost escalation. |
| Feedback DB | Supabase (Postgres) | Preferred over Vercel KV if future SQL analysis of feedback is anticipated. Vercel KV acceptable if simplicity is the priority. |
| Monitoring | Vercel Analytics + Sentry | Together cover latency tracking (NFR1) and runtime error tracking (NFR2). Both integrate in under 1 hour. No custom instrumentation required in v1. |

**JSON validation note:** Zod schema validation is the application-level enforcement mechanism for the schema defined in PR2. On parse failure, the system retries the AI call once. On second failure, a report-generation error is returned to the user.

> ✅ **Self-check:** Tech stack is consistent with NFR5 (no persistent article storage — Readability processes in memory). The Zod validation layer closes the loop between PR2 (schema requirements) and the application layer. Vercel cold start overhead (~300ms) is within the p95 latency budget. No conflicts.

---

## 9. Open Questions and Risks

### Open Questions

**OQ1 — Paywall detection heuristic**
What content length threshold reliably identifies a paywalled article vs. a legitimately short article? The current spec uses 300 words post-extraction, but this must be validated against a sample of 50 real URLs before launch. Too low = rejecting short legitimate articles. Too high = analyzing paywall landing pages.

**OQ2 — Opinion piece detection**
Should opinion be detected by the AI from article content, or via URL heuristics (e.g., `nytimes.com/opinion/`)? URL heuristics are faster but brittle. Recommendation: let the AI handle it — add an `article_type` field to the JSON schema (`"News Report" | "Opinion/Editorial" | "Analysis" | "Unknown"`) and surface it in the report header in v2.

**OQ3 — Rate limiting** *(must resolve before launch)*
What is the per-IP request limit to prevent abuse? With no user accounts, all rate limiting is IP-based. Recommended starting point: 10 analyses per IP per hour. Must be agreed upon and implemented before launch — unrestricted access with no auth will be immediately exploited.

**OQ4 — Legal review of output**
Does publishing AI-generated assessments of real articles from real publications create defamation or copyright risk? The system quotes phrases from articles in credibility flags. Brief quotation for criticism and commentary is generally fair use in the US, but this must be reviewed by legal counsel before public launch.

---

### Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **R1 — Model bias in bias assessment** | 🔴 HIGH | Before launch, manually run 30 articles across the political spectrum and compare outputs for systematic skew. Adjust system prompt if detected. Reputational risk that could torpedo user trust on day one. |
| **R2 — URL fetching failure rate too high** | 🟡 MEDIUM | Include clear copy before submission explaining paywalled sites won't work. Measure URL failure rate in week 1; if it exceeds 35%, make text mode the default tab. |
| **R3 — Prompt injection via article content** | 🟡 MEDIUM | System prompt must explicitly mark article text as untrusted user content. Zod schema validation catches deviant field values (e.g., an injected `bias_direction` outside the six allowed values) and triggers a safe error. |
| **R4 — AI output taken as authoritative truth** | 🟠 LOW-MEDIUM | Persistent disclaimer on every report: *"AI analysis — use as a starting point, not a verdict."* Justification language must remain analytical, not declarative. Monitor for Anthropic usage policy violations. |
| **R5 — Latency on long articles** | 🟢 LOW | The 12,000-token truncation in PR5 is the primary control. If latency remains high, streaming the JSON response (rendering sections as they complete) is the first optimization for v1.1 — deferred from v1 scope. |

---

*End of PRD v1.0 — Next step: Resolve OQ3 (rate limiting) and OQ4 (legal review) with relevant stakeholders before proceeding to design and technical specification.*
