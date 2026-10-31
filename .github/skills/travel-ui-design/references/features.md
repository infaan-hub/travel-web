# Feature map

All paths are relative to `next-app/src/`. Routes are App Router paths; route files live
under `app/` and normally delegate to a page component in `features/pages/`.

[`../scope.json`](../scope.json) is the machine-readable version of this map. Use
`npm run design:scope` to classify a route or file instead of matching by eye. Static routes
shadow dynamic ones (`/company/dashboard` is P3, `/company/acme` is P1), and shared shell or
token files classify as SYSTEM.

## P0 — Discovery and conversion

### Home `/`

- Entry: `app/(public)/page.tsx` → `features/pages/HomePage.tsx`
- Styles: `features/pages/home-page.module.css`
- Shared: `components/BentoHero.tsx`, `components/ZanzibarAttractions.tsx`,
  `components/ExperienceCard.tsx`, `components/DestinationCard.tsx`,
  `components/MoreExperiencesEmptyState.tsx`, `components/TourCard.tsx`
- Job: establish the brand, surface experiences and places, and route users into tours.
- Critique focus: first impression, hero hierarchy, card scannability, empty/error states,
  mobile density.
- Handoff focus: hero image slots from home settings, card ratios, responsive stacking,
  motion and reduced-motion behavior.

### Experiences `/tours` and `/tours/[category]`

- Entry: `app/(public)/tours/page.tsx`, `app/(public)/tours/[category]/page.tsx` →
  `features/pages/ToursPage.tsx`
- Styles: `features/pages/tours-page.module.css`
- Shared: `components/TourCard.tsx`, `components/PageHero.tsx`
- Job: let users browse and filter the catalogue, then open a tour.
- Critique focus: filter clarity, result count, card hierarchy, price/duration legibility,
  empty results, loading skeletons, pagination.
- Handoff focus: category parameter behavior, filter states, grid breakpoints, image ratios.

### Tour detail `/tour/[id]`

- Entry: `app/(public)/tour/[id]/page.tsx` → `features/pages/TourDetailPage.tsx`
- Styles: `features/pages/tour-detail-page.module.css`
- Shared: `components/PageHero.tsx`, `components/TourCard.tsx`, icon set in
  `components/icons.tsx`
- Job: give enough detail and trust to start a booking.
- Critique focus: above-the-fold clarity, price/CTA prominence, itinerary scanability,
  reviews, sticky booking affordance on mobile.
- Handoff focus: gallery, badges, itinerary rows, review form states, related tours,
  language switcher, unavailable-tour state.

### Booking `/booking/[tourId]` and `/booking`

- Entry: `app/(public)/booking/[tourId]/page.tsx`, `app/(public)/booking/page.tsx` →
  `features/pages/BookingPage.tsx`
- Styles: `features/pages/booking-page.module.css`
- Shared: shell, form controls, `TourCard` patterns
- Job: collect guest details and a travel date with minimal friction.
- Critique focus: form grouping, required-field clarity, validation timing, mobile
  keyboard flow, trust signals, success and failure states.
- Handoff focus: every field state, error copy placement, date constraints, guest-count
  rules, submit/loading/disabled states, confirmation state.

## P1 — Trust, access, and first run

### Companies `/companies` and `/company/[slug]`

- Entry: `app/companies/page.tsx` → `features/pages/CompaniesPage.tsx`;
  `app/company/[slug]/page.tsx` → `features/pages/company-profile-page.module.css`
- Styles: `features/pages/company-public.module.css`,
  `features/pages/company-profile-page.module.css`
- Shared: `components/PageHero.tsx`, `components/TourCard.tsx`,
  `features/pages/CompanyForm.tsx` (also used by P4 company create/detail; review the public
  application context first)
- Job: compare operators and validate a company before booking.
- Critique focus: directory filtering, company card credibility, contact and opening-hours
  presentation, published-tour grouping.
- Handoff focus: company card anatomy, profile header, contact block, map link, review
  summary, no-tours state.

### Trips `/trips` and `/trips/[id]`

- Entry: `app/(public)/trips/page.tsx`, `app/(public)/trips/[id]/page.tsx` →
  `features/pages/TripsPage.tsx`, `features/pages/TripDetailPage.tsx`
- Styles: `features/pages/trips-page.module.css`
- Shared: `components/TripRouteOverlayMap.tsx`, `components/TripPlaceMapPicker.tsx`
- Job: browse traveller trip logs and open a trip detail.
- Critique focus: map/list relationship, route legibility, date and duration labels,
  mobile map interaction.
- Handoff focus: map states, origin/destination display, empty trips, loading, responsive
  layout.

### Auth `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`

- Entry: `app/(public)/login/page.tsx`, `register/page.tsx`, `forgot-password/page.tsx`,
  `reset-password/page.tsx`, `verify-email/page.tsx`
- Pages: `features/pages/LoginPage.tsx`, `RegisterPage.tsx`, `ForgotPasswordPage.tsx`,
  `ResetPasswordPage.tsx`, `VerifyEmailPage.tsx`
