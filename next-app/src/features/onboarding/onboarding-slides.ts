export type OnboardingMotionPreset =
  | "pan-down"
  | "pan-up"
  | "zoom-in"
  | "zoom-focus"
  | "drift-right";

export type OnboardingShot = {
  /** Real screenshot captured from the live page under /onboarding/ */
  src: string;
  alt: string;
  /** Short live step caption shown inside the video player bar */
  caption: string;
  /** Duration in milliseconds before advancing to the next shot */
  durationMs: number;
  /** Smooth camera motion applied to the real page screenshot */
  motion: OnboardingMotionPreset;
  /** Optional animated touch-tap indicator location (% of frame) */
  tapPoint?: {
    x: number;
    y: number;
    label: string;
  };
};

export type OnboardingSlide = {
  id: string;
  badge: string;
  title: string;
  description: string;
  routeHint: string;
  highlights: readonly string[];
  shots: readonly OnboardingShot[];
};

export type OnboardingFlowRole = "customer" | "company" | "driver";

/**
 * 3-slide Customer onboarding tutorial shown the first time a customer opens
 * the installed app (iPhone Add to Home Screen, Android, or Desktop PWA).
 */
export const CUSTOMER_ONBOARDING_SLIDES: readonly OnboardingSlide[] = [
  {
    id: "customer-request-trip",
    badge: "Step 1 of 3 · Private Hire",
    title: "Request a private trip in minutes",
    description:
      "Browse verified Zanzibar vehicles or submit a direct pickup request with your contact details, travel date, pickup time, and route.",
    routeHint: "/booking/create/",
    highlights: [
      "Choose a company vehicle or broadcast to nearby verified drivers",
      "Pick passenger count, travel date, and exact Zanzibar pickup time",
      "No upfront card required — pay when your driver confirms",
    ],
    shots: [
      {
        src: "/onboarding/customer-1-1.webp",
        alt: "Private hire services catalogue showing verified Zanzibar vehicles",
        caption: "1. Browse verified private hire services",
        durationMs: 3200,
        motion: "pan-down",
        tapPoint: { x: 50, y: 68, label: "Select service" },
      },
      {
        src: "/onboarding/customer-1-2.webp",
        alt: "Request Private Hire Transport step 1 passenger contact form",
        caption: "2. Enter your contact & booking details",
        durationMs: 3400,
        motion: "zoom-in",
        tapPoint: { x: 50, y: 62, label: "Fill details" },
      },
      {
        src: "/onboarding/customer-1-3.webp",
        alt: "Request Private Hire Transport step 2 schedule, date, time and origin destination",
        caption: "3. Pick travel date, pickup time & route",
        durationMs: 3600,
        motion: "pan-up",
        tapPoint: { x: 50, y: 74, label: "Confirm route" },
      },
    ],
  },
  {
    id: "customer-measure-trip",
    badge: "Step 2 of 3 · Trip Measurer",
    title: "Measure trip distance & travel time",
    description:
      "Pin any pickup and drop-off point across Zanzibar to calculate real road distance, estimated drive duration, and route details before you book.",
    routeHint: "/trips/",
    highlights: [
      "Tap popular presets like Airport → Nungwi or pin any custom place",
      "See live road distance in km and realistic Zanzibar travel time",
      "Save favorite routes and jump straight into booking",
    ],
    shots: [
      {
        src: "/onboarding/customer-2-1.webp",
        alt: "Trips page with Zanzibar trip measurer and route presets",
        caption: "1. Open Trips & pick origin and destination",
        durationMs: 3200,
        motion: "pan-down",
        tapPoint: { x: 48, y: 55, label: "Tap route preset" },
      },
      {
        src: "/onboarding/customer-2-2.webp",
        alt: "Measured Zanzibar trip showing 62 km distance and 1 h 12 min road duration",
        caption: "2. Instant road distance & travel time",
        durationMs: 3600,
        motion: "zoom-focus",
        tapPoint: { x: 42, y: 49, label: "Measure trip" },
      },
      {
        src: "/onboarding/customer-2-3.webp",
        alt: "Measured trip route map and booking summary on Trips page",
        caption: "3. Save route or request a vehicle immediately",
        durationMs: 3400,
        motion: "pan-up",
        tapPoint: { x: 52, y: 72, label: "Book route" },
      },
    ],
  },
  {
    id: "customer-review",
    badge: "Step 3 of 3 · Manage & Review",
    title: "Reschedule & leave a verified review",
    description:
      "Track live booking status in My Bookings, reschedule up to 5 hours before pickup, and share a star rating once your trip completes.",
    routeHint: "/my-transport/",
    highlights: [
      "View confirmed driver name, vehicle plate, and direct call button",
      "Reschedule date & pickup time anytime up to 5 hours before travel",
      "Rate completed rides with 1–5 stars to guide fellow travelers",
    ],
    shots: [
      {
        src: "/onboarding/customer-3-1.webp",
        alt: "Private Hire Bookings screen showing active and completed trips",
        caption: "1. Track every booking in My Bookings",
        durationMs: 3200,
        motion: "pan-down",
        tapPoint: { x: 64, y: 76, label: "Manage booking" },
      },
      {
        src: "/onboarding/customer-3-2.webp",
        alt: "Reschedule booking modal with date, pickup time, and 5-hour cutoff notice",
        caption: "2. Reschedule 5+ hours before pickup",
        durationMs: 3400,
        motion: "zoom-in",
        tapPoint: { x: 68, y: 74, label: "Save new schedule" },
      },
      {
        src: "/onboarding/customer-3-3.webp",
        alt: "Leave a review modal with 5-star rating selector and experience text box",
        caption: "3. Rate completed rides with 5-star feedback",
        durationMs: 3800,
        motion: "zoom-focus",
        tapPoint: { x: 70, y: 73, label: "Submit review" },
      },
    ],
  },
];

