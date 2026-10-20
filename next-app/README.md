# Infaan Tours & Travel — unified Next.js application

This directory is the production-oriented migration of the former Django REST
backend + React/Vite frontend into a single Next.js App Router application.


## Glass system

The interface uses a premium aqua glassmorphism language: translucent layered
surfaces, frosted `backdrop-filter` blur, hairline glass borders, soft inner
highlights and three elevation levels. All of it lives in
`src/app/travel-theme.css` as CSS variables, with a matching dark scheme that is
opt-in through the `.dark` theme class (the light scheme is the default and is
never switched automatically by the operating system preference).

Shared classes: `glass-card`, `glass-card-elevated`, `glass-panel`,
`glass-button`, `glass-button-primary`, `glass-button-secondary`, `glass-input`,
`glass-sidebar`, `glass-popover`, `glass-modal`, `glass-chip`, `glass-header`.
The atmospheric aqua background lives on `body`, and the page hero is provided
by `src/components/PageHero.tsx`.

The light aqua theme is the only theme the application renders. The dark
palette is retained as an opt-in `.dark` class, but nothing in the codebase
applies that class, so an operating system in dark mode still gets the light
scheme. `prefers-color-scheme` is no longer used anywhere in the stylesheets.

Destination cards on the home page use a 4:3 image with the copy in a separate
in-flow light glass panel underneath it, instead of an absolutely positioned
panel over a black scrim.

## Brand and design system

The product is branded **Travel.** and uses the teal/aqua travel-booking theme:
deep teal `#0F6B6B` primary, aqua `#14A3A3` accent, white surfaces, `#7B8A90`
secondary text and `#F5A623` rating stars. Buttons use a 14px radius, cards
20px and hero headers 32–40px.

- `src/app/travel-theme.css` holds the design tokens, the aqua hero header, the
  onboarding styles and the dark-mode overrides (CSS variables, no toggle).
- `src/components/PageHero.tsx` is the aqua rounded hero used across the public
  pages (title/greeting, search field, category chips, overlapping cards).
- Shared layout primitives live in the same file: `.page-container` (max width
  1440px, 24px desktop / 16px mobile padding), `.page-section` (56px rhythm) and
  `.content-grid` (12-column grid, 24px gap, single column below 768px).
- `src/features/pages/OnboardingPage.tsx` + `/onboarding/` is the two screen
  onboarding flow: the collage welcome screen and the full-image "Explore The
  World" slides that end at sign up.

## Stack

- Next.js 16.4.2 (App Router), React 19.3.1, TypeScript (strict)
- Prisma 6.19.3 + PostgreSQL
- Tailwind CSS 4.3.3 plus the preserved legacy design system in `src/app/globals.css`
- Zod 4.6.7, `@node-rs/argon2` 2.2.2, `jose` 6.2.12, `nodemailer` 10.1.7

## Getting started

```bash
cp .env.example .env
# edit DATABASE_URL, AUTH_SECRET and the optional integration settings
npm install
npm run db:local      # starts the embedded PostgreSQL cluster on 127.0.0.1:55432
npm run db:migrate    # applies prisma/migrations
npm run db:import     # imports Backend/db.sqlite3 into PostgreSQL
npm run db:verify     # record-level verification against the source export
npm run dev
```

Open `http://localhost:3000`.

## Scripts

- `npm run dev` — development server
- `npm run build` / `npm run start` — production build and server
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — ESLint
- `npm test` — Vitest unit tests
- `npm run smoke` — API and security smoke test against a running server
- `npm run smoke:browser` — Playwright-free Chrome smoke test
- `npm run audit:contrast` — runtime WCAG AA contrast audit (light and dark)
- `npm run test:onboarding` — onboarding flow checks on mobile and desktop
- `npm run audit:layout` — spacing audit (overflow, tap targets) on mobile and desktop
- `npm run audit:theme` — Chrome audit that emulates an OS dark colour scheme and
  asserts every page still renders the light aqua theme, and that the home page
  destination cards use a 4:3 image with an in-flow light panel
- `npm run db:seed` — seed demo content and an administrator
- `npm run admin:create` — create an administrator explicitly

## Environment

See `.env.example`. Production requires a real PostgreSQL `DATABASE_URL`,
a 32+ character `AUTH_SECRET`, and (for production media) Supabase Storage
credentials. SMTP, WhatsApp and Nominatim settings are optional but enable the
corresponding booking features.

## Authentication

- Browser sessions use HTTP-only `infaan_session` / `infaan_refresh` cookies.
- Mobile applications continue to use `POST /api/token/` and
  `POST /api/token/refresh/` with Bearer tokens.
- Legacy Django `pbkdf2_sha256` password hashes are accepted and upgraded to
  Argon2id on the next successful login.

## Media

Uploads are stored on the local filesystem under `public/uploads` and only the
object key is persisted in PostgreSQL. Set `NEXT_PUBLIC_MEDIA_BASE_URL` to serve
the same files from an external host or CDN.

## Notifications

All customer and staff notifications are delivered through Web Push (VAPID) plus
in-app notifications — no SMTP involved. See `docs/NOTIFICATIONS.md` for the
required environment variables and the API surface.

## Documentation

- `docs/NOTIFICATIONS.md`
- `docs/DEPLOYMENT.md`
- `docs/ROLLBACK.md`
- `docs/VERIFICATION-REPORT.md`
