# Can Cabañeros — Style Reference
> Organic home kitchen: olive branches on warm linen, sage leaves and terracotta pots — fresh, calm and welcoming

**Theme:** light + dark (class-based toggle)

Layout, type and shape rules derive from the Foodnoms reference (dense iOS-style components, flat surfaces, 26px radius). The **palette** is Can Cabañeros' own organic olive scheme below, replacing the original warm orange / white porcelain one. Warm Linen replaces pure white so the app never feels cold or clinical, and dark mode uses olive-tinted basalt instead of pure black.

## Tokens — Colors

All values meet WCAG AA (≥ 4.5:1) for text in the role described. Accents have a **light** and a **dark** value; the dark value is applied automatically by redefining the token under `.dark`.

### Accents

| Name | Light | Dark | Token | Role |
|------|-------|------|-------|------|
| Verde Oliva Cálido | `#556B2F` | `#A3B86C` | `--color-olive` | Primary accent: filled buttons, active nav, links, toggles on, progress, success/"Listo" states |
| Terracota Suave | `#A4503A` | `#D9876C` | `--color-terracotta` | Secondary states and warnings: "caduca pronto", "Faltan N", missing ingredients/utensils |
| Ladrillo | `#A3352A` | `#E5776A` | `--color-brick` | Errors, expired items, destructive actions |
| On Accent | `#F7F6F0` | `#121511` | `--color-on-accent` | Text/icons on any filled accent (flips to dark on the lighter dark-mode accents) |
| Salvia | `#8A9A86` | `#8A9A86` | `--color-sage` | Muted text and secondary labels in dark mode; decorative/large elements in light mode |

**Terracota note:** the brief's base Terracota Suave `#C86D51` only reaches 3.4:1 against Linen, so it is never used for small text. Light mode uses the deeper `#A4503A` (5.1:1) and dark mode the lighter `#D9876C` (5.8:1 on Moss). `#C86D51` remains the reference hue for illustrations or large decorative fills.

**Salvia note:** Salvia on Linen is 2.75:1, too low for text. In light mode muted text is Grafito Cálido at 50–60% opacity; in dark mode Salvia is the muted text color (5.4:1 on Moss).

### Neutrals

| Name | Value | Token | Role |
|------|-------|-------|------|
| Warm Linen | `#F7F6F0` | `--color-linen` | Light page background, inputs inside cards, sheets. Replaces pure white |
| Oat | `#ECEADF` | `--color-oat` | Light cards, accordions, segmented controls, search fields |
| Line | `#E2DFD3` | `--color-line` | Light hairline borders (header, sidebar, tab bar) |
| Grafito Cálido | `#2B2D2F` | `--color-ink` | Primary text in light mode (12.8:1 on Linen); 50–60% opacity for secondary text |
| Basalto | `#121511` | `--color-basalt` | Dark page background |
| Oliva Oscuro | `#1E231C` | `--color-moss` | Dark cards, accordions, sheets |
| Oliva Oscuro +1 | `#2A3127` | `--color-moss-light` | Dark inputs, raised controls, borders |
| Oliva Oscuro +2 | `#3A4336` | `--color-moss-lighter` | Dark active segment |

## Tokens — Typography

### Aquawax Pro Medium — Aquawax Pro Medium — detected in extracted data but not described by AI · `--font-aquawax-pro-medium`
- **Weights:** 500
- **Sizes:** 17px, 20px
- **Line height:** 1.6, 1.8
- **OpenType features:** `"blwf", "cv03", "cv04", "cv09", "cv11", "dlig", "ss01", "ss02", "ss03"`
- **Role:** Aquawax Pro Medium — detected in extracted data but not described by AI