/**
 * 5-slide Company onboarding tutorial shown the first time a company account
 * signs in on an installed app (iPhone, Android, or Desktop PWA).
 */
export const COMPANY_ONBOARDING_SLIDES: readonly OnboardingSlide[] = [
  {
    id: "company-fleet",
    badge: "Step 1 of 5 · Fleet Setup",
    title: "Register your private hire fleet",
    description:
      "Add every vehicle in your fleet with model name, plate number, category, passenger & luggage limits, and Front, Side, and Back photos.",
    routeHint: "/company/private-hire/",
    highlights: [
      "Tap + Add Vehicle to register sedans, minivans, or safari cruisers",
      "Upload Front, Side, and Back photos so travelers trust your fleet",
      "Track available vs. unavailable vehicles from one catalogue",
    ],
    shots: [
      {
        src: "/onboarding/company-1-1.webp",
        alt: "Company Private Hire Vehicles dashboard with Add Vehicle button",
        caption: "1. Open Private Hire Fleet & tap Add Vehicle",
        durationMs: 3100,
        motion: "zoom-in",
        tapPoint: { x: 50, y: 39, label: "+ Add Vehicle" },
      },
      {
        src: "/onboarding/company-1-2.webp",
        alt: "Add Private Hire Vehicle modal with plate number, seats, luggage, and photo upload",
        caption: "2. Enter plate, capacity & upload photos",
        durationMs: 3500,
        motion: "pan-down",
        tapPoint: { x: 50, y: 86, label: "Upload front photo" },
      },
      {
        src: "/onboarding/company-1-3.webp",
        alt: "Registered fleet vehicle list inside company workspace",
        caption: "3. Vehicle appears ready for service assignment",
        durationMs: 3200,
        motion: "pan-up",
      },
    ],
  },
  {
    id: "company-drivers",
    badge: "Step 2 of 5 · Driver Team",
    title: "Register private drivers & credentials",
    description:
      "Onboard your verified company drivers with their license, ZanID/NIDA/Passport details, profile photo, and direct driver workspace login.",
    routeHint: "/company/private-driver/",
    highlights: [
      "Create driver username & password so they sign right into /driver/",
      "Upload driver photo, phone number, email, and government ID",
      "Assign registered drivers to your vehicles and services",
    ],
    shots: [
      {
        src: "/onboarding/company-2-1.webp",
        alt: "Company Private Hire Drivers roster with Register Driver button",
        caption: "1. Open Private Drivers & tap Register Driver",
        durationMs: 3100,
        motion: "zoom-in",
        tapPoint: { x: 50, y: 39, label: "+ Register Driver" },
      },
      {
        src: "/onboarding/company-2-2.webp",
        alt: "Register Private Hire Driver modal showing login credentials, photo, and contact fields",
        caption: "2. Set driver login, photo & ID details",
        durationMs: 3600,
        motion: "pan-down",
        tapPoint: { x: 56, y: 58, label: "Upload photo" },
      },
      {
        src: "/onboarding/company-2-3.webp",
        alt: "Active company drivers roster ready to confirm bookings",
        caption: "3. Drivers can log in & confirm assigned trips",
        durationMs: 3200,
        motion: "pan-up",
      },
    ],
  },
  {
    id: "company-services",
    badge: "Step 3 of 5 · Publish Listings",
    title: "Create bookable private services",
    description:
      "Combine a registered vehicle and driver into a customer-facing private hire service and publish it live on the marketplace.",
    routeHint: "/company/private-service/",
    highlights: [
      "Name your service (e.g., VIP Airport Transfer or Full-Day Island Hire)",
      "Pair any fleet vehicle with an assigned company driver",
      "Toggle publish so travelers can immediately request bookings",
    ],
    shots: [
      {
        src: "/onboarding/company-3-1.webp",
        alt: "Company Private Hire Services list with Create Service button",
        caption: "1. Open Private Services & tap Create Service",
        durationMs: 3100,
        motion: "zoom-in",
        tapPoint: { x: 50, y: 39, label: "+ Create Service" },
      },
      {
        src: "/onboarding/company-3-2.webp",
        alt: "Create Private Hire Service modal pairing vehicle, driver, and publish toggle",
        caption: "2. Pair vehicle + driver & publish live",
        durationMs: 3600,
        motion: "zoom-focus",
        tapPoint: { x: 70, y: 89, label: "Register Service" },
      },
      {
        src: "/onboarding/company-3-3.webp",
        alt: "Published company private hire services directory",
        caption: "3. Live service now accepts customer requests",
        durationMs: 3200,
        motion: "pan-up",
      },
    ],
  },
  {
    id: "company-prices",
    badge: "Step 4 of 5 · Route Pricing",
    title: "Add Zanzibar route prices",
    description:
      "Set transparent One-way, Wait & return, and Full day rates in USD and TSh for every Zanzibar route — shown automatically during customer checkout.",
    routeHint: "/company/prices/",
    highlights: [
      "Add custom Origin → Destination prices or restore 100 default routes",
      "Configure One-way, Wait & return, and Full day charter fares",
      "Your company drivers automatically see these rates read-only",
    ],
    shots: [
      {
        src: "/onboarding/company-4-1.webp",
        alt: "Company Route Prices manager showing Add route price and Restore 100 defaults",
        caption: "1. Open Prices & tap + Add route price",
        durationMs: 3100,
        motion: "zoom-in",
        tapPoint: { x: 28, y: 61, label: "+ Add route price" },
      },
      {
        src: "/onboarding/company-4-2.webp",
        alt: "Add custom route price form with Origin, Destination, and One-way USD and TSh",
        caption: "2. Enter route & USD / TSh charter fares",
        durationMs: 3600,
        motion: "pan-down",
        tapPoint: { x: 46, y: 78, label: "Set route fare" },
      },
      {
        src: "/onboarding/company-4-3.webp",
        alt: "Company route pricing table with saved Zanzibar routes",
        caption: "3. Saved rates apply automatically to bookings",
        durationMs: 3200,
        motion: "pan-up",
      },
    ],
  },
  {
    id: "company-bookings-dispatch",
    badge: "Step 5 of 5 · Bookings & Public Dispatch",
    title: "Manage bookings & share publicly",
    description:
      "Monitor driver-verified live trips in real time, or tap Share publicly on any pending booking so approved public drivers can claim and fulfill it.",
    routeHint: "/company/bookings/",
    highlights: [
      "Track All, Verified & live, Pending, Completed, and Expired bookings",
      "See assigned driver verification timestamps and live trip stages",
      "Tap Share publicly when your fleet is busy to hand off pending jobs",
    ],
    shots: [
      {
        src: "/onboarding/company-5-1.webp",
        alt: "Company Bookings workspace overview",
        caption: "1. Open Bookings to oversee every request",
        durationMs: 3000,
        motion: "pan-down",
      },
      {
        src: "/onboarding/company-5-2.webp",
        alt: "Driver-verified trips and public dispatch section with status filter tabs",
        caption: "2. Filter Verified & live or Pending trips",
        durationMs: 3300,
        motion: "zoom-in",
        tapPoint: { x: 68, y: 16, label: "Pending tab" },
      },
      {
        src: "/onboarding/company-5-3.webp",
        alt: "Pending booking card with Share publicly button for public driver dispatch",
        caption: "3. Tap Share publicly to broadcast to drivers",
        durationMs: 3800,
        motion: "zoom-focus",
        tapPoint: { x: 73, y: 55, label: "Share publicly" },
      },
    ],
  },
];

