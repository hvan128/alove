# OrderVoice Design System

## Intent

An Apple-like operational surface: quiet, accurate and high-trust. The goal is not Apple marketing imitation. It adapts the useful rules from the Apple design reference—restraint, a single action blue, careful typography and calm depth—to a dense, evidence-driven workflow UI.

## Tokens

| Token family | Values | Use |
|---|---|---|
| Canvas | `#ffffff`, `#f5f5f7`, `#fafafc`, `#1d1d1f` | page/surface/media well |
| Action | `#0066cc`, focus `#0071e3` | buttons, links, focus only |
| Semantic | green, amber, red, violet | status and confidence only |
| Type | Geist/system, 12/14/17/21/34 px | metrics, UI, body, headings |
| Space | 4/8/12/16/24/32/48 px | gap/padding rhythm |
| Radius | 8/12/18/9999 px | utility, panel, media, action |
| Depth | hairline + frosted sticky bar | hierarchy; no card shadows |

The app applies the tokens through CSS custom properties in `globals.css`, so dark mode can alter semantic surfaces without component rewrites.

## Shared components

| Component | Responsibility |
|---|---|
| `AppShell` | top navigation, responsive workspace frame |
| `Button` / `IconButton` | consistent actions, loading/disabled/focus states |
| `Panel` / `SectionHeader` | semantic labelled regions and optional actions |
| `StatusDot` / `StatusPill` | source and order state with accessible text |
| `FieldEvidence` | value, confidence, evidence quote and correction state |
| `TranscriptLane` | speaker-labelled provisional/final transcript display |
| `Input` / `Select` | native-label form controls with validation messaging |
| `Callout` | informative/warning/error status without alarmist chrome |

## Interaction rules

- Interactive target is at least 44px tall/wide.
- Button press may scale to `0.98`; animation respects `prefers-reduced-motion`.
- Focus uses a visible blue ring; no action depends on colour alone.
- Destructive/irreversible export uses text confirmation/state and is disabled before approval.
- Live transcript uses `aria-live="polite"`; partial content is visually and semantically labelled “Tạm thời”.

## Responsive rules

- Desktop (>= 1180px): three columns, center draft widest.
- Tablet (768–1179px): conversation and draft stack; ERP/reply becomes side drawer/section.
- Phone (< 768px): source strip and approval bar remain visible; panels become segmented sections.

`/design-system` is the executable catalogue and primary visual regression target.
