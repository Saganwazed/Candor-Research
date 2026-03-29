# NewsLens — UI/UX Design Aesthetic Instructions
## For AI Agents Building Any Part of This Product

These instructions define the visual language, design system, and aesthetic standards for NewsLens.
Every screen, component, and interaction you build must conform to this document.
When in doubt, ask: *"Would a senior designer at a respected editorial publication be proud to ship this?"*
If the answer is no, revise before delivering.

---

## The Aesthetic Direction

**NewsLens is an editorial intelligence tool.** Its visual identity should feel like the intersection of
a respected broadsheet newspaper and a premium fintech dashboard — authoritative, restrained, precise.
Think *The Economist* meets *Linear*. Serious without being sterile. Minimal without being lazy.

The single most important design principle: **every element earns its place.**
If a color, shadow, animation, or component cannot be justified by function or intentional craft,
remove it. Clutter is the enemy.

**What this is NOT:**
- A SaaS startup landing page with gradients and floating blobs
- A dark-mode app with purple/blue neon accents
- A "vibe coded" interface with generic card grids and rounded-everything
- An AI tool that looks like it was made with a template
- Anything that resembles Notion, Linear clones, or generic Tailwind UI kits out of the box

---

## Color System

Use exactly this palette. Do not introduce colors outside of it without explicit instruction.

```css
:root {
  /* Backgrounds */
  --color-bg-base:        #F7F6F2;   /* Warm off-white — primary canvas */
  --color-bg-surface:     #EFEDE7;   /* Slightly darker warm — cards, panels */
  --color-bg-inset:       #E5E2DB;   /* Inset wells, code blocks, input fields */
  --color-bg-inverse:     #141410;   /* Near-black — for dark sections, toasts */

  /* Text */
  --color-text-primary:   #141410;   /* Near-black — all body and heading text */
  --color-text-secondary: #6B6860;   /* Warm grey — captions, metadata, labels */
  --color-text-tertiary:  #9E9B96;   /* Light warm grey — placeholders, disabled */
  --color-text-inverse:   #F7F6F2;   /* Off-white — text on dark backgrounds */

  /* Accent — use sparingly, never decoratively */
  --color-accent:         #1C4ED8;   /* Ink blue — primary actions, links, focus rings */
  --color-accent-hover:   #1741B0;   /* Darker blue — hover state on accent elements */
  --color-accent-subtle:  #EEF2FF;   /* Very light blue — selected states, badges */

  /* Semantic — credibility flag chips only */
  --color-flag-red:       #B91C1C;   /* Statistical Misuse */
  --color-flag-red-bg:    #FEF2F2;
  --color-flag-orange:    #C2410C;   /* Loaded Language, False Balance */
  --color-flag-orange-bg: #FFF7ED;
  --color-flag-amber:     #B45309;   /* Unverified Claim, Missing Context */
  --color-flag-amber-bg:  #FFFBEB;
  --color-flag-yellow:    #A16207;   /* Anonymous Sourcing */
  --color-flag-yellow-bg: #FEFCE8;

  /* Borders and rules */
  --color-border-strong:  #C4C1BA;   /* Visible borders — tables, dividers */
  --color-border-subtle:  #DDD9D2;   /* Subtle borders — card edges, inputs */
  --color-border-focus:   #1C4ED8;   /* Focus ring */
}
```

**Rules for color use:**
- The warm off-white background (`--color-bg-base`) is the signature of this product. Never use pure white (`#FFFFFF`) as a background anywhere.
- Accent blue appears on interactive elements only: buttons, links, active states, focus rings. Never use it as a decorative color.
- Semantic flag colors appear only inside credibility flag chips. Do not borrow them for other UI elements.
- Dark mode is out of scope for v1. Do not implement it unless explicitly instructed.

---

## Typography

```css
/* Load from Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');

:root {
  --font-serif:  'Libre Baskerville', Georgia, serif;   /* Display, headings, report labels */
  --font-sans:   'DM Sans', system-ui, sans-serif;      /* Body, UI, metadata, captions */
  --font-mono:   'Courier New', Courier, monospace;     /* JSON schema, code, technical data */
}
```

**Typography rules:**

Use `--font-serif` for: the product wordmark, section headings within the report (Bias Direction, Credibility Flags, Hidden Agenda), the bias direction label itself, and any editorial-register content. Serif type signals authority and intellectual seriousness — deploy it deliberately.

Use `--font-sans` for: all body copy, UI labels, navigation, input fields, buttons, metadata, captions, and anything interactive. DM Sans is airy and legible at small sizes; it counterbalances the serif with modernity.

**Type scale (rem-based, no deviations):**
```
--text-xs:   0.6875rem  / 11px — labels, legal, timestamps
--text-sm:   0.8125rem  / 13px — captions, secondary metadata
--text-base: 0.9375rem  / 15px — body copy
--text-md:   1.0625rem  / 17px — lead text, section intros
--text-lg:   1.25rem    / 20px — subheadings
--text-xl:   1.5rem     / 24px — section headings
--text-2xl:  2rem        / 32px — page heading, report title
--text-3xl:  2.75rem    / 44px — hero / wordmark
```