/**
 * 5-slide Driver onboarding tutorial shown the first time a driver account
 * signs in on an installed app (iPhone, Android, or Desktop PWA).
 */
export const DRIVER_ONBOARDING_SLIDES: readonly OnboardingSlide[] = [
  {
    id: "driver-trip-lifecycle",
    badge: "Step 1 of 5 · Live Trip Workflow",
    title: "Confirm & complete trips step-by-step",
    description:
      "Accept pending bookings, start live GPS navigation to pickup, check in the passenger, run the live journey, and finalize once you arrive.",
    routeHint: "/driver/bookings/",
    highlights: [
      "Confirm pending assigned or public trips before the scheduled time",
      "Follow the guided 4-step bar: Start → Pickup → Trip → Finalize",
      "Customer and company receive real-time updates at every milestone",
    ],
    shots: [
      {
        src: "/onboarding/driver-1-1.webp",
        alt: "Driver pending booking card waiting for confirmation",
        caption: "1. Review pending trip & tap Confirm trip",
        durationMs: 2800,
        motion: "pan-down",
        tapPoint: { x: 68, y: 81, label: "Confirm trip" },
      },
      {
        src: "/onboarding/driver-1-2.webp",
        alt: "Confirmed driver booking ready to start",
        caption: "2. Confirmed — tap Start trip when heading out",
        durationMs: 2700,
        motion: "zoom-in",
        tapPoint: { x: 64, y: 78, label: "Start trip" },
      },
      {
        src: "/onboarding/driver-1-3.webp",
        alt: "Driver Step 1 Start live GPS navigation heading to pickup origin",
        caption: "3. Step 1 · Navigate to pickup origin",
        durationMs: 2800,
        motion: "pan-down",
      },
      {
        src: "/onboarding/driver-1-4.webp",
        alt: "Driver Step 2 Arrived at pickup with customer account details",
        caption: "4. Step 2 · Meet & pick up the customer",
        durationMs: 2800,
        motion: "zoom-focus",
      },
      {
        src: "/onboarding/driver-1-5.webp",
        alt: "Driver Step 3 Live trip underway from Airport to Stone Town Serena Hotel",
        caption: "5. Step 3 · Run live trip to destination",
        durationMs: 2800,
        motion: "pan-down",
      },
      {
        src: "/onboarding/driver-1-6.webp",
        alt: "Driver Step 4 Finalize and complete trip screen",
        caption: "6. Step 4 · Finalize & mark trip completed",
        durationMs: 3200,
        motion: "zoom-in",
        tapPoint: { x: 50, y: 76, label: "Complete trip" },
      },
    ],
  },
  {
    id: "driver-prices",
    badge: "Step 2 of 5 · Route Fares",
    title: "Add & manage your route prices",
    description:
      "Set custom One-way, Wait & return, and Full day fares in USD and TSh across Zanzibar, or load 100 ready-made routes in one tap.",
    routeHint: "/driver/price/",
    highlights: [
      "Tap + Add route price to add any Airport, Stone Town, or beach route",
      "Automatic USD to TSh conversion keeps quotes clear for travelers",
      "Company drivers see company-managed fares automatically",
    ],
    shots: [
      {
        src: "/onboarding/driver-2-1.webp",
        alt: "Driver My Route Prices page with Add route price and Restore 100 defaults",
        caption: "1. Open Price & tap + Add route price",
        durationMs: 3100,
        motion: "zoom-in",
        tapPoint: { x: 28, y: 68, label: "+ Add route price" },
      },
      {
        src: "/onboarding/driver-2-2.webp",
        alt: "Add custom route price form for drivers in USD and TSh",
        caption: "2. Enter Origin, Destination & trip fares",
        durationMs: 3600,
        motion: "pan-down",
        tapPoint: { x: 46, y: 78, label: "Save fare" },
      },
      {
        src: "/onboarding/driver-2-3.webp",
        alt: "Saved driver route pricing table",
        caption: "3. Saved fares power instant customer quotes",
        durationMs: 3200,
        motion: "pan-up",
      },
    ],
  },
  {
    id: "driver-whatsapp-trips",
    badge: "Step 3 of 5 · WhatsApp Dispatch",
    title: "Generate trips & send via WhatsApp",
    description:
      "Build complete trip cards with vehicle details, live road distance, fare quote, and Google Maps pins — then send directly to any customer on WhatsApp.",
    routeHint: "/driver/trips/",
    highlights: [
      "Pick Origin & Destination to calculate road distance and ETA",
      "Auto-attaches your driver name, vehicle model, and plate number",
      "One tap opens WhatsApp to share the full itinerary & Maps link",
    ],
    shots: [
      {
        src: "/onboarding/driver-3-1.webp",
        alt: "Generate and Send Trips to Customers top screen with presets",
        caption: "1. Open Trips & pick origin and destination",
        durationMs: 3100,
        motion: "pan-down",
        tapPoint: { x: 48, y: 58, label: "Select route" },
      },
      {
        src: "/onboarding/driver-3-2.webp",
        alt: "Vehicle and trip quote builder with fare, date, and passengers",
        caption: "2. Add pickup time, fare quote & passengers",
        durationMs: 3400,
        motion: "pan-down",
      },
      {
        src: "/onboarding/driver-3-3.webp",
        alt: "Generated trip summary with green Send Trip via WhatsApp button and Google Maps link",
        caption: "3. Tap Send Trip via WhatsApp to share",
        durationMs: 3800,
        motion: "zoom-focus",
        tapPoint: { x: 50, y: 55, label: "Send via WhatsApp" },
      },
    ],
  },
  {
    id: "driver-insights",
    badge: "Step 4 of 5 · Work Analytics",
    title: "Read monthly insights & PDF reports",
    description:
      "Review your total trips, completion rate, kilometers driven, passengers served, and recorded fares by month — and export a designed PDF report.",
    routeHint: "/driver/insight/",
    highlights: [
      "Switch between months to track growth and busy travel periods",
      "Monitor completed trips, distance driven, passengers, and fares",
      "Download a print-ready Monthly PDF report in one tap",
    ],
    shots: [
      {
        src: "/onboarding/driver-4-1.webp",
        alt: "Driver Work Insights monthly summary with Download Monthly PDF button and KPI cards",
        caption: "1. Check monthly trips, km & recorded fares",
        durationMs: 3400,
        motion: "zoom-in",
        tapPoint: { x: 38, y: 57, label: "Download PDF" },
      },
      {
        src: "/onboarding/driver-4-2.webp",
        alt: "Driver Insights charts and performance breakdown",
        caption: "2. Explore visual trends & route breakdown",
        durationMs: 3400,
        motion: "pan-down",
      },
      {
        src: "/onboarding/driver-4-3.webp",
        alt: "Driver Insights completed trips ledger",
        caption: "3. Review every completed trip in detail",
        durationMs: 3300,
        motion: "pan-up",
      },
    ],
  },
  {
    id: "driver-vehicle",
    badge: "Step 5 of 5 · Vehicle Profile",
    title: "Add & maintain your vehicle",
    description:
      "Register your car with model, plate number, passenger & luggage capacity, and Front, Side, and Back photos so it appears on bookings and WhatsApp cards.",
    routeHint: "/driver/vehicle/",
    highlights: [
      "Add or edit vehicle model, plate number, category, and seats",
      "Upload crisp Front, Side, and Back angles for customers",
      "Auto-syncs with bookings, WhatsApp trip cards, and monthly PDFs",
    ],
    shots: [
      {
        src: "/onboarding/driver-5-1.webp",
        alt: "My Registered Vehicle page with Edit Vehicle button and Front Side Back gallery",
        caption: "1. Register or edit your vehicle profile",
        durationMs: 3300,
        motion: "zoom-in",
        tapPoint: { x: 28, y: 45, label: "Edit Vehicle" },
      },
      {
        src: "/onboarding/driver-5-2.webp",
        alt: "Vehicle specifications, passenger capacity, and route pricing details",
        caption: "2. Upload Front, Side & Back vehicle photos",
        durationMs: 3400,
        motion: "pan-down",
      },
      {
        src: "/onboarding/driver-5-3.webp",
        alt: "Complete vehicle profile features and availability status",
        caption: "3. Ready to appear on bookings & trip cards",
        durationMs: 3300,
        motion: "pan-up",
      },
    ],
  },
];

export const ONBOARDING_SLIDES_BY_ROLE: Record<
  OnboardingFlowRole,
  readonly OnboardingSlide[]
> = {
  customer: CUSTOMER_ONBOARDING_SLIDES,
  company: COMPANY_ONBOARDING_SLIDES,
  driver: DRIVER_ONBOARDING_SLIDES,
};
