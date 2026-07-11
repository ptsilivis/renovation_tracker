# Design system — Kampos Hub

Aegean theme. Restrained color strategy (tinted neutrals + teal, terracotta as
the single accent). Light theme: daytime household use, calm and legible.

## Color (source of truth: `frontend/css/styles.css` `:root`)

Neutrals are tinted toward the brand hue; never pure `#000`/`#fff`.

- Surface `--bg #f3f5f5`, card `--card #ffffff`, panel `--panel #f2f5f6` (cooler second layer for toolbars/headers)
- Ink `--ink #1d2b31`, muted `--muted #6d7f86`, faint `--muted2 #93a5ab`
- Brand teal `--teal #1f4e5f`, pressed `--teal-dark #173d4b`, cream-on-teal `--cream #f5f2e9`
- Accent terracotta `--accent #a4442f`, soft `--accent-soft #f6e9e4`
- Semantic: `--ok #2f7d4f` (under budget / done), `--warn #b7791f` (in progress)
- Lines `--line #e2e7e8`, `--line2 #e9edee`

Accent is for primary actions, current selection, over-budget/variance, likes,
destructive hover only. Never decorative.

## Typography

- Headings: Literata (serif), 700. Body/UI/data: Noto Sans. Base 14px / 1.45.
- Page title 22px, card heading 14px, labels 11px uppercase tracked.
- `.tnum` (tabular-nums) on all money and counts.

## Elevation & shape

- Card radius 14px, controls 8–10px, pills/chips 999px.
- Shadow `--shadow: 0 1px 2px rgba(35,32,26,0.05)`. Interactive lift adds a second
  soft shadow on hover only.

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
Focus-visible uses a 2px teal ring (`box-shadow: 0 0 0 2px --bg, 0 0 0 4px --teal`)
so keyboard users always see focus even though inputs drop the native outline.
