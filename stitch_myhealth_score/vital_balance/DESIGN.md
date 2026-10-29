---
name: Vital Balance
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#434655'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#006a61'
  on-secondary: '#ffffff'
  secondary-container: '#86f2e4'
  on-secondary-container: '#006f66'
  tertiary: '#632ecd'
  on-tertiary: '#ffffff'
  tertiary-container: '#7d4ce7'
  on-tertiary-container: '#f6edff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#89f5e7'
  secondary-fixed-dim: '#6bd8cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#e9ddff'
  tertiary-fixed-dim: '#d0bcff'
  on-tertiary-fixed: '#23005c'
  on-tertiary-fixed-variant: '#5516be'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-score:
    fontFamily: Plus Jakarta Sans
    fontSize: 56px
    fontWeight: '800'
    lineHeight: 60px
    letterSpacing: -0.03em
  display-score-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 44px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.025em
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
  metric-numeral:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-tablet: 1.25rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 2rem
  margin-desktop: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system establishes an empathetic, scientifically grounded lifestyle companion. It bridges evidence-based preventative wellness with daily habit tracking, intentionally steering clear of sterile clinical hospital aesthetics or anxiety-inducing medical interfaces. 

The aesthetic blends **Modern Tactile Minimalism** with **Warm Bio-Metric Visuals**:
- **Tone:** Encouraging, objective, calm, and educational. Health metrics never scold; they contextualize trends and empower personal agency.
- **Visual Feel:** Airy, pillowy surfaces paired with rigorous structural hierarchy. The UI uses crisp data points, friendly squircle containers, deep rich typography, and luminous, category-specific semantic color accents to create instant mental categorization without visual chaos.

## Colors

The color system operates on strict functional role assignments, isolating functional feedback from educational domain-level tags.

### Foundation & Neutrals
- **Canvas / App Background:** `#F8FAFC` (Slate 50) — A calm, anti-glare soft slate background that reduces eye strain during dawn/night tracking routines.
- **Card / Module Surfaces:** `#FFFFFF` (Pristine White) — High-purity containers that separate data clusters from the background canvas.
- **Borders & Dividers:** `#E2E8F0` (Slate 200) — Delicate delineations for cards, inputs, and segment dividers.
- **Text Primary:** `#0F172A` (Slate 900) — Deep charcoal slate ensuring WCAG AAA legibility without the harshness of pure `#000000`.
- **Text Secondary & Icons:** `#64748B` (Slate 500) — Subdued, neutral weighting for metadata, time stamps, and unit labels.
- **Text Inactive / Tertiary:** `#94A3B8` (Slate 400) — Disabled states and inactive stepper trails.

### Core Interaction
- **Primary CTA Accent:** `#2563EB` (Precision Blue) — High-trust, medical-grade cobalt used for active interactive states, primary action buttons, focused controls, and affirmative action paths.

### Health Pillar Spectrum
Each wellness pillar owns an uncompromised semantic anchor paired with a 10% opacity tinted surface token for badges, metric backdrops, and progress tracks:
- **Body Composition:** `#2563EB` (Precision Blue) / Background tint: `#EFF6FF`
- **Physical Activity:** `#EA580C` (Energetic Orange) / Background tint: `#FFF7ED`
- **Diet & Nutrition:** `#16A34A` (Leaf Green) / Background tint: `#F0FDF4`
- **Sleep & Recovery:** `#7C3AED` (Serene Indigo) / Background tint: `#F5F3FF`
- **Lifestyle & Habits:** `#D97706` (Warm Amber) / Background tint: `#FFFBEB`
- **Cardiovascular & Vitals:** `#0D9488` (Vitality Teal) / Background tint: `#F0FDFA`

Category colors must never clash within a single card. Each metric card restricts its dominant accent color strictly to its corresponding pillar.

## Typography

The design system utilizes **Plus Jakarta Sans** across all typographic tiers. Its clean geometry combined with subtle calligraphic humanist touches strikes the exact target: rigorous scientific authority paired with approachable warmth.

### Usage Standards
- **Score Readouts:** Use `display-score` for the top-level overall 0–10 or 0–100 wellness index. Enforce tabular figures (`font-variant-numeric: tabular-nums`) so animating or changing scores does not cause horizontal layout shifts.
- **Metric Numerals:** Sub-metric cards (e.g., resting heart rate, water volume, sleep stages) use `metric-numeral` paired directly with a `label-md` unit suffix (e.g., `bpm`, `hrs`, `kg`) aligned to baseline.
- **Educational Badges & Disclaimers:** Use `label-sm` in uppercase or `body-sm` for contextual educational insights. Maintain a high line-height ratio on all explanatory text to preserve effortless scanning for users of all visual abilities.

## Layout & Spacing

The layout is built upon an 8-point spatial rhythm with mobile-first fluidity.

### Layout Philosophy
- **Mobile Handset (< 640px):** Single-column stacked stream. Outer screen margin is strictly `1rem` (16px) to maximize horizontal card utility while avoiding thumb-reach edges. Gutter between stacked modules is fixed at `1rem`.
- **Tablet (640px – 1024px):** 6-column fluid grid with `1.25rem` gutters and `2rem` screen margins. Metric widgets align in symmetrical dual-column pairs.
- **Desktop Dashboard (> 1024px):** 12-column responsive grid with max content container width capped at `1120px` to maintain focused data synthesis.

