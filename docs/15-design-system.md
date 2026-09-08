# 15 — Design System (Clean & Minimal, Apple-like)

The UI must feel like a native Apple app: calm, spacious, restrained, precise. **Light + dark**, follows the device by default with a manual toggle. This doc is the source of truth for how everything looks; build with the `ui-design` skill. A live mockup accompanies these docs — match its feel.

## Principles
1. **Restraint over decoration.** Whitespace, hierarchy, and typography do the work. One accent color. No gradients-as-decoration, no heavy shadows, no neon.
2. **Content first.** The fan and its state are the hero; chrome recedes.
3. **Deference & clarity.** Controls are obvious and tactile; nothing competes for attention.
4. **Precision.** Consistent spacing, aligned edges, optical balance. Details are the design.
5. **Calm motion.** Short, soft, purposeful. Respect `prefers-reduced-motion`.

## Color tokens (define as CSS variables; theme via `:root` + `[data-theme]` + `prefers-color-scheme`)

### Light
| Token | Value | Use |
|-------|-------|-----|
| `--bg` | `#f5f5f7` | app background |
| `--surface` | `#ffffff` | cards |
| `--surface-2` | `#fbfbfd` | insets, secondary rows |
| `--border` | `rgba(0,0,0,0.08)` | hairlines |
| `--text` | `#1d1d1f` | primary text |
| `--text-secondary` | `#6e6e73` | labels, captions |
| `--text-tertiary` | `#8e8e93` | hints |
| `--accent` | `#0071e3` | primary actions, active state |
| `--accent-press` | `#0058b9` | pressed |
| `--success` | `#34c759` | running / online |
| `--warning` | `#ff9f0a` | timer/LED-on |
| `--danger` | `#ff3b30` | destructive (all-off) |

### Dark
| Token | Value |
|-------|-------|
| `--bg` | `#000000` |
| `--surface` | `#1c1c1e` |
| `--surface-2` | `#2c2c2e` |
| `--border` | `rgba(255,255,255,0.12)` |
| `--text` | `#f5f5f7` |
| `--text-secondary` | `#aeaeb2` |
| `--text-tertiary` | `#8e8e93` |
| `--accent` | `#0a84ff` |
| `--accent-press` | `#409cff` |
| `--success` | `#30d158` · `--warning` `#ffd60a` · `--danger` `#ff453a` |

> Single accent (system blue). Green/amber/red are **status only**, never decoration. Keep saturation low elsewhere.

## Typography
- **Font:** system stack — `-apple-system, "SF Pro Text", "SF Pro Display", Inter, system-ui, sans-serif`. Load **Inter** (Google Fonts) as the cross-platform fallback so non-Apple devices match.
- **Scale (rounded, tight tracking on large sizes):**
  | Role | Size / weight |
  |------|---------------|
  | Display (app title) | 28–32 / 700, letter-spacing -0.02em |
  | Section title | 20 / 600 |
  | Card title (fan name) | 17 / 600 |
  | Body | 15 / 400–500 |
  | Label / caption | 13 / 500, `--text-secondary`, occasionally uppercase +0.04em for tiny meta |
- Numerals: use `font-variant-numeric: tabular-nums` for speed/level readouts.

## Spacing & layout
- **8-pt grid** (4-pt for fine tuning). Card padding 20–24. Gap between cards 16–20.
- **Radii:** cards 18–20px; controls/toggles 12px; pills 999px. Soft, continuous-feeling corners.
- **Max width** ~1100px, centered. **Phone-first**: single column on mobile, 2-up ≥720px, 3-up ≥1080px.
- **Hairlines:** 1px `--border`, never heavy dividers.