### Aquawax Pro — Primary brand typeface used across all display, heading, and body contexts. The custom face has a wide x-height, rounded geometric forms, and friendly proportions. Bold (700) is used for the 60px display and 30px section headlines — these are the system's typographic anchors. DemiBold (600) handles subheadings and button labels at 14–16px. Medium (500) carries body copy at 17–20px with generous 1.6–1.8 line-height for comfortable reading. · `--font-aquawax-pro`
- **Substitute:** Nunito Sans, or DM Sans
- **Weights:** 700, 500, 600
- **Sizes:** 12, 14, 16, 17, 18, 20, 22, 30, 60
- **Line height:** 1.2 / 1.4 / 1.6 / 1.8
- **OpenType features:** `"blwf", "cv03", "cv04", "cv09", "cv11", "dlig", "ss01", "ss02", "ss03", "ss07"`
- **Role:** Primary brand typeface used across all display, heading, and body contexts. The custom face has a wide x-height, rounded geometric forms, and friendly proportions. Bold (700) is used for the 60px display and 30px section headlines — these are the system's typographic anchors. DemiBold (600) handles subheadings and button labels at 14–16px. Medium (500) carries body copy at 17–20px with generous 1.6–1.8 line-height for comfortable reading.

### System sans-serif — Fallback for very small UI text and icon labels. Aquawax Pro is not used at micro sizes; system font handles them to keep render weight low. · `--font-system-sans-serif`
- **Weights:** 400, 700
- **Sizes:** 12
- **Line height:** 1.2
- **Role:** Fallback for very small UI text and icon labels. Aquawax Pro is not used at micro sizes; system font handles them to keep render weight low.

### Aquawax Pro DemiBold — Aquawax Pro DemiBold — detected in extracted data but not described by AI · `--font-aquawax-pro-demibold`
- **Weights:** 600
- **Sizes:** 14px, 16px
- **Line height:** 1.2, 1.4
- **OpenType features:** `"blwf", "cv03", "cv04", "cv09", "cv11", "dlig", "ss01", "ss02", "ss03", "ss07"; "blwf", "cv03", "cv04", "cv09", "cv11", "dlig", "ss01", "ss02", "ss03"`
- **Role:** Aquawax Pro DemiBold — detected in extracted data but not described by AI

### Type Scale

| Role | Family | Weight | Size | Line Height | Letter Spacing | Token |
|------|--------|--------|------|-------------|----------------|-------|
| tiny | — | — | 12px | 1.2 | — | `--text-tiny` |
| caption | — | — | 14px | 1.2 | — | `--text-caption` |
| body-sm | — | — | 16px | 1.4 | — | `--text-body-sm` |
| subheading | — | — | 20px | 1.8 | — | `--text-subheading` |
| heading-sm | — | — | 22px | 1.2 | — | `--text-heading-sm` |
| heading | — | — | 30px | 1.2 | — | `--text-heading` |
| display | — | — | 60px | 1.2 | — | `--text-display` |

## Tokens — Spacing & Shapes

**Base unit:** 8px

**Density:** comfortable

### Spacing Scale

| Name | Value | Token |
|------|-------|-------|
| 8 | 8px | `--spacing-8` |
| 24 | 24px | `--spacing-24` |
| 32 | 32px | `--spacing-32` |
| 40 | 40px | `--spacing-40` |
| 48 | 48px | `--spacing-48` |
| 56 | 56px | `--spacing-56` |
| 64 | 64px | `--spacing-64` |
| 96 | 96px | `--spacing-96` |

### Border Radius

| Element | Value |
|---------|-------|
| tags | 26px |
| cards | 26px |
| inputs | 26px |
| buttons | 26px |

### Layout

- **Page max-width:** 1200px
- **Section gap:** 96px
- **Card padding:** 32px
- **Element gap:** 20px

## Components

### Brand Wordmark
**Role:** Site identity in header and footer