### Component Spacing Discipline
- **Compact Padding (`space-sm` / 8px):** Category badge pills, micro metric rows, and nested icon counters.
- **Default Card Padding (`space-md` to `space-lg` / 16px to 24px):** Interactive tracking cards use `1.25rem` (20px) internal breathing room, stepping down to `1rem` on narrow devices.
- **Section Headers:** Space between category headline and first child component is consistently `space-sm` (8px), maintaining clear perceptual grouping (Gestalt proximity).

## Elevation & Depth

To avoid visual fatigue and retain an optimistic, lightweight aesthetic, depth is rendered through **tonal stacking** complemented by **diffused ambient shadows** and **subtle surface borders**.

### Layering Hierarchy
1. **Canvas (Base Level 0):** `#F8FAFC`. Completely matte, recessed.
2. **Standard Metric Cards (Elevation Level 1):** `#FFFFFF` background with a mandatory `1px solid #E2E8F0` border. Shadow signature: `0px 2px 8px -2px rgba(15, 23, 42, 0.04), 0px 4px 16px -4px rgba(15, 23, 42, 0.06)`. This subtle double-drop produces a soft physical presence without dark muddiness.
3. **Interactive & Lifted Elements (Elevation Level 2 - Active/Floating Cards, Sticky Navs):** `#FFFFFF` with `1px solid #CBD5E1`. Shadow signature: `0px 8px 24px -4px rgba(15, 23, 42, 0.08), 0px 2px 6px -1px rgba(15, 23, 42, 0.04)`.
4. **Modal Overlays & Bottom Action Sheets (Elevation Level 3):** `#FFFFFF` elevated with a protective backdrop veil of `rgba(15, 23, 42, 0.4)` and ambient shadow `0px 20px 40px -8px rgba(15, 23, 42, 0.16)`.

Dark modes or hard saturated drop shadows are explicitly forbidden; depth must remain featherweight and clean.

## Shapes

The geometric signature uses expressive squircle curves that signal safety, comfort, and human-centric wellness.

- **Base Radius (0.5rem / 8px):** Small inner elements, inline chips, tooltip corners, and checkbox boxes.
- **Card Radius (`rounded-2xl` / 1rem / 16px):** Primary container curvature for standard sub-metric blocks, form inputs, and notification panels.
- **Hero & Featured Container Radius (`rounded-3xl` / 1.5rem / 24px):** Overall score cards, summary chart frames, and bottom sheets.
- **Pill Radius (Full / 9999px):** All standalone buttons, segmented switch thumbs, disclaimer warning badges, and pillar tags.

## Components

### Buttons
- **Primary Action:** Pill-shaped (`rounded-full`), height `48px` (touch-optimized). Filled with Precision Blue (`#2563EB`) text in pure white (`#FFFFFF`), `label-lg` font weight. Micro-interaction: Subtle scale down (`active:scale-[0.98]`) with no harsh outline.
- **Secondary / Ghost Action:** Pill-shaped, surface `#FFFFFF`, border `1px solid #E2E8F0`, text `#0F172A`. Hover transitions surface to `#F1F5F9`.

### Category Pill Badges & Chips
- Fully rounded (`9999px`), padding `4px 12px`.
- Composed of the health pillar’s background tint paired with its solid primary text token (e.g., Diet chip: background `#F0FDF4`, label text `#16A34A`, border `1px solid rgba(22, 163, 74, 0.15)`).
- Prefix icons are sized at `14px` matching the label color.

### Segmented Controls
- Contained in a `#F1F5F9` pill rail with `4px` internal inset padding.
- Selected segment sits on an elevated `#FFFFFF` pill with `box-shadow: 0 1px 3px rgba(0,0,0,0.08)`. Text transitions from `#64748B` to `#0F172A` with `font-weight: 600`.

### Health Metric Cards
- Surface `#FFFFFF`, border `1px solid #E2E8F0`, radius `1.25rem` (20px).
- Upper rail: Category icon enclosed in a `32px` tinted circle + Pillar title (`label-md`) + optional timestamp or sync badge.
- Center: Numerical metric (`metric-numeral`) alongside bold unit indicators.
- Lower rail: Mini sparkline, target progress bar, or qualitative indicator (e.g., "Optimal", "Needs Attention").

### Steppers & Sliders
- **Progress Track:** Height `8px`, track background `#E2E8F0`, dynamic fill colored according to active health pillar with a rounded end cap.
- **Interactive Thumb:** `24px` circular pristine white thumb with a solid category-colored central dot (`8px`) and elevation shadow `0 2px 6px rgba(0,0,0,0.15)`.

### Form Fields & Loggers
- Height `48px`, border `1.5px solid #E2E8F0`, radius `0.75rem` (12px), background `#FFFFFF`.
- Focus state: Border shifts cleanly to `#2563EB` with an ambient ring: `box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12)`.

### Educational Wellness Disclaimer Badges
- Designed to inform rather than alarm.
- Composed of a soft rounded container (`rounded-xl`), background `#F8FAFC`, border `1px solid #E2E8F0`.
- Prefixed by a calm informational icon (e.g., light blue info ring or teal leaf) with copy set in `body-sm` (`#64748B`), leading with an explicit note that insights are lifestyle markers rather than diagnostic pronouncements.