**Line height:**
- Body copy: `1.7` — generous, editorial
- Headings: `1.2` — tight, authoritative
- UI elements: `1.4` — balanced

**Tracking (letter-spacing):**
- ALL-CAPS labels: `0.08em` — always tracked out, never cramped
- Body: `0` — default, never manually tracked
- Wordmark: `-0.02em` — very slightly tight

**Do not use:** Inter, Roboto, Plus Jakarta Sans, Space Grotesk, Outfit, Nunito, Poppins, or any "neutral startup" sans-serif. Do not mix more than two typefaces.

---

## Spacing and Layout

The grid is based on a **4px base unit.** All spacing values must be multiples of 4px.

```
4px   — micro gaps (icon-to-label, chip internal padding)
8px   — tight groupings
12px  — compact UI elements
16px  — standard padding
24px  — section padding, card padding
32px  — between component groups
48px  — section separators
64px  — page-level vertical rhythm
96px  — hero / large section breathing room
```

**Content width:** Max content width is `720px` centered. Do not exceed this. The product is a reading/analysis tool — line length must be controlled for legibility. Sidebar layouts are not used in v1.

**Page margins:** `24px` on mobile, `48px` on tablet, auto-centered on desktop with the 720px max-width constraint.

**Layout principles:**
- Vertical rhythm is sacred. Consistent spacing between elements creates the feeling of a designed, intentional layout. Irregular spacing is the most common sign of vibe-coded interfaces.
- Use whitespace aggressively. The warm background is part of the design — let it breathe.
- Section breaks use a thin `1px` horizontal rule in `--color-border-subtle`, not bold dividers or colored bars.
- Never use box shadows on cards that create the illusion of floating elements. Borders are preferred. If shadows are used, they must be `0 1px 3px rgba(0,0,0,0.06)` — barely perceptible.

---

## Component Specifications

### Input Area

The article URL / text input is the primary interaction. It must feel premium.

```
Background:     --color-bg-inset
Border:         1px solid --color-border-strong
Border-radius:  4px (not 8px, not 12px, not rounded-full)
Font:           --font-sans, --text-base
Padding:        14px 16px
Focus state:    Border becomes --color-border-focus (2px), subtle inset shadow
Placeholder:    --color-text-tertiary, font-weight: 300, font-style: italic
```

The tab toggle (URL / Text) uses a horizontal pill switcher with a sliding indicator — not two separate buttons. Selected tab: `--color-bg-inverse` indicator with `--color-text-inverse` label. Unselected: `--color-text-secondary`.

### Primary Button ("Analyze")

```
Background:     --color-bg-inverse
Text:           --color-text-inverse, --font-sans, --text-sm, font-weight: 500
Letter-spacing: 0.04em
Padding:        12px 28px
Border-radius:  4px
Hover:          background lightens to #2A2A24, transition 150ms ease
Active:         scale(0.98), transition 80ms
Disabled:       opacity: 0.4, cursor: not-allowed
No box shadow.  No gradient. No border.
```

Never use a colored primary button. The near-black button on the warm off-white background is the brand signature for CTAs.

### Report Container

The report appears below the input with a `48px` top margin. It is not a "card." It does not have a white box, a shadow, or a border. It is simply structured content on the warm background — like reading a well-typeset document.

Each of the three report sections is separated by a `1px` rule and `32px` vertical padding. No section boxes, no colored backgrounds on sections, no rounded panel containers.

### Bias Direction Section

The section label ("Bias Direction") is set in `--font-serif`, `--text-xl`, `font-weight: 700`. Below it: the spectrum bar, then the direction label, then the justification sentence.

**Spectrum bar:**
```
Height:         6px
Width:          100% of content column
Background:     --color-border-subtle (the track)
Active marker:  A 14px × 14px circle in --color-bg-inverse, vertically centered on the track
                Position is set via CSS left% corresponding to the detected direction:
                Left=4%, Center-Left=28%, Center=50%, Center-Right=72%, Right=96%
Transition:     left 600ms cubic-bezier(0.16, 1, 0.3, 1)
Labels:         "Left" and "Right" flanking the bar, --text-xs, --color-text-tertiary, --font-sans
```

The direction label (e.g., "Center-Left") is set in `--font-serif`, `--text-2xl`, `font-weight: 700`, `--color-text-primary`. It sits below the spectrum bar with `16px` top margin.

The justification sentence is `--font-sans`, `--text-base`, `--color-text-secondary`, `line-height: 1.7`.

### Credibility Flag Chips

Each chip is a single-line inline element:
```
Font:           --font-sans, --text-xs, font-weight: 500
Letter-spacing: 0.05em
Text-transform: uppercase
Padding:        4px 10px
Border-radius:  2px (rectangular, not pill-shaped)
Border:         1px solid (using flag color at 40% opacity)
Background:     flag-bg color
Text:           flag color (dark variant)
Margin:         0 6px 8px 0 (wrapping row of chips)
```