Logomark: a rounded olive square (color: Verde Oliva) containing a white bar-chart icon. Wordmark: 'Foodnoms' in Aquawax Pro Bold, 18px, Grafito Cálido (#2B2D2F), sitting to the right of the icon. Total lockup height ~32px.

### Header Filled Button
**Role:** Primary brand action in the navigation bar

Filled Verde Oliva (#556B2F) background, Warm Linen text 'Get the App' in Aquawax Pro DemiBold at ~16px, arrow icon after label. 26px border-radius, ~12px vertical padding, ~20px horizontal padding. Sits at the far right of the header.

### Ghost Nav Link
**Role:** Secondary navigation items

No background, Grafito Cálido (#2B2D2F) text, Aquawax Pro Medium ~16–17px, no underline. Hover/active state not detected; default is text-only.

### App Store Badge
**Role:** Download CTA in the hero

Dark Grafito Cálido (#2B2D2F) rounded rectangle (~26px radius), Apple logo in white, 'Download on the App Store' text in white Aquawax Pro. ~56px tall. Sits centered beneath the hero subheadline.

### Two-Tone Display Headline
**Role:** Hero page title

60px Aquawax Pro Bold, line-height 1.2. First phrase ('Lose Weight') in Verde Oliva (#556B2F), second phrase ('with Foodnoms') in Grafito Cálido (#2B2D2F). Center-aligned, max-width constrained to keep the color split legible.

### Section Accent Heading
**Role:** Feature section titles

30px Aquawax Pro Bold. Often appears in Verde Oliva (#556B2F) or a mix of two chromatic colors to maintain the brand's two-tone headline pattern. 'Effortlessly' in one accent, 'Scan Food' in another.

### Phone Mockup Carousel
**Role:** Visual showcase of the app interface

Full device-frame iPhone renders at ~280px width, fanned out with slight overlap and rotation. No background card — they float directly on the linen page. Contain the full app UI including status bar, navigation, and content screens.

### Press Logo Grid
**Role:** Social proof / media mentions

2-row × 3-column grid of grayscale publication logos (MacStories, iMore, 9TO5Mac, POPSUGAR, Good Housekeeping, Prevention). Rendered in Charcoal (#000000) or Grafito Cálido (#2B2D2F), evenly spaced with ~64px column gap. Heading 'As Featured By' in Verde Oliva above.

### Download CTA Card
**Role:** Sticky promotional banner

Warm Linen card with subtle Oat (#ECEADF) background, 26px radius, ~32px padding. Contains a headline ('Get Started with Foodnoms Today'), subtext, and a filled Verde Oliva 'Download' button with arrow icon. Sits at the bottom of the page above feature sections.

### App-Internal Data Card
**Role:** Nutrition summary panel (shown inside phone mockups)

Warm Linen card with ~26px radius, light gray dividers. Contains large bold metric (e.g. '57g' for fat grams) in Verde Oliva or Terracota depending on positive/negative status, with secondary label text in Grafito Cálido at ~12–14px.

### Macro Category Ring
**Role:** Circular progress indicator for nutrition goals

Circular ring showing progress toward a macro goal (Calories, Carbs, Fat, Protein). Each category has a distinct color: Terracota for Calories, Sky Blue for Carbs, Verde Oliva for Fat, Plum for Protein. Ring stroke ~8px, centered numeric value inside in Aquawax Pro Bold.

### Food Log Entry Row
**Role:** List item showing a logged food

Warm Linen row with bottom hairline border in Oat (#ECEADF). Left side: food name in Grafito Cálido Aquawax Pro Medium ~17px, with macro subtext below in lighter gray ~14px. Right side: colored dot indicating macro category, with point values in matching color.

### Tab Bar
**Role:** Bottom navigation in the app

Warm Linen bar with three tab icons (Food Log, Insights, Library), separated by thin gray dividers. Active tab indicated by Verde Oliva fill/icon color and small dot indicator. Right edge has a floating Verde Oliva circular '+' button for adding food.

### Goal Setup Card
**Role:** Onboarding/setting screen container

Warm Linen card, 26px radius, ~40px padding. Contains a heading, body text explaining the goal option, and a filled Verde Oliva button ('Use Recommended Goal') stacked above a text-style 'Choose a Custom Goal' link. Decorative donut/breakfast icon at top.

## Do's and Don'ts

### Do
- Use 26px border-radius on every interactive element and card — this is the system's signature softness
- Apply the two-tone headline pattern: one color for the outcome word, Grafito Cálido (#2B2D2F) for the rest
- Use Aquawax Pro Bold at 60px for hero displays and 30px for section headings — never interpolate intermediate sizes
- Pair Verde Oliva (#556B2F) with positive/progress data and Terracota (#A4503A) with negative/overage data inside app screens
- Use generous 96px section gaps between major page sections to let phone mockups breathe
- Keep all text on Warm Linen (#F7F6F0) or Oat (#ECEADF), or Basalto/Oliva Oscuro in dark mode — never place chromatic text on chromatic backgrounds
- Show 3+ phone mockups side-by-side in the hero, slightly overlapping, to demonstrate the breadth of the app experience

### Don't
- Don't use pure white (#ffffff) or pure black (#000000) backgrounds — use Warm Linen and Basalto
- Don't use Terracota Suave #C86D51 or Salvia for small text on light backgrounds — they fail AA; use the token values above
- Don't use box-shadows or drop-shadows anywhere — the system is deliberately flat
- Don't use a border-radius other than 26px on buttons, cards, tags, or inputs
- Don't call any color a 'CTA' or 'primary action' in the token system — describe them by their brand role instead
- Don't use Aquawax Pro at sizes below 12px — fall back to system sans-serif for micro UI
- Don't place chromatic text on a chromatic background — always pair color text with Linen/Oat (light) or Basalto/Oliva Oscuro (dark)
- Don't use gradient backgrounds or gradient buttons — the system is solid color only
- Don't introduce new chromatic colors for marketing pages — the olive / linen / sage / terracotta palette is complete

## Surfaces

| Level | Light | Dark | Purpose |
|-------|-------|------|---------|
| 0 | Warm Linen `#F7F6F0` | Basalto `#121511` | Page canvas |
| 1 | Oat `#ECEADF` | Oliva Oscuro `#1E231C` | Cards, accordions, grouped lists |
| 2 | Warm Linen `#F7F6F0` | Oliva Oscuro +1 `#2A3127` | Inputs and controls inside a card |
| 3 | Verde Oliva `#556B2F` | Verde Oliva `#A3B86C` | Filled primary buttons |

## Dark Mode

- Toggled by a `.dark` class on `<html>` (header sun/moon button, persisted in `localStorage`, defaults to the system preference). Tailwind's `dark:` variant targets that class.
- Backgrounds are olive-tinted basalt, never pure black: page `#121511`, cards `#1E231C`, controls `#2A3127`.
- Text is Warm Linen; secondary text is Salvia.
- Accent tokens switch to their lighter dark values and text on filled accents flips to Basalto, so filled buttons stay ≥ 8:1.
- Borders and dividers use white at 5–15% opacity or Oliva Oscuro +1.
- The browser/status-bar `theme-color` follows the theme (`#F7F6F0` / `#121511`).

## Elevation

The system is deliberately flat. No box-shadows are used anywhere — depth is created through color contrast and the 26px radius instead of drop shadows. This keeps the page feeling light, fast, and friendly.

## Imagery

The visual language is dominated by high-fidelity iPhone device-frame mockups showing the live app interface — these are the heroes, not stock photography. The mockups are rendered at near-full opacity, fanned out with slight overlap and gentle rotation, floating directly on white. Inside the mockups, the app's own UI provides all the visual richness: nutrition data, food photos, macro rings, and colorful category tags. The only photographic content is user-submitted food imagery visible within the app's 'Scan Your Food' camera screen. No lifestyle photography, no abstract illustrations, no decorative graphics. The brand identity is carried entirely by the custom typeface, the olive/linen/terracotta color system, and the app's own interface.

## Layout

The page is a single-column, centered max-width layout (~1200px) with generous vertical rhythm. The header is a thin top bar with logo left, nav center, and filled orange action button right. The hero is a centered stack: two-tone display headline, single-line subhead, App Store badge, then a row of 3–5 phone mockups fanned across the full width. Below the hero, a centered 'As Featured By' press logo section in a 2×3 grid. Feature sections follow in a repeating pattern: two-column text + phone mockup, alternating sides, with section accent headings in olive/terracotta. The final element before the footer is a full-width download CTA card. Section gaps are large (96px) creating a spacious, gallery-like feel. The navigation is a minimal top bar — no sidebar, no mega-menu.

## Agent Prompt Guide

## Quick Color Reference

- Background: `#F7F6F0` Warm Linen (dark: `#121511` Basalto)
- Cards: `#ECEADF` Oat (dark: `#1E231C` Oliva Oscuro)
- Primary text: `#2B2D2F` Grafito Cálido (dark: `#F7F6F0`)
- Primary accent (buttons, active nav, success): `#556B2F` Verde Oliva (dark: `#A3B86C`)
- Secondary state / warning: `#A4503A` Terracota (dark: `#D9876C`)
- Error / expired: `#A3352A` Ladrillo (dark: `#E5776A`)
- Muted: Grafito at 50–60% (dark: `#8A9A86` Salvia)

## Example Component Prompts

1. **Hero Section**: Warm Linen (#F7F6F0) background. Two-tone headline at 60px Aquawax Pro Bold, line-height 1.2: first phrase in Verde Oliva (#556B2F), second phrase in Grafito Cálido (#2B2D2F), centered. Subtext in Grafito Cálido Aquawax Pro Medium 17px, line-height 1.6. Dark Grafito Cálido (#2B2D2F) App Store badge below, 26px radius, ~56px tall. Row of 3–5 iPhone mockups fanned across the width below.

2. **Feature Section Heading**: 30px Aquawax Pro Bold, line-height 1.2, in Verde Oliva (#556B2F) for the first word and Grafito Cálido (#2B2D2F) for the second word, left-aligned. 96px top padding from previous section.

3. **Filled Brand Button**: Verde Oliva (#556B2F) background, Warm Linen text in Aquawax Pro DemiBold 16px, line-height 1.2, 26px border-radius, 12px vertical padding, 20px horizontal padding, with a small white arrow icon after the label.

4. **Press Logo Grid**: 2 rows × 3 columns of grayscale publication logos in Charcoal (#000000) or Grafito Cálido (#2B2D2F), 64px column gap, centered. Heading 'As Featured By' above in Verde Oliva (#556B2F) at 20px Aquawax Pro Medium.

No distinct primary action color was observed; use the extracted neutral button treatments instead of inventing a filled CTA color.

## Two-Tone Headline System

A signature convention across the site: split a headline into two phrases, color the first (the verb/outcome) in a chromatic accent and the second (the object/brand) in Grafito Cálido. The accent color signals the *action* or *result*, while the dark second phrase anchors the sentence. Typical pairings: Verde Oliva + Grafito Cálido for the hero (growth/winning), Verde Oliva + Grafito Cálido for feature sections (action/enablement), or Verde Oliva + Verde Oliva for dual-accent section titles like 'Effortlessly Scan Food / Faster with AI'. Never use two chromatic colors as solid blocks of equal weight — the dark phrase is always the longer one.

## Similar Brands

- **MyFitnessPal** — Same single-column marketing page structure with phone mockup hero rows and two-tone headlines over a white canvas
- **Cronometer** — Similar large rounded display typography and warm-primary + cool-accent color logic for nutrition data dashboards
- **Yazio** — Same generous 26px+ corner radius treatment and friendly geometric sans-serif display type for health tracking
- **Notion** — Same flat-shadowless white-canvas approach with colorful accent typography and device-frame product showcases

## Quick Start

### Tailwind v4 (`src/index.css`)

```css
@import 'tailwindcss';
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --color-olive: #556b2f;
  --color-terracotta: #a4503a;
  --color-brick: #a3352a;
  --color-on-accent: #f7f6f0;
  --color-sage: #8a9a86;

  --color-linen: #f7f6f0;
  --color-oat: #eceadf;
  --color-line: #e2dfd3;
  --color-ink: #2b2d2f;

  --color-basalt: #121511;
  --color-moss: #1e231c;
  --color-moss-light: #2a3127;
  --color-moss-lighter: #3a4336;

  --radius-3xl: 26px;
}

.dark {
  color-scheme: dark;
  --color-olive: #a3b86c;
  --color-terracotta: #d9876c;
  --color-brick: #e5776a;
  --color-on-accent: #121511;
}
```

Usage: `bg-linen dark:bg-basalt` for pages, `bg-oat dark:bg-moss rounded-3xl` for cards, `bg-olive text-on-accent rounded-3xl` for primary buttons, `text-terracotta` for warnings.