## Elevation / shadows
- Light mode: one soft ambient shadow — `0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.06)`. Nothing harder.
- Dark mode: **no drop shadows**; separate with `--surface` vs `--bg` and hairline borders.
- Avoid glows entirely (that's the other direction, not this one).

## Mobile-first (primary target)
Design and build for the phone first; scale **up** to tablet/desktop, never the reverse.
- **Layout:** single column by default; 2-up ≥720px, 3-up ≥1080px. Cards go full-width on phones with 16px side gutters.
- **Thumb reach:** primary actions (power, speed) sit in the comfortable lower/middle zone of the card; the mic/voice button is easy to reach (consider a floating action button bottom-right on mobile). Avoid burying key actions at the very top.
- **Touch targets:** ≥44×44px, with ≥8px spacing so fingers don't mis-tap. The speed segmented control gets full-width segments on mobile.
- **Safe areas / notch:** honor `env(safe-area-inset-*)`; the header and any bottom bar pad for the notch and home indicator. `viewport-fit=cover`.
- **PWA feel:** `display: standalone`, no visible browser chrome; momentum scroll; no horizontal scroll ever; disable text-selection/callouts on controls; add `:active` press states (scale ~0.97) since there's no hover on touch.
- **Performance:** lazy-load the voice/VAD model; keep the initial view light so it paints fast on a phone on cellular.
- **Type:** min 15px body so it's readable without zoom; inputs ≥16px to stop iOS auto-zoom on focus.
- Test at 390×844 (iPhone) first; hover states are enhancements, never required.

## Core components

### Fan card
- White `--surface`, radius 20, generous padding. Structure: header row (fan name + room chip + status dot) → big **power control** → **speed** → a tidy row of secondary toggles (LED, Sleep, Timer).
- **Status dot:** 8px, `--success` when online/running, `--text-tertiary` when off, `--danger` when offline. Paired with a small label.
- **Offline:** dim the card to ~50%, disable controls, one-line reason.

### Power — iOS-style switch
- A pill toggle (like iOS): track `--surface-2`→`--accent` when on, white knob, spring slide (~220ms). Large hit area (≥44px). This is the primary control; give it visual weight.

### Speed — segmented control (1–6)
- iOS segmented style: a `--surface-2` track with a white (light) / `--surface-2`-raised (dark) sliding selector that animates between segments. Active number in `--accent` or bold `--text`. Tabular numerals. Debounced.
- Optional: a slim "level N/6" caption under it in `--text-secondary`.

### Secondary toggles (LED / Sleep / Timer)
- Compact rows or small pill buttons in a 3-across group. Off = `--surface-2` + `--text-secondary`; on = subtle tinted fill (LED→warm amber tint, Sleep→accent tint) — **tint, not glow**. Timer opens a clean popover menu (Off/1h/2h/3h/4h/6h) styled like an iOS action sheet.

### Header / nav
- App title (Display), a segmented **theme toggle** (Auto/Light/Dark) or a single sun/moon button, a **Voice** button, a subtle **Refresh** with a "last updated" caption. Airy, aligned, no clutter.

### Voice modal
- Centered sheet, frosted `backdrop-filter: blur(20px)`, rounded 24. A calm listening indicator (a soft pulsing ring or a minimal 3-bar equalizer in `--accent`) — restrained, not flashy. Live "Heard: …" text, and clean example chips on unknown.

### Empty / connect state (multi-tenant)
- Centered, friendly, minimal: an icon, one line ("Connect your Atomberg account to see your fans"), a primary button. Lots of whitespace.

## Motion
- Durations 150–260ms; easing `cubic-bezier(0.32, 0.72, 0, 1)` (iOS-ish) or `ease-out`. Springs for the power switch and speed selector.
- Optimistic changes animate immediately; rollback fades a toast in.
- **Always** gate non-essential motion behind `@media (prefers-reduced-motion: reduce)`.

## Icons
- Thin line icons (Lucide, 1.5px stroke) sized 18–20, colored `--text-secondary` (active `--accent`). Match SF Symbols' quiet weight. A single fan glyph used consistently.

## Accessibility (non-negotiable, and it makes it look better too)
- Contrast ≥ 4.5:1 for text (check both themes). Hit targets ≥ 44×44.
- Full keyboard operation; visible focus ring (`--accent`, 2px, offset). ARIA labels on every control and the mic.
- Don't encode state by color alone — pair dots with labels.

## Do / Don't
- ✅ Do: whitespace, hairlines, one accent, tabular numerals, subtle spring on toggles, tasteful blur on overlays.
- ❌ Don't: neon glows, multi-color gradients, heavy drop shadows, more than one accent hue, dense layouts, decorative animation.