The chip label is followed by the description text in `--font-sans`, `--text-base`, `--color-text-primary`, on a new line with `8px` top margin.

Chips stack as a wrapping flex row above the description. Each flag item (chip + description) is separated from the next by `24px`.

### Hidden Agenda Section

No special visual treatment beyond the section structure. The summary text is set in `--font-sans`, `--text-md`, `--color-text-primary`, `line-height: 1.7`, with the second-person framing making it naturally impactful without decorative emphasis.

### Loading State

The spinner is a 20px circle with a 2px border: `--color-border-strong` for the track, `--color-text-primary` for the rotating arc. Rotation animation: `spin 700ms linear infinite`.

The cycling label text is `--font-sans`, `--text-sm`, `--color-text-secondary`, `font-style: italic`. It fades between messages with a `200ms` cross-fade — no sliding, no popping.

### Error States

Error messages use `--font-sans`, `--text-sm`, `--color-text-secondary`. They appear inline below the input field — not in a toast, not in a modal, not in a colored alert box. A small `·` prefix in `--color-flag-amber` is the only visual indicator. No red text, no warning icons, no filled alert components.

### Feedback (Thumbs)

Two text-like buttons, not icon buttons with filled backgrounds:
```
Content:        "Helpful" and "Not helpful" with icon prefix (👍 👎)
Font:           --font-sans, --text-sm, --color-text-tertiary
Hover:          --color-text-secondary
Selected:       --color-text-primary, font-weight: 500
No background.  No border.  No pill shape.
```

---

## Motion and Animation

Animation is used sparingly and with purpose. Every transition must have a reason.

**Allowed animations:**

| Element | Animation | Duration | Easing |
|---|---|---|---|
| Report reveal on load | Fade in + translate Y(8px → 0) | 400ms | ease-out |
| Section stagger | Each section delays 80ms after previous | — | — |
| Spectrum bar position | Left% transition on mount | 600ms | cubic-bezier(0.16, 1, 0.3, 1) |
| Loading spinner | Rotation | 700ms | linear, infinite |
| Tab switcher indicator | Left% slide | 200ms | ease-in-out |
| Button hover | Background color | 150ms | ease |
| Button active | scale(0.98) | 80ms | ease |
| Feedback selected | Opacity of unselected option to 0.4 | 200ms | ease |

**Do not use:** parallax, scroll-triggered animations, bounce easings, spring animations on UI controls, hover effects that move entire cards, skeleton loaders with shimmer effects, or any animation that draws attention to itself.

---

## Typography and Language Conventions

The AI agent must also follow these conventions when rendering any dynamic text in the UI (labels, error messages, empty states):

- **Sentence case everywhere** — not Title Case for section labels, not ALL CAPS for headings (only for chip labels as defined above)
- **No exclamation marks** — they undermine the authoritative register
- **Em dash (—) not hyphen-minus** for ranges and asides
- **Ellipsis character (…) not three dots (...)** in loading states
- **Numerals, not words** for all measurements and statistics (e.g., "5 flags", not "five flags")
- **Oxford comma always**

---

## What to Audit Before Delivering Any Screen

Before submitting any implemented component or screen, check every item:

- [ ] No pure white (`#FFFFFF`) backgrounds anywhere
- [ ] No Inter, Roboto, or system-ui fonts
- [ ] No colored primary buttons (blue, green, purple CTAs)
- [ ] No box shadows stronger than `0 1px 3px rgba(0,0,0,0.06)`
- [ ] No border-radius above `4px` on any interactive element (inputs, buttons, chips)
- [ ] No gradient backgrounds, gradient text, or gradient borders
- [ ] No purple, teal, or neon accent colors
- [ ] No floating card panels with shadows
- [ ] No skeleton loaders or shimmer animations
- [ ] No ALL CAPS section headings (only chip labels)
- [ ] No emoji used as UI decoration (only in the feedback row as specified)
- [ ] Spectrum bar has smooth position transition on load
- [ ] All font sizes match the defined type scale (no arbitrary values)
- [ ] All spacing values are multiples of 4px
- [ ] Content width never exceeds 720px
- [ ] Focus rings are visible and use `--color-border-focus`
- [ ] Flag chips are rectangular (border-radius: 2px), not pill-shaped
- [ ] Report sections are separated by 1px rules, not colored panels

If any item fails this audit, fix it before delivering.

---

## The Designer's Mindset

When building for NewsLens, ask yourself three questions before writing any CSS:

**1. Does this look like it belongs in a respected publication?**
The Financial Times, The Atlantic, The New York Review of Books — these are the tonal references. Not a VC-funded B2B SaaS product.

**2. Could a junior developer have made this choice by default?**
If yes, reconsider. Default choices — centered layouts, card grids, blue primary buttons, Inter font — are the signature of undesigned interfaces. Make a deliberate choice.

**3. If you removed all the content, would the layout still look considered?**
Good design has structural integrity. The spacing, type hierarchy, and visual rhythm should communicate craft even before the user reads a word.

The bar is: a senior designer with a decade of editorial and product experience would look at this and nod. Not "it's fine." A nod.
