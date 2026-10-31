# Design system

The interface is a token-driven glass system with sage/forest brand accents. Recent work
moved surfaces toward neutral glass with teal reserved for brand actions, so always read the
current cascade instead of trusting an old screenshot or report.

## Sources of truth

| File | Contains |
|---|---|
| `src/app/travel-theme.css` | Travel tokens, glass component classes, layout primitives, dark theme, responsive rules. Imported after `globals.css`, so it wins. |
| `src/app/globals.css` | Tailwind v4 entry, shadcn/base tokens, global utilities, focus and reduced-motion rules. |
| `src/app/layout.tsx` | Font loading (Geist, Inter, Playfair Display) and root providers. |
| `components.json` | shadcn configuration: `base-nova`, neutral base, CSS variables, `@/components/ui`. |

`travel-theme.css` is large and contains several token layers (base `:root`, a dark
`.dark` block, later override blocks). The last definition wins. When a value looks wrong,
search the file for the variable name and check the cascade before editing.

## Color tokens

Core travel tokens (current base values):

| Token | Value | Use |
|---|---|---|
| `--travel-primary` | `#527D64` | Primary actions, links, active states |
| `--travel-primary-hover` | `#416A53` | Hover |
| `--travel-primary-active` | `#345842` | Pressed / strong |
| `--travel-primary-soft` | `#DCE8DE` | Soft fills, selected states |
| `--travel-sage` | `#A9BDAA` | Secondary accent |
| `--travel-forest` | `#355744` | Deep accent |
| `--travel-text-primary` | `#252D29` | Body and headings |
| `--travel-text-secondary` | `#6D7770` | Supporting copy |
| `--travel-text-muted` | `#8B948D` | Meta, captions |
| `--travel-border` | `#E2E7E0` | Hairline borders |
| `--travel-border-strong` | `#D3DCD2` | Emphasized borders |
| `--travel-success` | `#4D8464` | Success |
| `--travel-warning` | `#B8863B` | Warning |
| `--travel-danger` | `#BF5B55` | Error / destructive |
| `--travel-info` | `#668594` | Informational |

Do not use these raw values in components. Use the semantic aliases (`--brand`,
`--surface`, `--text-primary`, `--line`, `--success-text`, `--danger-text`, etc.) so the
dark theme keeps working.

## Surfaces and glass

| Token | Light role |
|---|---|
| `--glass-bg` | Standard card/panel fill |
| `--glass-bg-elevated` | Elevated card, popover |
| `--glass-bg-soft` | Subtle panel |
| `--glass-bg-strong` | Modal, high-contrast surface |
| `--glass-border` / `--glass-border-strong` | Hairline borders |
| `--glass-blur-sm/md/lg` | 8 / 12 / 18 px backdrop blur |
| `--glass-shadow` / `-elevated` / `-floating` | Elevation levels |

Reusable classes: `.glass-card`, `.glass-card-elevated`, `.glass-panel`, `.glass-modal`,
`.glass-popover`, `.glass-input`, `.glass-header`, `.glass-sidebar`.

Keep glass restrained: hierarchy should come from spacing, type, and elevation, not from
stacking translucent layers.

## Typography

| Token | Family | Use |
|---|---|---|
| `--font-inter` | Inter | Body copy |
| `--font-playfair` | Playfair Display | Display headings |
| `--font-sans` | Geist | UI fallback / shadcn |
| `--font-body` | Inter stack | Body |
| `--font-display` | Playfair stack | Headings, prices, wordmark |

Body text should stay at 16 px or larger. Use the display face for editorial headings and
numbers, not for long paragraphs or form labels.

## Spacing, radius, elevation

- Spacing scale: 4, 8, 12, 16, 20, 24, 28, 32, 40, 48 px (`--space-1` … `--space-10`).
- Radius: 8 px (`sm`), 12 px (`md`), 16 px (`lg`), 22 px (`xl`), 999 px (`pill`); hero
  radius 32 px.
- Shadows: `--travel-shadow-card`, `--travel-shadow-hover`, plus the glass elevation set.
- Transitions: `--transition`, `--transition-normal`; always pair motion with a
  `prefers-reduced-motion` fallback.

## Layout primitives

| Class | Behavior |
|---|---|
| `.page-container` | Max width 1440 px, centered, 28 px desktop padding, 16 px mobile, `overflow-x: clip` |
| `.page` | Same max width and padding as the container |
| `.page-section` | 32 px bottom rhythm (44 px on mobile) |
| `.content-grid` | 12-column grid with token gap; single column with 18 px gap below 768 px |

Controls: inputs, selects, textareas, and primary buttons are 50 px min height; compact
buttons and icon buttons are 44 px. Cards use a 4:3 image ratio and equal heights inside a
grid row.

## Component inventory

- UI primitive: `components/ui/button.tsx` (shadcn / base-ui).
- Cards: `TourCard`, `DestinationCard`, `AttractionCard`, `ExperienceCard`.
- Heroes: `PageHero` (single-card Bento hero), `BentoHero` (home).
- Shell: `AppFrame`, `TopHeader`, `Sidebar`, `PwaBottomNav`, `PwaSplash`.
- Feedback: `Skeleton`, `ToastProvider`, `ModalA11y`, `MoreExperiencesEmptyState`.
- Icons: import from `components/icons.tsx`; the project also has `lucide-react` and
  `@hugeicons/react`.
- Maps: `TripRouteOverlayMap`, `TripPlaceMapPicker` (Leaflet).

## Styling conventions

- Page-level styles live in `features/pages/<page>.module.css`; component styles live next
  to the component (`.module.css`).
- Tailwind v4 utilities are fine for layout and one-off spacing, but do not replace a
  feature's CSS Module with utility soup.
- Class names are semantic (`.heroTitle`, `.bookingCard`, `.statValue`), not visual
  descriptions.
- No inline `style` for tokens that already exist; no new raw hex, RGB, or px magic
  numbers outside the token layer.
- Dark theme is opt-in via the `.dark` class; never auto-apply it from
  `prefers-color-scheme`.
- `prefers-reduced-motion` must disable transforms, parallax, and autoplay.

## Accessibility

- 4.5:1 contrast for body text, 3:1 for large text and UI boundaries.
- 44×44 px minimum interactive targets; 50 px for primary form controls.
- Visible `:focus-visible` ring using `--focus-ring`.
- Every input has a persistent label; placeholders are not labels.
- Skip link and `ModalA11y` handle keyboard entry and focus trapping; preserve them.
- Review at 390, 768, 1024, and 1440 px.

## Audits

Run from `next-app/` with a dev server available where required:

| Command | Checks |
|---|---|
| `npm run audit:contrast` | WCAG AA contrast across public pages, light and dark |
| `npm run audit:layout` | Overflow, grid, and shell layout at mobile and desktop |
| `npm run audit:spacing` | Spacing scale and rhythm drift |
| `npm run audit:theme` | Token/theme consistency |
| `npm run test:onboarding` | Onboarding flow, mobile and desktop |
| `npm run smoke:browser` | Browser smoke checks across routes |
| `node scripts/header-audit.mjs` | Header/navigation audit (no npm alias) |

Historical results (2026-10-20) recorded 0 contrast failures, 0 layout problems, 33/33
browser checks, and 16/16 onboarding checks. Treat those as a baseline, not current truth.
