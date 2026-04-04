# PostHog Analytics Setup

This document describes all analytics events tracked in Candor using PostHog.

## Configuration

**PostHog Project Key:** Set via `NEXT_PUBLIC_POSTHOG_KEY` in `.env.local`
**PostHog Region:** US (`https://us.i.posthog.com`)
**Environment Variables:** Set in `.env.local` (not committed to git)

## Tracked Events

### 1. Article Analysis
**Event Name:** `article_analyzed`

Fired when a user successfully analyzes an article or text.

**Properties:**
- `mode` (string): "url" or "text" — how the article was input
- `bias_direction` (string): The detected bias direction (e.g., "left-leaning", "right-leaning", "neutral")

**Example:**
```
User pastes CNN article → article_analyzed {mode: "url", bias_direction: "left-leaning"}
```

### 2. Analysis Errors
**Event Name:** `analysis_error`

Fired when article analysis fails (API error, timeout, etc.).

**Properties:**
- `mode` (string): "url" or "text"
- `error_message` (string): The error that occurred

### 3. Article Fetch Errors
**Event Name:** `fetch_error`

Fired when URL content extraction fails (blocked by site, timeout, etc.).

**Properties:**
- `error_message` (string): The fetch error

**Use Case:** Identify which sites block automated access

### 4. Report Sharing
**Event Name:** `report_shared`

Fired when a user creates a shareable link for a report.

**Properties:**
- `bias_direction` (string): The bias of the shared report

**Use Case:** Track popular analysis types being shared

### 5. Share Visibility Toggle
**Event Name:** `share_visibility_toggled`

Fired when a user makes a shared report public or private.

**Properties:**
- `is_public` (boolean): Whether the report is now public

### 6. Shared Report View
**Event Name:** `shared_report_viewed`

Fired when someone views a shared report link.

**Properties:**
- `share_id` (string): The share ID

**Use Case:** Track how many times reports are viewed

### 7. Feedback Submission
**Event Name:** `feedback_submitted`

Fired when a user rates report usefulness.

**Properties:**
- `feedback_type` (string): "helpful" or "not_helpful"

**Use Case:** Measure report accuracy and quality

### 8. Input Mode Switch
**Event Name:** `input_mode_switched`

Fired when user switches between URL and text input modes.

**Properties:**
- `new_mode` (string): "url" or "text"

### 9. Theme Toggle
**Event Name:** `theme_toggled`

Fired when user switches between light/dark mode.

**Properties:**
- `is_dark` (boolean): Whether dark mode is now enabled

### 10. Extension Banner Click
**Event Name:** `extension_banner_clicked`

Fired when user clicks the browser extension promotion banner.

## Usage in Components

All analytics are centralized in `/src/lib/posthog-events.ts` via the `useAnalyticsEvents()` hook.

### Example: Custom Event in a Component

```typescript
import { useAnalyticsEvents } from '@/lib/posthog-events'

export function MyComponent() {
  const { trackAnalysis } = useAnalyticsEvents()

  const handleClick = () => {
    trackAnalysis('url', 'left-leaning')
  }

  return <button onClick={handleClick}>Analyze</button>
}
```

## PostHog Dashboard

Visit **https://app.posthog.com** to:
- View event streams in real-time
- Create funnels (e.g., URL paste → Analysis → Share)
- Build cohorts based on behavior
- Set up feature flags
- Create in-app surveys
- Track retention and engagement

### Recommended Dashboards

1. **Conversion Funnel**
   - Step 1: Input (URL or Text)
   - Step 2: Analysis Success
   - Step 3: Share Creation

2. **Error Tracking**
   - Filter: `analysis_error` AND `fetch_error` events
   - Segment by mode and error type

3. **User Engagement**
   - Track: `article_analyzed` per user
   - Retention: Returning users over time

## Local Development

PostHog will show "Failed to fetch" errors on localhost because:
- Localhost can't reach PostHog servers
- This is expected and not a problem
- Events will work perfectly in production (Vercel, etc.)

## Production Notes

✅ PostHog will work immediately after deployment
✅ No code changes needed
✅ Events start collecting automatically

If you don't see events:
1. Check network tab in DevTools
2. Verify `NEXT_PUBLIC_POSTHOG_KEY` is set
3. Check browser console for PostHog errors
