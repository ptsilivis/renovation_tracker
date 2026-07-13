# Design system — RenoHub

**Blueprint** theme. A confident architect's blue on cool near-white neutrals;
data is treated monochromatically (no traffic-light colour) so figures read like a
spec sheet. Light theme: daytime household use, calm and legible. Ported from the
Claude Design "RenoHub — Blueprint" source.

## Color (source of truth: `frontend/css/styles.css` `:root`)

Token *names* are inherited from the earlier Aegean theme and reskinned by value,
so `--teal` is now the brand **blue** and `--accent`/`--ok`/`--warn` carry
monochrome data semantics rather than hues.

- Surface `--bg #f4f5f7`, card `--card #ffffff`, panel `--panel #f0f2f5` (second layer for toolbars/headers)
- Ink `--ink #171a20`, muted `--muted #6b7280`, faint `--muted2 #8a94a2`, hairline text `--faint #b9c2ce`
- Brand blue `--teal #2b5bd7`, pressed `--teal-dark #1e47b0`, white-on-blue `--cream #ffffff`
- Soft-blue chips: `--soft-bg #e8eefb`, `--soft-line #d3defa`, `--soft-ink #2450b8`
- Data semantics (monochrome): `--accent #171a20` (over-budget / emphasis),
  `--ok #6b7280` (under-budget), `--warn #2b5bd7` (in-progress). No green/red in data.
- `--danger #c0392b` — **only** validation errors + destructive actions, never data viz.
- Lines `--line #e3e6ea`, `--line2 #eef0f3`; row hover `--row-hover #f8f9fb`, nav hover `--nav-hover #a3b6de`
- Gantt phase bars step through a blue ramp (`js/gantt.js COLORS`).

`--teal` is for primary actions, current selection and active nav. Data emphasis
(over-budget, milestones, today line) uses `--accent` (ink). Never decorative.

## Typography

- Headings + UI: Commissioner (geometric sans), 700/800. Body: Commissioner → Noto Sans fallback. Base 14px / 1.45.
- Page title 22px, card heading 14px, labels 11px uppercase tracked.
- `.tnum` (tabular-nums, **JetBrains Mono**) on all money and counts.

## Elevation & shape

- Card radius 14px, controls 8–10px, pills/chips 999px.
- Shadow `--shadow: 0 1px 2px rgba(23,26,32,0.05)`. Interactive lift adds a second
  soft (blue-tinted) shadow on hover only.

## Motion (added in the polish pass)

- Tokens: `--dur-1 120ms` (feedback), `--dur-2 180ms` (state), `--dur-3 400ms`
  (bar/number reveal). Easing `--ease: cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-quart).
- Transitions on: background, border-color, color, box-shadow, transform. Never on
  layout (width/height/top) except the deliberate stat-bar fill reveal.
- Buttons: hover tint, `:active` press `translateY(1px)`. Cards that are links lift
  on hover. Tab/route change: 160ms content fade. Like: press scale.
- `prefers-reduced-motion: reduce` disables all of the above.

## Component states

Every control ships default / hover / **focus-visible ring** / active / disabled.
Focus-visible uses a 2px blue ring (`box-shadow: 0 0 0 2px --bg, 0 0 0 4px --teal`)
so keyboard users always see focus even though inputs drop the native outline.
