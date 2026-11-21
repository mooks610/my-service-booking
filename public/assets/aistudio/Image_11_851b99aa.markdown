---
name: Resource Hub
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#006a61'
  on-secondary: '#ffffff'
  secondary-container: '#86f2e4'
  on-secondary-container: '#006f66'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#2f1500'
  on-tertiary-container: '#c76c00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#89f5e7'
  secondary-fixed-dim: '#6bd8cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style
The design system targets fast-paced workplace environments where frictionless scheduling of meeting spaces and communal assets is mission-critical. Its visual voice balances operational precision with fresh vitality—dispelling the friction and visual fatigue commonly found in legacy enterprise administration tools.

The design movement combines **Corporate Modern** rigor with **Tactile Utility**:
- **Clarity over ornamentation**: High information density balanced by structured hierarchy and whitespace.
- **Immediate cognitive feedback**: Status states (available, in-use, imminent) are instantly identifiable across cards, calendars, and tables without reading verbose descriptions.
- **Executive composure with vibrant momentum**: The foundation rests on steady slate and navy hues, punctuated by purposeful emerald and teal accents that reward action.

## Colors
The color palette anchors workflows through high-contrast structural values and high-visibility status tokens.

- **Primary (`#0F172A`)**: The authority color used for primary navigation, core structural headers, high-priority buttons, and dominant typography.
- **Secondary / Accent (`#0D9488`)**: The energizing teal applied to primary conversion points, successful actions, active calendar slot selections, and positive confirmations.
- **Tertiary / Warning (`#D97706`)**: Warm amber for time-critical alerts, upcoming bookings starting within 10 minutes, and temporary holds.
- **Neutral (`#64748B`)**: Structural slate used for muted labels, secondary metadata, table borders, and inactive status indicators.

### Status Semantic Roles
- **Available (`#059669` / `#ECFDF5`)**: Soft mint surface with deep emerald text/border, indicating one-tap reservation capability.
- **Occupied / Reserved (`#64748B` / `#F1F5F9`)**: Neutral slate wash, communicating settled occupancy without aggressive visual noise.
- **Imminent / Expiring (`#D97706` / `#FFFBEB`)**: Warm amber highlight prompting extension or rapid check-in.

## Typography
The system uses **Inter** throughout for uniform rendering across modern operating systems, optimized vertical metrics, and tabular numeral support crucial for timeline grids and booking timestamps.

- **Tabular Figures (`tnum`)**: Mandatory for all timeline views, clock readouts, room capacities, and duration tags to prevent horizontal jitter during updates.
- **Hierarchy Distinction**: Headlines utilize tighter negative tracking (`-0.01em` to `-0.02em`) and medium/semibold weights to maintain editorial punch. Small labels and status badges employ uppercase styling with slight positive letter spacing (`0.04em`) to safeguard legibility at glance speed.

## Layout & Spacing
The layout model employs a responsive fluid grid system designed for data density without visual clutter:

- **Desktop (1024px+)**: 12-column grid with `gutter-desktop` (1.5rem / 24px) and max-width canvas container capped at 1440px. Timeline schedules and resource list views sit side-by-side or in structured multi-column arrays.
- **Tablet (768px – 1023px)**: 8-column layout with 1rem gutters and 1.5rem side margins. Collapsible quick-filter drawers replace persistent left rails.
- **Mobile (< 768px)**: 4-column layout with 1rem edge margins. Timelines collapse into hour-by-hour vertical feeds, and booking actions dock to a sticky bottom sheet.

Content reflows predictably along strict multiples of 4px and 8px to guarantee baseline alignment across tabular matrices and reservation ribbons.

## Elevation & Depth
Visual hierarchy is established primarily through **tonal layering** and **low-contrast micro-outlines**, avoiding deep or theatrical shadows that degrade enterprise scannability.

- **Level 0 (Base Canvas)**: Clean off-white surface (`#F8FAFC`).
- **Level 1 (Card & Row Surfaces)**: Solid pure white (`#FFFFFF`) with a subtle 1px border (`#E2E8F0`). Zero shadow at rest.
- **Level 2 (Hover & Active Drag States)**: Soft ambient tint (`0 4px 12px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.04)`) with an accented border highlight.
- **Level 3 (Modals, Overlays & Sticky Bars)**: Elevated dialogs floating on top of a 30% slate backdrop blur (`backdrop-blur-sm`), supported by an ambient drop shadow (`0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)`).

## Shapes
The design system adheres to a **Soft (`roundedness: 1`)** standard. This restraint enforces a structured, architectural feel that keeps dense grid lines, calendar blocks, and equipment inventories crisp and aligned.

- **Base Elements (`0.25rem` / 4px)**: Checkboxes, table row selector badges, time scrubber handles.
- **Cards, Buttons, Inputs (`0.5rem` / 8px - `rounded-lg`)**: Primary containers, rapid-action buttons, filter inputs, and modal dialog envelopes.
- **Floating Overlays & Drawers (`0.75rem` / 12px - `rounded-xl`)**: Quick-booking drawers, popovers, and floating confirmation panels.

## Components

### Buttons
- **Primary ("Instant Book")**: Solid Teal (`#0D9488`) background, white text, 8px border radius, 40px height for standard touch target. Hover brings a subtle darken to `#0F766E`.
- **Secondary ("Details / Modify")**: White background, 1px border (`#CBD5E1`), Navy text (`#0F172A`).
- **Ghost ("Dismiss / Cancel")**: Transparent background with muted slate text (`#64748B`), brightening to navy on hover.

### Status Chips & Badges
- Compact pills with `0.25rem` corner radius and `label-sm` font sizing.
- **Available**: Surface `#ECFDF5`, text `#047857`, featuring a leading 6px pulsing emerald dot.
- **Occupied**: Surface `#F1F5F9`, text `#475569`, static slate ring.
- **Imminent**: Surface `#FFFBEB`, text `#B45309`, with a subtle warning glyph.

### Resource Action Cards
- White background framed with `#E2E8F0` border.
- Divided into three visual zones: Resource Title + Capacity Pill (Top), Current Status + Next Available Slot (Middle), and One-Click Quick Book CTA (Bottom right).
- When hovered, the card frame turns `#0D9488` with a 1px inner stroke.

### Timeline Grid & Schedule Matrix
- Continuous horizontal 15/30-minute block increments.
- Available segments feature a light dashed column divider with hover feedback (`#CCFBF1` highlight) indicating instantaneous reservation span.
- Confirmed meetings display as solid slate-blue blocks with organizer avatar and time stamp.

### Input Fields & Selectors
- Height 40px, 8px border-radius, `#F8FAFC` base surface transitioning to `#FFFFFF` on focus.
- 1px neutral border (`#CBD5E1`), shifting to 2px Teal outline (`#0D9488`) with zero outer ring glow to maintain surgical line precision.

### Quick Reservation Modal
- Bottom sheet on mobile; centered 480px width sheet on desktop.
- Header contains resource image, location specs, and amenity badges (Projector, Whiteboard, Video Conference).
- Central body contains slider for instant duration selection (15 min, 30 min, 1 hr, 2 hr) with total end-time preview highlighted in bold typography.