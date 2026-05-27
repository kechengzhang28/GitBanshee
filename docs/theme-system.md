# Theme System

## Overview

Each theme is a single CSS file containing custom properties that control every visual element: DOM components, Tailwind utilities, and Canvas-rendered graphs.

Themes live in two locations:

- `ui/src/themes/` — built-in themes shipped with the application (read-only)
- `~/.gitbanshee/themes/` — user-created or imported themes (read-write)

`ui/src/themes/template.css` serves as the canonical reference — listing every variable with its default value and a description. Users copy it as a starting point for custom themes.

## Variable Hierarchy

| Tier | Count | Variables |
|------|-------|-----------|
| **Required** | 3 | `bg`, `accent`, `text` |
| **Optional** | ~17 | `panel`, `hover`, `border`, `text-sec`, `text-muted`, `accent-h`, `input`, `toolbar`, `success`, `danger`, `warning`, `branch-0` ~ `branch-5` |

### Auto-Derivation

Optional variables are computed from the three required ones unless explicitly set:

| Optional | Derivation |
|----------|-----------|
| `panel`, `toolbar` | Luminance offset from `bg` |
| `input` | Inverse luminance direction from `panel` |
| `hover`, `border` | Blend of background and text colors |
| `text-sec`, `text-muted` | `text` at reduced opacity |
| `accent-h` | Luminance shift from `accent` |
| `success`, `danger`, `warning` | Hue-preset, saturation adaptive to light/dark |
| `branch-0` ~ `branch-5` | 6 hues evenly distributed around `accent` |

Setting any optional variable explicitly overrides the derivation.

## Theme File Format

A standard CSS file. Only `bg`, `accent`, and `text` are mandatory:

```css
/* ~/.gitbanshee/themes/ocean.css */
:root {
  --gb-bg: #1a1d23;
  --gb-accent: #3b96d1;
  --gb-text: #d4d4d4;
  --gb-border: #ff0000;
}
```

Invalid values or missing required variables produce a validation message in the theme picker rather than a broken UI.

## Loading Mechanism

1. On startup, scan both theme directories for `.css` files. Merge into a single theme list.
2. Load the last-selected theme (persisted in settings): parse required variables, derive unset optional ones, inject the complete CSS as a `<style>` block.
3. On theme switch, remove the old `<style>` and inject the new one. Canvas reads live values via `getComputedStyle` — no page reload.
4. When a user theme file is edited, the application detects the change and re-injects the styles. This creates an edit-preview loop with no restart needed.

## Integration with Tailwind

Tailwind's color palette references `var()`, so `bg-gb-bg` and similar classes always resolve to the current theme at runtime. The build output is independent of any specific theme.
