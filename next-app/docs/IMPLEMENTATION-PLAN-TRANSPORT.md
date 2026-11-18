# Implementation Plan — Tour Transport Platform (cars)

## 1. Objective and scope change

The product is repositioned from a **tours / travel & safari marketplace** to a
**tour transport platform for cars**. The unit of value is no longer a "tour" but a
**transport service**: a company's vehicle (car/van/bus) used to move tourists
between places, plus rentals of those vehicles.

Core flows:

1. **Companies** register and publish **vehicles** (not tours).
2. **Tourists** connect with companies, **plan a trip** (origin → destination,
   date, passengers, luggage), choose a **vehicle**, and **book transport**.
3. **Companies** then fulfil the trip by assigning/connecting a **driver**:
   - **Private drivers** (attached to a company) take jobs assigned by that company.
   - **Public drivers** (independent) can browse and accept **public jobs** that
     certain companies share to the open driver pool.
4. **Rentals**: a tourist rents a vehicle for a date range (with or without driver).
5. **Trip / route plan ("flight plan")**: every booking carries a planned route
   with stops, distance, duration and ETA, shown to tourist, company and driver.

Legacy "tours", "departures", "itineraries" and "attractions-as-tours" are
deprecated and removed only after data migration (Phase 9).

---

## 2. Domain glossary

| Term | Meaning |
|---|---|
| Transport company | A `Company` whose business type is transport/rental (was tour operator). |
| Vehicle | A registered car/van/bus owned by a company, with capacity, features, pricing. |
| Transport service | A sellable offering: airport transfer, intercity, city shuttle, rental. |
| Trip request | Tourist asks for transport between two points on a date. |
| Trip plan | Company's concrete proposal: vehicle + driver + route + price + schedule. |
| Transport booking | Confirmed agreement between tourist and company for a trip plan/rental. |
| Rental | Vehicle hire for a date range. |
| Job | A unit of driver work created from a booking/trip plan. |
| Private job | Job offered only to a company's own drivers. |
| Public job | Job shared to the open driver pool for any qualified public driver. |
| Flight plan / route plan | Ordered list of waypoints with distance, duration, ETA. |

---

## 3. Target data model (Prisma)

### 3.1 Enums (add)

```prisma
enum UserAccountType { CUSTOMER TOUR_COMPANY DRIVER ADMIN? }  // add DRIVER
enum CompanyBusinessType { TRANSPORT_OPERATOR CAR_RENTAL SHUTTLE_OPERATOR TOUR_OPERATOR ... }
enum VehicleType { SEDAN SUV VAN MINIBUS BUS LUXURY PICKUP }
enum VehicleStatus { AVAILABLE MAINTENANCE RETIRED }
enum DriverType { PRIVATE PUBLIC }
enum DriverStatus { PENDING ACTIVE SUSPENDED }
enum TripStatus { REQUESTED QUOTED ACCEPTED IN_PROGRESS COMPLETED CANCELLED }
enum BookingTransportStatus { pending confirmed in_progress completed cancelled }
enum JobType { PRIVATE PUBLIC }
enum JobStatus { OPEN ASSIGNED IN_PROGRESS COMPLETED CANCELLED EXPIRED }
enum RentalStatus { pending confirmed active completed cancelled }
enum ServiceType { AIRPORT_TRANSFER INTERCITY CITY_SHUTTLE CHARTER RENTAL }
```

### 3.2 New / changed models

**Vehicle** (replaces `TravelVehicle`, owned by company)
- `id`, `companyId`, `type`, `make`, `model`, `year`, `plateNumber` (unique),
  `capacity`, `luggageCapacity`, `features Json`, `images Json`,
  `status VehicleStatus`, `pricePerKm`, `pricePerHour`, `pricePerDay`,
  `driverRequired Boolean`, `createdAt/updatedAt`, `deletedAt`.
- Relations: `company`, `bookings`, `rentals`, `jobs`, `tripPlans`.

**Driver** (new, linked to User + optional Company)
- `id`, `userId` (unique), `companyId?` (for private drivers), `type DriverType`,
  `licenseNumber`, `licenseExpiry`, `status`, `rating`, `totalTrips`,
  `currentLat/Lng`, `createdAt/updatedAt`.
- Relations: `user`, `company?`, `jobs`, `tripPlans`.