- Styles: `features/pages/auth-page.module.css`
- Job: get users in or back into their account with minimal confusion.
- Critique focus: single-task focus, field labels, password rules, error recovery,
  verification instructions, mobile ergonomics.
- Handoff focus: validation and server-error states, resend-code timing, success states,
  password visibility control, autocomplete attributes.

### Contact `/contact`

- Entry: `app/(public)/contact/page.tsx` → `features/pages/ContactPage.tsx`
- Styles: `features/pages/contact-page.module.css`
- Shared: `components/PageHero.tsx`
- Job: answer pre-booking questions and provide a support channel.
- Critique focus: contact-method clarity, form length, response-time expectations, error
  and success states.
- Handoff focus: field states, subject options, success confirmation, spam/error handling.

### Onboarding `/onboarding` and tour-company application

- Entry: `app/onboarding/page.tsx` → `features/pages/OnboardingPage.tsx`;
  `app/tour-company/dashboard/page.tsx` → `features/pages/TourCompanyApplicationPage.tsx`
- Job: set up a new account or apply as a tour company.
- Critique focus: step count, progress visibility, required information, abandonment risk.
- Handoff focus: step states, validation, save/resume behavior, approval-pending state.

## P2 — Customer account

### Bookings `/bookings`

- Entry: `app/(customer)/bookings/page.tsx` → `features/pages/BookingsPage.tsx`
- Job: track upcoming and past bookings.
- Critique focus: status legibility, date/price hierarchy, empty state, cancellation or
  contact actions.
- Handoff focus: status variants, card anatomy, filters, empty/loading/error states.

### Profile and settings `/profile`, `/settings`

- Entry: `app/(customer)/profile/page.tsx`, `app/(customer)/settings/page.tsx` →
  `features/pages/ProfilePage.tsx`
- Styles: `features/pages/account-settings.module.css`
- Job: maintain personal details and preferences.
- Critique focus: section grouping, save feedback, destructive-action confirmation,
  notification preferences.
- Handoff focus: editable vs read-only fields, validation, save/loading/success/error,
  account-deletion or sign-out flows if present.

## P3 — Company workspace

- Entry: `app/company/select/page.tsx` and `app/company/(protected)/*/page.tsx`
- Pages: `CompanySelectPage`, `CompanyWorkspacePage`, `CompanyToursPage`,
  `CompanyTourFormPage`, `CompanyTripsPage`, `CompanyBookingsPage`,
  `CompanyBookingDetailPage`, `CompanyAnalyticsPage`, `CompanyProfilePage`
- Styles: `features/pages/company-*.module.css`
- Shared: `components/CompanyWorkspaceHeader.tsx`, `components/Sidebar.tsx`,
  `components/sidebar.module.css`, analytics charts
- Job: run day-to-day tour operations and understand performance.
- Critique focus: dashboard signal vs noise, table density, status filters, form
  efficiency, destructive actions, role-based navigation.
- Handoff focus: table columns and sorting, empty/loading/error states, chart legends,
  permission-dependent actions, mobile table behavior.

## P4 — Admin

- Entry: `app/admin/(protected)/*/page.tsx` and detail routes
- Pages: `AdminDashboardPage`, `AdminToursPage`, `AdminBookingsPage`,
  `AdminCustomersPage`, `AdminCompaniesPage`, `AdminCompanyCreatePage`,
  `AdminCompanyDetailPage`, `AdminReviewsPage`, `AdminMessagesPage`,
  `AdminAnalyticsPage`, `AdminHomeEditorPage`, `AdminSettingsPage`, `AdminTravelPage`,
  `AdminWorkSpacePage`, `AdminPricingPage`, `AdminTourPlanPage`
- Styles: `features/pages/admin-*.module.css`
- Shared: `AdminAnalyticsPage` charts, `AnalyticsCharts.tsx`, `Sidebar`,
  `features/pages/CompanyForm.tsx` (P1 public application is the primary context)
- Job: moderate content, manage companies and users, and monitor platform health.
- Critique focus: information density, scan paths, bulk actions, confirmation of
  destructive changes, editor preview fidelity.
- Handoff focus: data table states, filters, pagination, editor controls, publish/unpublish
  confirmation, audit-log visibility.

## Shared shell

- `components/AppFrame.tsx` — page frame
- `components/TopHeader.tsx` — wordmark and navigation trigger
- `components/Sidebar.tsx` + `sidebar.module.css` — closed-by-default drawer
- `components/PwaBottomNav.tsx`, `PwaSplash.tsx`, `PwaUpdatePrompt.tsx` — PWA surfaces
- `components/PageHero.tsx` + `PageHero.module.css` — single-card Bento hero
- `components/BentoHero.tsx` + `BentoHero.module.css` — home hero
- `components/Skeleton.tsx`, `components/ToastProvider.tsx`, `components/ModalA11y.tsx`

Shell changes affect every tier. Review them against P0 first, then confirm P3/P4 table
and dashboard layouts still work.