**TransportService** (optional catalog of offerings per company)
- `id`, `companyId`, `type ServiceType`, `name`, `description`, `basePrice`,
  `active`.

**TripRequest** (tourist input)
- `id`, `userId?`, `origin`, `originLat/Lng`, `destination`, `destLat/Lng`,
  `waypoints Json`, `travelDate`, `passengers`, `luggage`, `notes`,
  `status`, `createdAt`.

**TripPlan** (company proposal)
- `id`, `requestId?`, `companyId`, `vehicleId`, `driverId?`,
  `origin/destination + coords`, `waypoints Json`, `distanceKm`, `durationMins`,
  `price`, `currency`, `schedule Json`, `status TripStatus`,
  `createdAt/updatedAt`.

**RoutePlan / FlightPlan** (could be embedded in TripPlan as `waypoints` + computed
fields; or separate model `RouteSegment` with order, from, to, distance, duration,
eta). Recommend separate `RouteSegment` for multi-leg "flight plan".

**TransportBooking** (replaces tour `Booking`)
- `id`, `reference`, `userId?`, `companyId`, `tripPlanId?`, `rentalId?`,
  `vehicleId`, `driverId?`, `fullName`, `email`, `phone`, `passengers`,
  `travelDate`, `pickupTime`, `totalPrice`, `status BookingTransportStatus`,
  `userLat/Lng`, `googleMapsUrl`, `createdAt`.

**Rental** (new)
- `id`, `userId?`, `companyId`, `vehicleId`, `driverId?`, `startDate`, `endDate`,
  `withDriver Boolean`, `dailyRate`, `totalPrice`, `status RentalStatus`,
  `notes`, `createdAt`.

**Job** (driver work)
- `id`, `companyId`, `tripPlanId?`, `bookingId?`, `vehicleId?`,
  `type JobType`, `title`, `pickup`, `dropoff`, `scheduledAt`,
  `payout`, `requirements Json`, `status JobStatus`, `assignedDriverId?`,
  `assignedAt`, `completedAt`, `createdAt`.

**JobApplication** (for public jobs)
- `id`, `jobId`, `driverId`, `status`, `createdAt`.

Keep `Company`, `CompanyMembership`, `Workspace` but repurpose:
- `Workspace` becomes **trip workspace / itinerary builder** (hotel + vehicle +
  driver + multiple legs). Remove `selectedTours`, add `selectedVehicles`,
  `selectedTripPlans`, `routeSegments`.

### 3.3 Deprecate (Phase 9 removal)
`Tour`, `TourDeparture`, `TourGalleryImage`, `ItineraryItem`, `TourTranslation`,
`Review` (tour-based), tour-based `Booking` fields, `FunnelEvent.tourId`.

---

## 4. Authentication & roles

- Add `DRIVER` to `UserAccountType`.
- Driver signup: license upload, vehicle preference, private/public selection.
- Company invites driver (private) → creates `Driver` linked to company.
- Public driver self-registers → `Driver.type = PUBLIC`, `companyId = null`.
- Permissions:
  - Tourist: create trip request, book, view own bookings.
  - Company staff: manage vehicles, create trip plans, post jobs, assign drivers,
    view company bookings.
  - Driver: view assigned jobs + open public jobs, accept/reject, update status.
  - Admin: approve companies/drivers, analytics.

---

## 5. API surface (new/changed)

### Vehicles (company)
- `GET/POST /api/company/vehicles`
- `GET/PATCH/DELETE /api/company/vehicles/[id]`
- `POST /api/company/vehicles/[id]/images`

### Drivers (company + driver)
- `GET/POST /api/company/drivers` (invite private driver)
- `GET/PATCH /api/drivers/me`
- `GET /api/drivers/jobs` (assigned + open public)
- `POST /api/drivers/jobs/[id]/accept|reject|start|complete`

### Trip requests & plans
- `POST /api/trip-requests`
- `GET /api/trip-requests/[id]`
- `GET/POST /api/company/trip-plans`
- `GET/PATCH /api/company/trip-plans/[id]`
- `POST /api/company/trip-plans/[id]/quote` (send to tourist)

### Transport bookings
- `POST /api/bookings/transport` (from trip plan)
- `GET /api/bookings/[id]`
- `PATCH /api/bookings/[id]/status`
- `GET /api/company/bookings`

### Rentals
- `GET/POST /api/rentals`
- `GET/PATCH /api/rentals/[id]`

### Jobs (company)
- `GET/POST /api/company/jobs`
- `GET/PATCH /api/company/jobs/[id]`
- `POST /api/company/jobs/[id]/share` (make public)
- `GET /api/jobs/public` (driver pool)

### Route / flight plan
- Reuse `/api/route/calculate`; add `/api/trip-plans/[id]/route` to persist
  segments and ETA.

### Search
- `/api/search` returns companies + vehicles + services instead of tours.

---

## 6. UI / pages

### Public
- Home: hero search (pickup, dropoff, date, passengers) instead of destinations.
- `/transport` or `/vehicles`: browse companies/vehicles.
- `/company/[slug]`: company profile + fleet + services + reviews.
- `/trip-plan/[id]`: view proposed transport + book.
- `/booking/[id]`: booking confirmation + route map.
- `/rentals`: rental search & booking.

### Company dashboard
- Fleet management (`/company/vehicles`).
- Trip requests inbox + trip plan builder (`/company/trips`).
- Bookings (`/company/bookings`).
- Drivers & jobs (`/company/drivers`, `/company/jobs`).
- Analytics (vehicles utilization, revenue, driver performance).

### Driver
- `/driver/dashboard`: assigned jobs, open public jobs, earnings.
- `/driver/jobs/[id]`: accept/start/complete, navigation map.

### Admin
- Approve transport companies & drivers.
- Fleet & booking oversight.
- Analytics.

---

## 7. Business logic & pricing

- Price calculation: base fare + (distanceKm × pricePerKm) + (duration × pricePerHour)
  + tolls/fees + driver allowance + platform commission.
- Rental pricing: dailyRate × days + deposit + optional driver.
- Job payout: agreed payout to driver; company margin.
- Availability: vehicle not double-booked for overlapping time windows;
  driver availability calendar.
- Matching: public jobs visible to drivers whose vehicle type/capacity qualify and
  who are within radius of pickup.

---

## 8. Notifications

Reuse existing push/in-app notification infra. New events:
- New trip request to company.
- Trip plan quoted to tourist.
- Booking confirmed.
- Job posted (to eligible drivers).
- Job accepted/started/completed.
- Driver arrival / trip completed.

---

## 9. Migration strategy (from tours to transport)

1. Add new models alongside old ones (no breaking change).
2. Backfill: `Company.businessType` default stays; mark transport companies.
   - Existing `TravelVehicle` → `Vehicle` (companyId from company).
   - Existing `TravelDriver` → `Driver`.
   - Existing `CompanyTrip` → `TripPlan` (optional).
3. Dual-run: keep tour endpoints working but hidden from new UI.
4. Switch UI to transport flows.
5. Deprecate tour endpoints (return 410) after data freeze.
6. Drop tour tables in a later migration.

---

## 10. Phased delivery

- **Phase 1 (Week 1-2):** Schema additions + migrations + enums; auth DRIVER role.
- **Phase 2 (Week 2-3):** Company vehicle CRUD + driver management.
- **Phase 3 (Week 3-4):** Trip request + trip plan builder + route/flight plan.
- **Phase 4 (Week 4-5):** Tourist search & booking transport.
- **Phase 5 (Week 5-6):** Rentals.
- **Phase 6 (Week 6-7):** Driver app + job market (private/public).
- **Phase 7 (Week 7-8):** Notifications, analytics, admin.
- **Phase 8 (Week 8-9):** Migration & cleanup of tours.
- **Phase 9 (Week 9-10):** Tests, smoke, performance, rollout.

---

## 11. Risks & open questions

- "Flight plan" ambiguity: treated as multi-leg route plan. If actual air travel
  is required, add `TransportMode` (road/air) and flight segments.
- Payments: current app has no payment gateway; bookings remain "pay on
  confirmation". Add payment provider in a later phase.
- Maps/routing provider limits (Nominatim/OSRM) for production scale.
- Driver verification & compliance (licenses, insurance) needs policy input.
- Multi-tenant company switching already exists; reuse.

---

## 12. Immediate next steps (recommended)

1. Approve this plan & glossary.
2. Run Phase 1 migration (additive only) on a branch.
3. Build company vehicle management first (highest leverage).
4. Keep tours read-only during transition to avoid breaking existing users.
