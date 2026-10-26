/**
 * Black-box smoke test for the migrated API. Requires a running production
 * server (`npm run start`) and the migrated local database.
 *
 * Usage: npm run smoke
 */
import { PrismaClient } from "@prisma/client";
import { unlink } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000";
const prisma = new PrismaClient();

const stamp = Date.now();
const ADMIN = { username: `smoke_admin_${stamp}`, email: `smoke_admin_${stamp}@example.com`, password: "SmokeAdmin123!" };
const CUSTOMER_A = { username: `smoke_a_${stamp}`, email: `smoke_a_${stamp}@example.com`, password: "SmokeCustomer123!" };
const CUSTOMER_B = { username: `smoke_b_${stamp}`, email: `smoke_b_${stamp}@example.com`, password: "SmokeCustomer123!" };

const results = [];
const created = {
  userIds: [],
  bookingIds: [],
  reviewIds: [],
  sessionIds: [],
  tourIds: [],
  companyIds: [],
};

function record(name, passed, detail = "") {
  results.push({ name, passed, detail });
  const mark = passed ? "PASS" : "FAIL";
  console.log(`${mark} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, options);
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: response.status, body, headers: response.headers };
}

const json = (method, data, token) => ({
  method,
  headers: {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
  body: data === undefined ? undefined : JSON.stringify(data),
});

async function login(credentials) {
  const response = await request("/api/token/", json("POST", credentials));
  if (response.status !== 200) {
    throw new Error(`login failed for ${credentials.username}: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return response.body.access;
}

class CookieJar {
  cookies = new Map();

  store(response) {
    const setCookies = response.headers.getSetCookie?.() ?? [];
    for (const header of setCookies) {
      const [pair, ...attributes] = header.split(";");
      const separator = pair.indexOf("=");
      if (separator <= 0) continue;
      const name = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1).trim();
      const expired = attributes.some((attribute) =>
        /^\s*max-age=0\s*$/i.test(attribute),
      );
      if (expired || value === "") this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }

  set(name, value) {
    this.cookies.set(name, value);
  }

  header() {
    return [...this.cookies.entries()]
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }
}

async function requestWithCookies(path, jar, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.method && options.method !== "GET"
        ? { Origin: BASE }
        : {}),
      ...(jar.header() ? { Cookie: jar.header() } : {}),
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  const result = { status: response.status, body, headers: response.headers };
  jar.store(result);
  return result;
}

async function loginWithCookies(credentials) {
  const jar = new CookieJar();
  const response = await requestWithCookies("/api/token/", jar, {
    ...json("POST", credentials),
  });
  if (response.status !== 200) {
    throw new Error(
      `cookie login failed for ${credentials.username}: ${response.status}`,
    );
  }
  return jar;
}

async function run() {
  // Public reads and preserved data.
  const tours = await request("/api/tours/");
  record("GET /api/tours/ returns the migrated tours", tours.status === 200 && Array.isArray(tours.body) && tours.body.length === 2, `count=${tours.body?.length}`);

  const attractions = await request("/api/attractions/");
  record("GET /api/attractions/ returns the migrated attraction", attractions.status === 200 && attractions.body.length === 1);

  const home = await request("/api/home-settings/");
  record("GET /api/home-settings/ works", home.status === 200 && home.body && typeof home.body === "object");

  const reviewsAnon = await request("/api/reviews/?status=pending");
  record("anonymous review listing never exposes pending reviews", reviewsAnon.status === 200 && reviewsAnon.body.length === 0);

  const media = await request("/uploads/tours/IMG-20250730-WA0015_q0D9N6v.jpg", { method: "HEAD" });
  record("migrated media is served from /uploads", media.status === 200);

  // Admin registration must not be public.
  const registerDenied = await request("/api/admin/register/", json("POST", { ...ADMIN, setup_token: "wrong-token" }));
  record("POST /api/admin/register/ rejects a wrong setup token", registerDenied.status === 403, `status=${registerDenied.status}`);

  const registerAdmin = await request(
    "/api/admin/register/",
    json("POST", { ...ADMIN, setup_token: process.env.ADMIN_SETUP_TOKEN }),
  );
  record("POST /api/admin/register/ accepts the configured setup token", registerAdmin.status === 201, `status=${registerAdmin.status}`);
  if (registerAdmin.body?.id) created.userIds.push(registerAdmin.body.id);
  const adminToken = await login(ADMIN);

  // Customer registration and login.
  const registerA = await request("/api/register/", json("POST", CUSTOMER_A));
  if (registerA.body?.id) created.userIds.push(registerA.body.id);
  const createdCustomerId = registerA.body?.id;
  record("POST /api/register/ creates a customer", registerA.status === 201);
  const customerAToken = await login(CUSTOMER_A);

  const registerB = await request("/api/register/", json("POST", CUSTOMER_B));
  if (registerB.body?.id) created.userIds.push(registerB.body.id);
  const createdCustomerBId = registerB.body?.id;
  const customerBToken = await login(CUSTOMER_B);

  // Staff guards.
  const stats = await request("/api/dashboard/stats/", { headers: { Authorization: `Bearer ${adminToken}` } });
  record("GET /api/dashboard/stats/ works for staff", stats.status === 200 && stats.body?.total_users >= 3);

  const statsDenied = await request("/api/dashboard/stats/", { headers: { Authorization: `Bearer ${customerAToken}` } });
  record("GET /api/dashboard/stats/ is denied for customers", statsDenied.status === 403);

  const users = await request("/api/users/", { headers: { Authorization: `Bearer ${adminToken}` } });
  record("GET /api/users/ works for staff", users.status === 200 && Array.isArray(users.body));

  // Phase 4: company administration is platform-staff only and every mutation
  // is scoped, validated and audited.
  const companiesDenied = await request("/api/admin/companies/", {
    headers: { Authorization: `Bearer ${customerAToken}` },
  });
  record("customers cannot list companies", companiesDenied.status === 403, `status=${companiesDenied.status}`);

  const companySlugBase = `smoke-company-${stamp}`;
  const companyName = `Smoke Company ${stamp}`;
  const halfCoordinates = await request(
    "/api/admin/companies/",
    json(
      "POST",
      {
        name: `Smoke Half Coordinates ${stamp}`,
        slug: `${companySlugBase}-half`,
        latitude: "-6.165917",
        longitude: "",
      },
      adminToken,
    ),
  );
  record(
    "company creation rejects half a coordinate pair",
    halfCoordinates.status === 400,
    `status=${halfCoordinates.status}`,
  );

  const companyCreate = await request(
    "/api/admin/companies/",
    json(
      "POST",
      {
        name: companyName,
        slug: companySlugBase,
        description: "Temporary smoke-test company profile.",
        registration_reference: `SMOKE-${stamp}`,
        business_type: "TOUR_OPERATOR",
        contact_email: `company_${stamp}@example.com`,
        contact_phone: "255700000111",
        address: "1 Smoke Street",
        locality: "Stone Town",
        district: "Mjini Magharibi",
        region: "Zanzibar",
        country: "Tanzania",
        latitude: "-6.165917",
        longitude: "39.202641",
      },
      adminToken,
    ),
  );
  const companyId = companyCreate.body?.id;
  if (companyId) created.companyIds.push(companyId);
  record(
    "staff can create a company that starts pending and private",
    companyCreate.status === 201 &&
      companyCreate.body?.status === "PENDING" &&
      companyCreate.body?.is_public === false &&
      companyCreate.body?.latitude === -6.165917 &&
      companyCreate.body?.longitude === 39.202641,
    `status=${companyCreate.status} company=${companyCreate.body?.status} public=${companyCreate.body?.is_public}`,
  );
  const companyCreateAudit = companyId
    ? await prisma.auditLog.findFirst({
        where: { companyId, action: "company.create" },
        select: { id: true, actorId: true },
      })
    : null;
  record(
    "company creation is attributed in the audit log",
    Boolean(companyCreateAudit && companyCreateAudit.actorId),
  );

  const duplicateSlug = await request(
    "/api/admin/companies/",
    json("POST", { name: `${companyName} Duplicate`, slug: companySlugBase }, adminToken),
  );
  record(
    "an explicitly duplicate company slug is rejected",
    duplicateSlug.status === 400,
    `status=${duplicateSlug.status}`,
  );

  const companyList = await request(
    `/api/admin/companies/?page=1&page_size=5&search=${encodeURIComponent(companySlugBase)}&status=PENDING&business_type=TOUR_OPERATOR&region=Zanzibar`,
    { headers: { Authorization: `Bearer ${adminToken}` } },
  );
  const companyListRows = Array.isArray(companyList.body)
    ? companyList.body
    : companyList.body?.results;
  record(
    "company list supports server-side search, status/type/region filters and pagination",
    companyList.status === 200 &&
      Array.isArray(companyListRows) &&
      companyListRows.length === 1 &&
      companyListRows[0]?.id === companyId &&
      companyList.body?.count === 1 &&
      companyList.headers.get("x-total-count") === "1",
    `status=${companyList.status} count=${companyList.body?.count}`,
  );

  const renamedSlug = `${companySlugBase}-renamed`;
  const companyUpdate = await request(
    `/api/admin/companies/${companyId}/`,
    json(
      "PATCH",
      {
        name: `${companyName} Renamed`,
        slug: renamedSlug,
        region: "Unguja",
        latitude: "-6.17",
        longitude: "39.21",
        contact_phone: "255700000112",
      },
      adminToken,
    ),
  );
  record(
    "staff can edit company details and coordinates",
    companyUpdate.status === 200 &&
      companyUpdate.body?.name === `${companyName} Renamed` &&
      companyUpdate.body?.slug === renamedSlug &&
      companyUpdate.body?.latitude === -6.17 &&
      companyUpdate.body?.longitude === 39.21,
    `status=${companyUpdate.status} slug=${companyUpdate.body?.slug}`,
  );
  const slugAudit = companyId
    ? await prisma.auditLog.findFirst({
        where: { companyId, action: "company.slug_change" },
        select: { id: true },
      })
    : null;
  record("company slug changes are audited", Boolean(slugAudit));

  const badCoordinateUpdate = await request(
    `/api/admin/companies/${companyId}/`,
    json("PATCH", { latitude: "-6.17", longitude: "181" }, adminToken),
  );
  record(
    "company updates reject out-of-range coordinates",
    badCoordinateUpdate.status === 400,
    `status=${badCoordinateUpdate.status}`,
  );

  const pendingPublic = await request(
    `/api/admin/companies/${companyId}/`,
    json("PATCH", { is_public: true }, adminToken),
  );
  record(
    "a pending company cannot be made public",
    pendingPublic.status === 400,
    `status=${pendingPublic.status}`,
  );

  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=",
    "base64",
  );
  const uploadForm = new FormData();
  uploadForm.append("logo_image", new Blob([png], { type: "image/png" }), "logo.png");
  uploadForm.append("cover_image", new Blob([png], { type: "image/png" }), "cover.png");
  const companyUpload = await request(`/api/admin/companies/${companyId}/`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: uploadForm,
  });
  record(
    "company logo and cover uploads are stored and serialized",
    companyUpload.status === 200 &&
      String(companyUpload.body?.logo_image_url ?? "").includes("/uploads/companies/") &&
      String(companyUpload.body?.cover_image_url ?? "").includes(
        "/uploads/companies/covers/",
      ),
    `status=${companyUpload.status} logo=${companyUpload.body?.logo_image_url}`,
  );

  const activateCompany = await request(
    `/api/admin/companies/${companyId}/lifecycle/`,
    json("POST", { action: "activate" }, adminToken),
  );
  record(
    "staff can activate a pending company without publishing it automatically",
    activateCompany.status === 200 &&
      activateCompany.body?.status === "ACTIVE" &&
      activateCompany.body?.is_public === false,
    `status=${activateCompany.status} company=${activateCompany.body?.status}`,
  );

  const makePublic = await request(
    `/api/admin/companies/${companyId}/`,
    json("PATCH", { is_public: true }, adminToken),
  );
  record(
    "an active company can explicitly be made public",
    makePublic.status === 200 && makePublic.body?.is_public === true,
    `status=${makePublic.status}`,
  );

  const suspendCompany = await request(
    `/api/admin/companies/${companyId}/lifecycle/`,
    json("POST", { action: "suspend" }, adminToken),
  );
  record(
    "suspending a company removes public visibility immediately",
    suspendCompany.status === 200 &&
      suspendCompany.body?.status === "SUSPENDED" &&
      suspendCompany.body?.is_public === false &&
      Boolean(suspendCompany.body?.suspended_at),
    `status=${suspendCompany.status} public=${suspendCompany.body?.is_public}`,
  );

  const suspendedPublic = await request(
    `/api/admin/companies/${companyId}/`,
    json("PATCH", { is_public: true }, adminToken),
  );
  record(
    "a suspended company cannot be made public",
    suspendedPublic.status === 400,
    `status=${suspendedPublic.status}`,
  );

  const memberAssign = await request(
    `/api/admin/companies/${companyId}/members/`,
    json("POST", { user_id: createdCustomerId, role: "MANAGER" }, adminToken),
  );
  const membershipId = memberAssign.body?.id;
  record(
    "staff can assign an active company membership",
    memberAssign.status === 201 &&
      memberAssign.body?.status === "ACTIVE" &&
      memberAssign.body?.role === "MANAGER" &&
      memberAssign.body?.user?.id === createdCustomerId,
    `status=${memberAssign.status} role=${memberAssign.body?.role}`,
  );

  const memberRoleChange = membershipId
    ? await request(
        `/api/admin/companies/${companyId}/members/${membershipId}/`,
        json("PATCH", { role: "STAFF" }, adminToken),
      )
    : { status: 0, body: null };
  record(
    "staff can change a company member role",
    memberRoleChange.status === 200 && memberRoleChange.body?.role === "STAFF",
    `status=${memberRoleChange.status}`,
  );

  const memberRevoke = membershipId
    ? await request(`/api/admin/companies/${companyId}/members/${membershipId}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    : { status: 0, body: null };
  const revokedMembershipRow = membershipId
    ? await prisma.companyMembership.findUnique({
        where: { id: membershipId },
        select: { status: true, revokedAt: true, userId: true },
      })
    : null;
  record(
    "revoking a membership preserves the historical row",
    memberRevoke.status === 200 &&
      memberRevoke.body?.status === "REVOKED" &&
      revokedMembershipRow?.status === "REVOKED" &&
      Boolean(revokedMembershipRow?.revokedAt),
    `status=${memberRevoke.status} row=${revokedMembershipRow?.status}`,
  );

  const reactivateCompany = await request(
    `/api/admin/companies/${companyId}/lifecycle/`,
    json("POST", { action: "reactivate" }, adminToken),
  );
  record(
    "staff can reactivate a suspended company without republishing it",
    reactivateCompany.status === 200 &&
      reactivateCompany.body?.status === "ACTIVE" &&
      reactivateCompany.body?.is_public === false,
    `status=${reactivateCompany.status}`,
  );

  const companyDetail = await request(`/api/admin/companies/${companyId}/`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  record(
    "company detail includes stats, members, history and audit",
    companyDetail.status === 200 &&
      companyDetail.body?.stats?.members_active === 0 &&
      Array.isArray(companyDetail.body?.members) &&
      companyDetail.body.members.some(
        (member) => member.id === membershipId && member.status === "REVOKED",
      ) &&
      Array.isArray(companyDetail.body?.recent_audit) &&
      companyDetail.body.recent_audit.length > 0 &&
      companyDetail.body?.logo_image_url,
    `status=${companyDetail.status} members=${companyDetail.body?.members?.length} audit=${companyDetail.body?.recent_audit?.length}`,
  );

  const workspace = await request("/api/workspaces/1/", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const workspacePatch = await request(
    "/api/workspaces/1/",
    json("PATCH", { notes: workspace.body?.notes ?? "" }, adminToken),
  );
  record(
    "workspace PATCH preserves tourist, hotel, driver and vehicle relations",
    workspace.status === 200 &&
      workspacePatch.status === 200 &&
      workspacePatch.body?.tourist === workspace.body?.tourist &&
      workspacePatch.body?.selected_hotel === workspace.body?.selected_hotel &&
      workspacePatch.body?.selected_travel_driver === workspace.body?.selected_travel_driver &&
      workspacePatch.body?.selected_travel_vehicle === workspace.body?.selected_travel_vehicle &&
      workspacePatch.body?.total_price === workspace.body?.total_price,
    `tourist ${workspace.body?.tourist}->${workspacePatch.body?.tourist}`,
  );

  const workspacesDenied = await request("/api/workspaces/", {
    headers: { Authorization: `Bearer ${customerAToken}` },
  });
  record("workspaces are staff-only", workspacesDenied.status === 403);

  const homePatchDenied = await request("/api/home-settings/admin/", json("PATCH", { hero_image: null }));
  record("anonymous homepage mutation is rejected", homePatchDenied.status === 401);

  const tourCreateDenied = await request("/api/tours/", json("POST", { title: "x" }, customerAToken));
  record("customer cannot create tours", tourCreateDenied.status === 403);

  const softDeleteTour = await request(
    "/api/tours/",
    json(
      "POST",
      {
        title: `Smoke soft-delete tour ${stamp}`,
        description: "Temporary tour for the soft-delete regression check.",
        price: 10,
        duration: "1 day",
        destination: "Stone Town",
        category: "zanzibar",
      },
      adminToken,
    ),
  );
  record("staff can create a tour for the soft-delete check", softDeleteTour.status === 201, `status=${softDeleteTour.status}`);
  const softDeleteTourId = softDeleteTour.body?.id;
  if (softDeleteTourId) {
    created.tourIds.push(softDeleteTourId);
    const deleted = await request(`/api/tours/${softDeleteTourId}/`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const deletedRead = await request(`/api/tours/${softDeleteTourId}/`);
    record(
      "a soft-deleted tour detail returns 404 publicly",
      deleted.status === 204 && deletedRead.status === 404,
      `delete=${deleted.status} read=${deletedRead.status}`,
    );
  }

  // Bookings: creation, access control, status integrity.
  const bookingCreate = await request(
    "/api/bookings/",
    json(
      "POST",
      {
        tour: 46,
        full_name: "Smoke Customer A",
        email: CUSTOMER_A.email,
        phone: "255700000000",
        travelers: 2,
        travel_date: "2026-11-10",
        notes: "smoke test",
      },
      customerAToken,
    ),
  );
  record(
    "customer can create a booking with a generated reference",
    bookingCreate.status === 201 && typeof bookingCreate.body?.reference === "string" && bookingCreate.body.reference.startsWith("INF-"),
    `status=${bookingCreate.status} reference=${bookingCreate.body?.reference}`,
  );
  const bookingId = bookingCreate.body?.id;
  if (bookingId) created.bookingIds.push(bookingId);

  const persistedBooking = bookingId
    ? await prisma.booking.findUnique({
        where: { id: bookingId },
        select: {
          companyId: true,
          companyNameSnapshot: true,
          tourTitleSnapshot: true,
          tour: {
            select: {
              companyId: true,
              title: true,
              company: { select: { name: true } },
            },
          },
        },
      })
    : null;
  record(
    "booking persists server-derived attribution snapshots",
    Boolean(
      persistedBooking &&
        persistedBooking.tourTitleSnapshot === persistedBooking.tour.title &&
        persistedBooking.companyId === persistedBooking.tour.companyId &&
        persistedBooking.companyNameSnapshot ===
          (persistedBooking.tour.company?.name ?? null),
    ),
    persistedBooking
      ? `company=${persistedBooking.companyId} title=${persistedBooking.tourTitleSnapshot}`
      : "no persisted booking",
  );

  // A company-owned tour must derive its company from the tour row, never from
  // client input, and preserve company/title snapshots on the booking.
  const attributionCompany = await prisma.company.create({
    data: {
      name: `Smoke Attribution Company ${stamp}`,
      slug: `smoke-attribution-company-${stamp}`,
      description: "Temporary smoke-test company",
      status: "ACTIVE",
      isPublic: true,
    },
  });
  created.companyIds.push(attributionCompany.id);
  const attributionTour = await prisma.tour.create({
    data: {
      title: `Smoke Company Tour ${stamp}`,
      description: "Temporary company-owned tour",
      price: "125.00",
      duration: "1 day",
      destination: "Zanzibar",
      category: "zanzibar",
      available: true,
      companyId: attributionCompany.id,
      publicationStatus: "PUBLISHED",
      publishedAt: new Date(),
    },
  });
  created.tourIds.push(attributionTour.id);
  const companyBooking = await request(
    "/api/bookings/",
    json(
      "POST",
      {
        tour: attributionTour.id,
        full_name: "Smoke Company Booking",
        email: CUSTOMER_B.email,
        phone: "255700000003",
        travelers: 1,
        travel_date: "2028-02-02",
      },
      customerAToken,
    ),
  );
  if (companyBooking.body?.id) created.bookingIds.push(companyBooking.body.id);
  record(
    "company-owned booking returns server-derived attribution",
    companyBooking.status === 201 &&
      companyBooking.body?.company === attributionCompany.id &&
      companyBooking.body?.company_name === attributionCompany.name &&
      companyBooking.body?.tour_title === attributionTour.title,
    `status=${companyBooking.status} company=${companyBooking.body?.company} title=${companyBooking.body?.tour_title}`,
  );
  const persistedCompanyBooking = companyBooking.body?.id
    ? await prisma.booking.findUnique({
        where: { id: companyBooking.body.id },
        select: {
          companyId: true,
          companyNameSnapshot: true,
          tourTitleSnapshot: true,
        },
      })
    : null;
  record(
    "company-owned booking persists immutable attribution snapshots",
    persistedCompanyBooking?.companyId === attributionCompany.id &&
      persistedCompanyBooking?.companyNameSnapshot === attributionCompany.name &&
      persistedCompanyBooking?.tourTitleSnapshot === attributionTour.title,
    persistedCompanyBooking
      ? `company=${persistedCompanyBooking.companyId} title=${persistedCompanyBooking.tourTitleSnapshot}`
      : "no persisted company booking",
  );

  const crossCompanyMembership = membershipId
    ? await request(
        `/api/admin/companies/${attributionCompany.id}/members/${membershipId}/`,
        json("PATCH", { role: "OWNER" }, adminToken),
      )
    : { status: 0 };
  record(
    "a membership id cannot be mutated through another company",
    crossCompanyMembership.status === 404,
    `status=${crossCompanyMembership.status}`,
  );

  const archiveAttributionCompany = await request(
    `/api/admin/companies/${attributionCompany.id}/lifecycle/`,
    json("POST", { action: "archive" }, adminToken),
  );
  const retainedBooking = companyBooking.body?.id
    ? await prisma.booking.findUnique({
        where: { id: companyBooking.body.id },
        select: { id: true, companyId: true, status: true },
      })
    : null;
  record(
    "archiving a company retains its historical bookings",
    archiveAttributionCompany.status === 200 &&
      archiveAttributionCompany.body?.status === "ARCHIVED" &&
      archiveAttributionCompany.body?.is_public === false &&
      retainedBooking?.id === companyBooking.body?.id &&
      retainedBooking?.companyId === attributionCompany.id &&
      archiveAttributionCompany.body?.bookings?.some(
        (booking) => booking.id === companyBooking.body?.id,
      ),
    `status=${archiveAttributionCompany.status} booking=${retainedBooking?.id}`,
  );

  const archivedMemberAssign = await request(
    `/api/admin/companies/${attributionCompany.id}/members/`,
    json("POST", { user_id: createdCustomerId, role: "STAFF" }, adminToken),
  );
  const archivedReactivate = await request(
    `/api/admin/companies/${attributionCompany.id}/lifecycle/`,
    json("POST", { action: "reactivate" }, adminToken),
  );
  record(
    "an archived company rejects new members and reactivation",
    archivedMemberAssign.status === 409 && archivedReactivate.status === 409,
    `member=${archivedMemberAssign.status} reactivate=${archivedReactivate.status}`,
  );

  const otherCustomerRead = await request(`/api/bookings/${bookingId}/`, {
    headers: { Authorization: `Bearer ${customerBToken}` },
  });
  record("another customer cannot read the booking (IDOR)", otherCustomerRead.status === 404, `status=${otherCustomerRead.status}`);

  const anonymousRead = await request(`/api/bookings/${bookingId}/`);
  record("anonymous booking read is rejected", anonymousRead.status === 401);

  const customerConfirm = await request(`/api/bookings/${bookingId}/`, json("PATCH", { status: "confirmed" }, customerAToken));
  record("customer cannot confirm their own booking", customerConfirm.status === 403, `status=${customerConfirm.status}`);

  const customerCancel = await request(`/api/bookings/${bookingId}/`, json("PATCH", { status: "cancelled" }, customerAToken));
  record("customer can cancel a pending booking", customerCancel.status === 200 && customerCancel.body?.status === "cancelled");

  // Capacity must be enforced atomically under concurrent requests.
  const raceDate = "2027-05-20";
  const [raceA, raceB] = await Promise.all([
    request(
      "/api/bookings/",
      json(
        "POST",
        {
          tour: 46,
          full_name: "Smoke Race A",
          email: CUSTOMER_A.email,
          phone: "255700000001",
          travelers: 6,
          travel_date: raceDate,
        },
        customerAToken,
      ),
    ),
    request(
      "/api/bookings/",
      json(
        "POST",
        {
          tour: 46,
          full_name: "Smoke Race B",
          email: CUSTOMER_B.email,
          phone: "255700000002",
          travelers: 6,
          travel_date: raceDate,
        },
        customerBToken,
      ),
    ),
  ]);
  const raceWins = [raceA, raceB].filter((result) => result.status === 201);
  const raceLosses = [raceA, raceB].filter((result) => result.status === 400 || result.status === 409);
  for (const winner of raceWins) {
    if (winner.body?.id) created.bookingIds.push(winner.body.id);
  }
  record(
    "concurrent bookings cannot exceed tour capacity",
    raceWins.length === 1 && raceLosses.length === 1,
    `a=${raceA.status} b=${raceB.status}`,
  );

  const capacityBooking = await request(
    "/api/bookings/",
    json(
      "POST",
      {
        tour: 46,
        full_name: "Smoke Capacity Update",
        email: CUSTOMER_A.email,
        phone: "255700000003",
        travelers: 2,
        travel_date: "2027-05-21",
      },
      customerAToken,
    ),
  );
  const capacityBookingId = capacityBooking.body?.id;
  if (capacityBookingId) {
    created.bookingIds.push(capacityBookingId);
    const capacityUpdate = await request(
      `/api/bookings/${capacityBookingId}/`,
      json("PATCH", { travelers: 11 }, customerAToken),
    );
    record(
      "a booking update cannot exceed tour capacity",
      capacityBooking.status === 201 && capacityUpdate.status === 400,
      `create=${capacityBooking.status} update=${capacityUpdate.status}`,
    );
  } else {
    record("a booking update cannot exceed tour capacity", false, `create=${capacityBooking.status}`);
  }

  // Reviews: private until moderated.
  const reviewCreate = await request(
    "/api/reviews/",
    json("POST", { rating: 5, content: "Smoke test review", tour: 46 }, customerAToken),
  );
  record("customer can submit a review", reviewCreate.status === 201 && reviewCreate.body?.status === "pending");
  const reviewId = reviewCreate.body?.id;
  if (reviewId) created.reviewIds.push(reviewId);

  const anonReviewsAfter = await request("/api/reviews/");
  record(
    "pending review stays private",
    anonReviewsAfter.status === 200 && !JSON.stringify(anonReviewsAfter.body).includes("Smoke test review"),
  );

  const approveDenied = await request(`/api/reviews/${reviewId}/approve/`, json("PATCH", { status: "approved" }, customerAToken));
  record("customer cannot moderate reviews", approveDenied.status === 403);

  const approve = await request(`/api/reviews/${reviewId}/approve/`, json("PATCH", { status: "approved" }, adminToken));
  record("staff can approve a review", approve.status === 200 && approve.body?.status === "approved");

  const anonReviewsApproved = await request("/api/reviews/");
  record(
    "approved review becomes public",
    anonReviewsApproved.status === 200 && JSON.stringify(anonReviewsApproved.body).includes("Smoke test review"),
  );

  // Contact form + analytics tracking.
  const contact = await request(
    "/api/contact/",
    json("POST", {
      name: "Smoke Visitor",
      email: `smoke_visitor_${stamp}@example.com`,
      subject: "Smoke",
      message: "Smoke test message",
    }),
  );
  record("contact form accepts a public message", contact.status === 201);

  const sessionId = `smoke_${stamp}`;
  created.sessionIds.push(sessionId);
  const track = await request("/api/track-visit/", json("POST", { session_id: sessionId, page_url: "/smoke" }));
  record("visit tracking accepts anonymous events", track.status === 201);

  // Server-side page protection and session cookies.
  const adminPage = await request("/admin/dashboard/", {
    headers: { Cookie: `infaan_session=${adminToken}` },
    redirect: "manual",
  });
  record("staff can open /admin/dashboard/ with a session cookie", adminPage.status === 200);

  const customerAdminPage = await request("/admin/dashboard/", {
    headers: { Cookie: `infaan_session=${customerAToken}` },
    redirect: "manual",
  });
  record(
    "customer is redirected away from /admin/dashboard/",
    customerAdminPage.status === 307 &&
      customerAdminPage.headers.get("location")?.includes("/dashboard"),
    `status=${customerAdminPage.status}`,
  );

  const removedCustomerDashboard = await request("/dashboard/", {
    headers: { Cookie: `infaan_session=${customerAToken}` },
    redirect: "manual",
  });
  record(
    "customer dashboard page is removed",
    removedCustomerDashboard.status === 404,
    `status=${removedCustomerDashboard.status}`,
  );

  const anonymousAdminPage = await request("/admin/dashboard/", { redirect: "manual" });
  record(
    "anonymous visitor is redirected from /admin/dashboard/",
    anonymousAdminPage.status === 307 && anonymousAdminPage.headers.get("location")?.includes("/admin/login"),
  );

  // Phase 5: server-resolved company access control.
  const accessCompanyA = await prisma.company.create({
    data: {
      name: `Smoke Access Company A ${stamp}`,
      slug: `smoke-access-a-${stamp}`,
      description: "Temporary Phase 5 access company A.",
      region: "Zanzibar",
      country: "Tanzania",
      status: "ACTIVE",
      isPublic: true,
    },
  });
  const accessCompanyB = await prisma.company.create({
    data: {
      name: `Smoke Access Company B ${stamp}`,
      slug: `smoke-access-b-${stamp}`,
      description: "Temporary Phase 5 access company B.",
      region: "Dar es Salaam",
      country: "Tanzania",
      status: "ACTIVE",
      isPublic: false,
    },
  });
  created.companyIds.push(accessCompanyA.id, accessCompanyB.id);

  const accessTourA = await prisma.tour.create({
    data: {
      title: `Smoke Access Tour A ${stamp}`,
      description: "Temporary Phase 5 company A tour.",
      price: "140.00",
      duration: "2 days",
      destination: "Nungwi",
      category: "zanzibar",
      available: true,
      companyId: accessCompanyA.id,
      publicationStatus: "PUBLISHED",
      publishedAt: new Date(),
      maxTravelers: 20,
    },
  });
  const accessTourB = await prisma.tour.create({
    data: {
      title: `Smoke Access Tour B ${stamp}`,
      description: "Temporary Phase 5 company B tour.",
      price: "180.00",
      duration: "3 days",
      destination: "Ruaha",
      category: "tanzania",
      available: true,
      companyId: accessCompanyB.id,
      publicationStatus: "PUBLISHED",
      publishedAt: new Date(),
      maxTravelers: 20,
    },
  });
  created.tourIds.push(accessTourA.id, accessTourB.id);

  const accessBookingA = await prisma.booking.create({
    data: {
      reference: `PH5-A-${stamp}`,
      userId: createdCustomerId,
      tourId: accessTourA.id,
      companyId: accessCompanyA.id,
      companyNameSnapshot: accessCompanyA.name,
      tourTitleSnapshot: accessTourA.title,
      fullName: "Access Booking A",
      email: CUSTOMER_A.email,
      phone: "255700000101",
      travelers: 1,
      travelDate: new Date("2028-06-10T00:00:00.000Z"),
      status: "pending",
    },
  });
  const accessBookingB = await prisma.booking.create({
    data: {
      reference: `PH5-B-${stamp}`,
      userId: createdCustomerBId,
      tourId: accessTourB.id,
      companyId: accessCompanyB.id,
      companyNameSnapshot: accessCompanyB.name,
      tourTitleSnapshot: accessTourB.title,
      fullName: "Access Booking B",
      email: CUSTOMER_B.email,
      phone: "255700000102",
      travelers: 1,
      travelDate: new Date("2028-06-11T00:00:00.000Z"),
      status: "pending",
    },
  });
  created.bookingIds.push(accessBookingA.id, accessBookingB.id);

  const ownerAccessAssign = await request(
    `/api/admin/companies/${accessCompanyA.id}/members/`,
    json("POST", { user_id: createdCustomerId, role: "OWNER" }, adminToken),
  );
  const staffBCompanyAssign = await request(
    `/api/admin/companies/${accessCompanyB.id}/members/`,
    json("POST", { user_id: createdCustomerId, role: "STAFF" }, adminToken),
  );
  const staffACompanyAssign = await request(
    `/api/admin/companies/${accessCompanyA.id}/members/`,
    json("POST", { user_id: createdCustomerBId, role: "STAFF" }, adminToken),
  );
  record(
    "company access fixtures have active memberships",
    ownerAccessAssign.status === 201 &&
      staffBCompanyAssign.status === 201 &&
      staffACompanyAssign.status === 201,
    `owner=${ownerAccessAssign.status} staffB=${staffBCompanyAssign.status} staffA=${staffACompanyAssign.status}`,
  );

  const userCompanyNav = await request("/api/user/", {
    headers: { Authorization: `Bearer ${customerAToken}` },
  });
  const navCompanies = userCompanyNav.body?.companies;
  record(
    "user payload exposes navigation-sized active company roles",
    userCompanyNav.status === 200 &&
      Array.isArray(navCompanies) &&
      navCompanies.length === 2 &&
      userCompanyNav.body?.active_company_id === null &&
      navCompanies.some(
        (company) =>
          company.id === accessCompanyA.id &&
          company.role === "OWNER" &&
          company.permissions.includes("members:manage"),
      ) &&
      navCompanies.some(
        (company) =>
          company.id === accessCompanyB.id &&
          company.role === "STAFF" &&
          !company.permissions.includes("profile:read"),
      ) &&
      !JSON.stringify(navCompanies).includes("assigned_by"),
    `status=${userCompanyNav.status} count=${navCompanies?.length}`,
  );

  const ambiguousContext = await request("/api/company/context/", {
    headers: { Authorization: `Bearer ${customerAToken}` },
  });
  record(
    "multiple memberships require an explicit company selection",
    ambiguousContext.status === 409,
    `status=${ambiguousContext.status}`,
  );

  const accessJar = await loginWithCookies(CUSTOMER_A);
  const pickerPage = await requestWithCookies("/company/select/", accessJar, {
    redirect: "manual",
  });
  record(
    "the company picker renders without a selected company",
    pickerPage.status === 200 &&
      typeof pickerPage.body === "string" &&
      pickerPage.body.includes("Choose a company workspace"),
    `status=${pickerPage.status}`,
  );

  const cookieContextBefore = await requestWithCookies(
    "/api/company/context/",
    accessJar,
  );
  record(
    "a cookie session without a selection does not choose a company",
    cookieContextBefore.status === 409,
    `status=${cookieContextBefore.status}`,
  );

  const switchToA = await requestWithCookies(
    "/api/company/switch/",
    accessJar,
    json("POST", { company_id: accessCompanyA.id }),
  );
  const contextA = await requestWithCookies(
    "/api/company/context/",
    accessJar,
  );
  record(
    "a user can select a company they actively belong to",
    switchToA.status === 200 &&
      contextA.status === 200 &&
      contextA.body?.company?.id === accessCompanyA.id &&
      contextA.body?.role === "OWNER" &&
      contextA.body?.permissions?.includes("members:manage"),
    `switch=${switchToA.status} context=${contextA.status} role=${contextA.body?.role}`,
  );

  const companyDashboardPage = await requestWithCookies(
    "/company/dashboard/",
    accessJar,
    { redirect: "manual" },
  );
  record(
    "the selected company can open the protected dashboard shell",
    companyDashboardPage.status === 200 &&
      typeof companyDashboardPage.body === "string" &&
      companyDashboardPage.body.includes(accessCompanyA.name) &&
      companyDashboardPage.body.includes("Company workspace"),
    `status=${companyDashboardPage.status}`,
  );

  const ownerProfile = await requestWithCookies(
    "/api/company/profile/",
    accessJar,
  );
  record(
    "an owner can read the selected company profile",
    ownerProfile.status === 200 &&
      ownerProfile.body?.id === accessCompanyA.id &&
      ownerProfile.body?.contact_email === accessCompanyA.contactEmail,
    `status=${ownerProfile.status}`,
  );

  const ownerTours = await requestWithCookies(
    `/api/company/tours/?company_id=${accessCompanyB.id}`,
    accessJar,
  );
  const ownerTourItems = Array.isArray(ownerTours.body)
    ? ownerTours.body
    : ownerTours.body?.results;
  const ownerCrossTour = await requestWithCookies(
    `/api/company/tours/${accessTourB.id}/`,
    accessJar,
  );
  record(
    "company tour reads ignore a client company id and hide other companies",
    ownerTours.status === 200 &&
      Array.isArray(ownerTourItems) &&
      ownerTourItems.length === 1 &&
      ownerTourItems[0]?.id === accessTourA.id &&
      ownerTourItems.every(
        (tour) => tour.company_id === accessCompanyA.id,
      ) &&
      ownerCrossTour.status === 404,
    `list=${ownerTours.status} cross=${ownerCrossTour.status}`,
  );

  const ownerBookings = await requestWithCookies(
    "/api/company/bookings/",
    accessJar,
  );
  const ownerBookingItems = Array.isArray(ownerBookings.body)
    ? ownerBookings.body
    : ownerBookings.body?.results;
  const ownerCrossBooking = await requestWithCookies(
    `/api/company/bookings/${accessBookingB.id}/`,
    accessJar,
  );
  record(
    "company booking reads stay inside the selected company",
    ownerBookings.status === 200 &&
      Array.isArray(ownerBookingItems) &&
      ownerBookingItems.some((booking) => booking.id === accessBookingA.id) &&
      !ownerBookingItems.some((booking) => booking.id === accessBookingB.id) &&
      ownerBookingItems.every(
        (booking) => booking.company === accessCompanyA.id,
      ) &&
      ownerCrossBooking.status === 404,
    `list=${ownerBookings.status} cross=${ownerCrossBooking.status}`,
  );

  // Phase 6: delegated profile fields, company tour operations, booking
  // transitions and company-scoped analytics.
  const phase6Email = `phase6-${stamp}@example.com`;
  const phase6Profile = await requestWithCookies(
    "/api/company/profile/",
    accessJar,
    json("PATCH", {
      description: `Phase 6 delegated profile ${stamp}`,
      contact_email: phase6Email,
      contact_phone: "255700000200",
      address: "Phase 6 Street",
      latitude: -6.17,
      longitude: 39.21,
      name: "Attempted rename",
      slug: `attempted-${stamp}`,
      registration_reference: "ATTEMPTED",
      business_type: "OTHER",
      status: "SUSPENDED",
      is_public: false,
    }),
  );
  const persistedPhase6Profile = await prisma.company.findUnique({
    where: { id: accessCompanyA.id },
    select: {
      name: true,
      slug: true,
      status: true,
      isPublic: true,
      registrationReference: true,
      businessType: true,
      contactEmail: true,
      description: true,
      address: true,
    },
  });
  const phase6ProfileAudit = await prisma.auditLog.findFirst({
    where: {
      companyId: accessCompanyA.id,
      action: "company.profile.update",
      actorId: createdCustomerId,
    },
    select: { id: true, companyId: true },
  });
  record(
    "company profile updates only delegated fields and audits the change",
    phase6Profile.status === 200 &&
      phase6Profile.body?.name === accessCompanyA.name &&
      phase6Profile.body?.slug === accessCompanyA.slug &&
      phase6Profile.body?.status === "ACTIVE" &&
      phase6Profile.body?.is_public === true &&
      phase6Profile.body?.registration_reference === null &&
      phase6Profile.body?.business_type === accessCompanyA.businessType &&
      persistedPhase6Profile?.name === accessCompanyA.name &&
      persistedPhase6Profile?.slug === accessCompanyA.slug &&
      persistedPhase6Profile?.contactEmail === phase6Email &&
      persistedPhase6Profile?.address === "Phase 6 Street" &&
      Boolean(phase6ProfileAudit),
    `status=${phase6Profile.status} name=${persistedPhase6Profile?.name} email=${persistedPhase6Profile?.contactEmail}`,
  );

  const anonymousCompanyTours = await request("/api/company/tours/");
  const stafflessCompanyBookings = await request("/api/company/bookings/", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  record(
    "company endpoints reject anonymous and unaffiliated users",
    anonymousCompanyTours.status === 401 &&
      stafflessCompanyBookings.status === 403,
    `anonymous=${anonymousCompanyTours.status} staff=${stafflessCompanyBookings.status}`,
  );

  const staffAnalytics = await request("/api/company/analytics/", {
    headers: { Authorization: `Bearer ${customerBToken}` },
  });
  const staffDashboard = await request("/api/company/dashboard/", {
    headers: { Authorization: `Bearer ${customerBToken}` },
  });
  record(
    "staff can read the dashboard but not company analytics",
    staffDashboard.status === 200 && staffAnalytics.status === 403,
    `dashboard=${staffDashboard.status} analytics=${staffAnalytics.status}`,
  );

  const phase6TourTitle = `Smoke Phase 6 Tour ${stamp}`;
  const phase6TourCreate = await requestWithCookies(
    "/api/company/tours/",
    accessJar,
    json("POST", {
      title: phase6TourTitle,
      description: "A temporary Phase 6 company tour.",
      short_description: "Phase 6 tour",
      price: "95.50",
      duration: "1 day",
      destination: "Paje",
      category: "zanzibar",
      max_travelers: 6,
      available: true,
      publication_status: "PUBLISHED",
      includes: ["Professional guide"],
      excludes: ["Flights"],
      itinerary: [
        { day: 1, title: "Beach day", description: "Relax on the coast." },
      ],
      company_id: accessCompanyB.id,
    }),
  );
  const phase6TourId = phase6TourCreate.body?.id;
  if (phase6TourId) created.tourIds.push(phase6TourId);
  const publicPhase6Tour = phase6TourId
    ? await request(`/api/tours/${phase6TourId}/`)
    : { status: 0, body: null };
  record(
    "an owner can create a company tour without moving it to another company",
    phase6TourCreate.status === 201 &&
      phase6TourCreate.body?.company_id === accessCompanyA.id &&
      phase6TourCreate.body?.company_name === accessCompanyA.name &&
      phase6TourCreate.body?.publication_status === "PUBLISHED" &&
      phase6TourCreate.body?.available === true &&
      phase6TourCreate.body?.itinerary?.length === 1 &&
      publicPhase6Tour.status === 200 &&
      publicPhase6Tour.body?.company_id === accessCompanyA.id &&
      publicPhase6Tour.body?.company_name === accessCompanyA.name &&
      publicPhase6Tour.body?.company_slug === accessCompanyA.slug,
    `status=${phase6TourCreate.status} company=${phase6TourCreate.body?.company_id} public=${publicPhase6Tour.status}`,
  );

  const staffTourCreate = await request(
    "/api/company/tours/",
    json(
      "POST",
      {
        title: `Staff Attempt ${stamp}`,
        description: "Not allowed.",
        price: "10",
        duration: "1 day",
        destination: "Stone Town",
        category: "zanzibar",
        publication_status: "DRAFT",
      },
      customerBToken,
    ),
  );
  record(
    "staff cannot create or publish company tours",
    staffTourCreate.status === 403,
    `status=${staffTourCreate.status}`,
  );

  const phase6TourUnavailable = phase6TourId
    ? await requestWithCookies(
        `/api/company/tours/${phase6TourId}/`,
        accessJar,
        json("PATCH", { available: false }),
      )
    : { status: 0, body: null };
  const publicUnavailable = phase6TourId
    ? await request(`/api/tours/${phase6TourId}/`)
    : { status: 0 };
  record(
    "availability changes do not change publication state",
    phase6TourUnavailable.status === 200 &&
      phase6TourUnavailable.body?.available === false &&
      phase6TourUnavailable.body?.publication_status === "PUBLISHED" &&
      publicUnavailable.status === 200,
    `status=${phase6TourUnavailable.status} public=${publicUnavailable.status}`,
  );

  const phase6TourDraft = phase6TourId
    ? await requestWithCookies(
        `/api/company/tours/${phase6TourId}/`,
        accessJar,
        json("PATCH", { available: true, publication_status: "DRAFT" }),
      )
    : { status: 0, body: null };
  const publicDraft = phase6TourId
    ? await request(`/api/tours/${phase6TourId}/`)
    : { status: 0 };
  const listDraft = await request("/api/tours/");
  const republishPhase6Tour = phase6TourId
    ? await requestWithCookies(
        `/api/company/tours/${phase6TourId}/`,
        accessJar,
        json("PATCH", { publication_status: "PUBLISHED" }),
      )
    : { status: 0, body: null };
  record(
    "unpublishing a company tour removes public visibility",
    phase6TourDraft.status === 200 &&
      phase6TourDraft.body?.publication_status === "DRAFT" &&
      publicDraft.status === 404 &&
      Array.isArray(listDraft.body) &&
      !listDraft.body.some((tour) => tour.id === phase6TourId) &&
      republishPhase6Tour.status === 200 &&
      republishPhase6Tour.body?.publication_status === "PUBLISHED",
    `draft=${phase6TourDraft.status} public=${publicDraft.status} republish=${republishPhase6Tour.status}`,
  );

  const phase6Booking =
    phase6TourId && republishPhase6Tour.status === 200
      ? await request(
          "/api/bookings/",
          json(
            "POST",
            {
              tour: phase6TourId,
              full_name: "Phase 6 Guest",
              email: CUSTOMER_B.email,
              phone: "255700000210",
              travelers: 2,
              travel_date: "2029-03-03",
            },
            customerBToken,
          ),
        )
      : { status: 0, body: null };
  const phase6BookingId = phase6Booking.body?.id;
  if (phase6BookingId) created.bookingIds.push(phase6BookingId);
  const staffConfirm = phase6BookingId
    ? await request(
        `/api/company/bookings/${phase6BookingId}/`,
        json("PATCH", { status: "confirmed" }, customerBToken),
      )
    : { status: 0, body: null };
  const phase6GuestNotification = phase6BookingId
    ? await prisma.notification.findFirst({
        where: {
          userId: createdCustomerBId,
          tag: `booking-${phase6BookingId}`,
          title: { contains: "confirmed" },
        },
        select: { id: true, userId: true },
      })
    : null;
  record(
    "staff can confirm a company booking and the guest is notified",
    phase6Booking.status === 201 &&
      staffConfirm.status === 200 &&
      staffConfirm.body?.status === "confirmed" &&
      Array.isArray(staffConfirm.body?.allowed_transitions) &&
      staffConfirm.body.allowed_transitions.includes("cancelled") &&
      staffConfirm.body?.status_history?.some(
        (entry) =>
          entry.actor?.username === CUSTOMER_B.username &&
          entry.before?.status === "pending" &&
          entry.after?.status === "confirmed",
      ) &&
      Boolean(phase6GuestNotification),
    `booking=${phase6Booking.status} confirm=${staffConfirm.status} notified=${Boolean(phase6GuestNotification)}`,
  );

  const ownerCancel = phase6BookingId
    ? await requestWithCookies(
        `/api/company/bookings/${phase6BookingId}/`,
        accessJar,
        json("PATCH", { status: "cancelled" }),
      )
    : { status: 0, body: null };
  const reverseCancel = phase6BookingId
    ? await requestWithCookies(
        `/api/company/bookings/${phase6BookingId}/`,
        accessJar,
        json("PATCH", { status: "confirmed" }),
      )
    : { status: 0, body: null };
  const deleteBooking = phase6BookingId
    ? await requestWithCookies(
        `/api/company/bookings/${phase6BookingId}/`,
        accessJar,
        { method: "DELETE" },
      )
    : { status: 0 };
  record(
    "cancelled bookings are terminal and company staff cannot delete history",
    ownerCancel.status === 200 &&
      ownerCancel.body?.status === "cancelled" &&
      reverseCancel.status === 400 &&
      deleteBooking.status === 405,
    `cancel=${ownerCancel.status} reverse=${reverseCancel.status} delete=${deleteBooking.status}`,
  );

  const phase6ConcurrentBooking =
    phase6TourId && republishPhase6Tour.status === 200
      ? await request(
          "/api/bookings/",
          json(
            "POST",
            {
              tour: phase6TourId,
              full_name: "Phase 6 Concurrent Guest",
              email: CUSTOMER_A.email,
              phone: "255700000211",
              travelers: 1,
              travel_date: "2029-04-04",
            },
            customerAToken,
          ),
        )
      : { status: 0, body: null };
  const phase6ConcurrentId = phase6ConcurrentBooking.body?.id;
  if (phase6ConcurrentId) created.bookingIds.push(phase6ConcurrentId);
  let phase6Race = { first: { status: 0, body: null }, second: { status: 0, body: null } };
  if (phase6ConcurrentId) {
    let releaseLock;
    const lockAcquired = new Promise((resolve) => {
      releaseLock = resolve;
    });
    const holding = prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "bookings" WHERE id = ${phase6ConcurrentId} FOR UPDATE`;
        releaseLock();
        await new Promise((resolve) => setTimeout(resolve, 2000));
      },
      { timeout: 10000 },
    );
    await lockAcquired;
    const confirmed = requestWithCookies(
      `/api/company/bookings/${phase6ConcurrentId}/`,
      accessJar,
      json("PATCH", { status: "confirmed" }),
    );
    const cancelled = requestWithCookies(
      `/api/company/bookings/${phase6ConcurrentId}/`,
      accessJar,
      json("PATCH", { status: "cancelled" }),
    );
    phase6Race = {
      first: await confirmed,
      second: await cancelled,
    };
    await holding;
  }
  const phase6RaceStatuses = [phase6Race.first.status, phase6Race.second.status].sort(
    (a, b) => a - b,
  );
  const phase6RaceRow = phase6ConcurrentId
    ? await prisma.booking.findUnique({
        where: { id: phase6ConcurrentId },
        select: { status: true, companyId: true },
      })
    : null;
  const phase6RaceAuditCount = phase6ConcurrentId
    ? await prisma.auditLog.count({
        where: {
          companyId: accessCompanyA.id,
          action: "company.booking.status",
          entity: "booking",
          entityId: String(phase6ConcurrentId),
        },
      })
    : 0;
  record(
    "concurrent company booking transitions allow exactly one stale write",
    phase6ConcurrentBooking.status === 201 &&
      phase6RaceStatuses[0] === 200 &&
      phase6RaceStatuses[1] === 409 &&
      phase6RaceRow?.companyId === accessCompanyA.id &&
      phase6RaceAuditCount === 1,
    `requests=${phase6Race.first.status}/${phase6Race.second.status} status=${phase6RaceRow?.status} audit=${phase6RaceAuditCount}`,
  );

  const phase6BookingSearch = phase6Booking.body?.reference
    ? await requestWithCookies(
        `/api/company/bookings/?search=${encodeURIComponent(
          phase6Booking.body.reference,
        )}&tour=${phase6TourId}&page=1&page_size=5`,
        accessJar,
      )
    : { status: 0, body: null, headers: new Headers() };
  const phase6BookingResults = Array.isArray(phase6BookingSearch.body)
    ? phase6BookingSearch.body
    : phase6BookingSearch.body?.results;
  record(
    "company booking search filters by reference and company tour",
    phase6BookingSearch.status === 200 &&
      Array.isArray(phase6BookingResults) &&
      phase6BookingResults.length === 1 &&
      phase6BookingResults[0]?.id === phase6BookingId &&
      phase6BookingResults[0]?.company === accessCompanyA.id,
    `status=${phase6BookingSearch.status} count=${phase6BookingResults?.length}`,
  );

  const companyABookingCount = await prisma.booking.count({
    where: { companyId: accessCompanyA.id },
  });
  const companyATourCount = await prisma.tour.count({
    where: {
      companyId: accessCompanyA.id,
      deletedAt: null,
    },
  });
  const phase6Dashboard = await requestWithCookies(
    "/api/company/dashboard/",
    accessJar,
  );
  const phase6Analytics = await requestWithCookies(
    "/api/company/analytics/",
    accessJar,
  );
  const analyticsBookingTotal = Array.isArray(phase6Analytics.body?.booking_status)
    ? phase6Analytics.body.booking_status.reduce(
        (total, item) => total + Number(item.value ?? 0),
        0,
      )
    : -1;
  record(
    "company dashboard and analytics are scoped to the active company",
    phase6Dashboard.status === 200 &&
      phase6Analytics.status === 200 &&
      phase6Dashboard.body?.stats?.bookings_total === companyABookingCount &&
      phase6Dashboard.body?.stats?.tours_total === companyATourCount &&
      !JSON.stringify(phase6Dashboard.body).includes(accessTourB.title) &&
      phase6Analytics.body?.totals?.bookings === companyABookingCount &&
      phase6Analytics.body?.totals?.tours === companyATourCount &&
      analyticsBookingTotal === companyABookingCount &&
      !JSON.stringify(phase6Analytics.body).includes(accessTourB.title),
    `dashboard=${phase6Dashboard.status} analytics=${phase6Analytics.status} bookings=${phase6Dashboard.body?.stats?.bookings_total}/${companyABookingCount}`,
  );

  const phase6Archive = phase6TourId
    ? await requestWithCookies(
        `/api/company/tours/${phase6TourId}/`,
        accessJar,
        { method: "DELETE" },
      )
    : { status: 0 };
  const archivedTourRead = phase6TourId
    ? await requestWithCookies(
        `/api/company/tours/${phase6TourId}/`,
        accessJar,
      )
    : { status: 0 };
  const archivedTourPublic = phase6TourId
    ? await request(`/api/tours/${phase6TourId}/`)
    : { status: 0 };
  const archivedTourSearch = phase6TourId
    ? await requestWithCookies(
        `/api/company/tours/?search=${encodeURIComponent(phase6TourTitle)}&page=1&page_size=5`,
        accessJar,
      )
    : { status: 0, body: null };
  const archivedTourSearchRows = Array.isArray(archivedTourSearch.body)
    ? archivedTourSearch.body
    : archivedTourSearch.body?.results;
  const retainedHistoricalBooking = phase6BookingId
    ? await prisma.booking.findUnique({
        where: { id: phase6BookingId },
        select: { companyId: true, companyNameSnapshot: true },
      })
    : null;
  record(
    "archiving a company tour keeps its booking history and hides it everywhere",
    phase6Archive.status === 204 &&
      archivedTourRead.status === 404 &&
      archivedTourPublic.status === 404 &&
      Array.isArray(archivedTourSearchRows) &&
      archivedTourSearchRows.length === 0 &&
      retainedHistoricalBooking?.companyId === accessCompanyA.id &&
      retainedHistoricalBooking?.companyNameSnapshot === accessCompanyA.name,
    `archive=${phase6Archive.status} read=${archivedTourRead.status} public=${archivedTourPublic.status}`,
  );

  const ownerToursPage = await requestWithCookies(
    "/company/tours/",
    accessJar,
    { redirect: "manual" },
  );
  const ownerTourPage = await requestWithCookies(
    `/company/tours/${accessTourA.id}/`,
    accessJar,
    { redirect: "manual" },
  );
  const ownerBookingsPage = await requestWithCookies(
    "/company/bookings/",
    accessJar,
    { redirect: "manual" },
  );
  const ownerBookingPage = await requestWithCookies(
    `/company/bookings/${accessBookingA.id}/`,
    accessJar,
    { redirect: "manual" },
  );
  const ownerProfilePage = await requestWithCookies(
    "/company/profile/",
    accessJar,
    { redirect: "manual" },
  );
  const ownerAnalyticsPage = await requestWithCookies(
    "/company/analytics/",
    accessJar,
    { redirect: "manual" },
  );
  record(
    "all Phase 6 company pages render for an owner",
    ownerToursPage.status === 200 &&
      ownerTourPage.status === 200 &&
      ownerBookingsPage.status === 200 &&
      ownerBookingPage.status === 200 &&
      ownerProfilePage.status === 200 &&
      ownerAnalyticsPage.status === 200,
    `tours=${ownerToursPage.status} bookings=${ownerBookingsPage.status} profile=${ownerProfilePage.status} analytics=${ownerAnalyticsPage.status}`,
  );

  // Phase 7: public company discovery.
  await prisma.company.update({
    where: { id: accessCompanyB.id },
    data: { isPublic: true },
  });
  const phase7SuspendedCompany = await prisma.company.create({
    data: {
      name: `Smoke Suspended Company ${stamp}`,
      slug: `smoke-suspended-company-${stamp}`,
      description: "Temporary suspended company.",
      region: "Zanzibar",
      country: "Tanzania",
      status: "SUSPENDED",
      isPublic: false,
    },
  });
  created.companyIds.push(phase7SuspendedCompany.id);

  const publicCompanies = await request(
    `/api/companies/?search=${encodeURIComponent("Smoke Access Company")}&page=1&page_size=10`,
  );
  const publicCompanyItems = Array.isArray(publicCompanies.body)
    ? publicCompanies.body
    : publicCompanies.body?.results;
  const publicCompanySearch = await request(
    `/api/search/?q=${encodeURIComponent("Smoke Access Company")}`,
  );
  record(
    "public company discovery returns multiple active public companies",
    publicCompanies.status === 200 &&
      Array.isArray(publicCompanyItems) &&
      publicCompanyItems.some((company) => company.id === accessCompanyA.id) &&
      publicCompanyItems.some((company) => company.id === accessCompanyB.id) &&
      Array.isArray(publicCompanySearch.body?.companies) &&
      publicCompanySearch.body.companies.some(
        (company) => company.id === accessCompanyA.id,
      ),
    `list=${publicCompanies.status} count=${publicCompanyItems?.length} search=${publicCompanySearch.body?.companies?.length}`,
  );

  const zanzibarCompanies = await request(
    `/api/companies/?business_type=TOUR_OPERATOR&region=Zanzibar&page=1&page_size=10`,
  );
  const zanzibarCompanyItems = Array.isArray(zanzibarCompanies.body)
    ? zanzibarCompanies.body
    : zanzibarCompanies.body?.results;
  record(
    "public company filters are server-side",
    zanzibarCompanies.status === 200 &&
      Array.isArray(zanzibarCompanyItems) &&
      zanzibarCompanyItems.some((company) => company.id === accessCompanyA.id) &&
      !zanzibarCompanyItems.some((company) => company.id === accessCompanyB.id),
    `status=${zanzibarCompanies.status} count=${zanzibarCompanyItems?.length}`,
  );

  const publicCompanyDetail = await request(
    `/api/companies/${accessCompanyA.slug}/`,
  );
  record(
    "a public company profile exposes only public company and published tour data",
    publicCompanyDetail.status === 200 &&
      publicCompanyDetail.body?.id === accessCompanyA.id &&
      publicCompanyDetail.body?.status === undefined &&
      Array.isArray(publicCompanyDetail.body?.tours) &&
      publicCompanyDetail.body.tours.some((tour) => tour.id === accessTourA.id) &&
      publicCompanyDetail.body.tours.every(
        (tour) => tour.publication_status === "PUBLISHED",
      ),
    `status=${publicCompanyDetail.status} tours=${publicCompanyDetail.body?.tours?.length}`,
  );

  const suspendedCompanyDetail = await request(
    `/api/companies/${phase7SuspendedCompany.slug}/`,
  );
  const suspendedCompanyPage = await request(
    `/company/${phase7SuspendedCompany.slug}/`,
    { redirect: "manual" },
  );
  record(
    "suspended and non-public companies are not publicly discoverable",
    suspendedCompanyDetail.status === 404 && suspendedCompanyPage.status === 404,
    `api=${suspendedCompanyDetail.status} page=${suspendedCompanyPage.status}`,
  );

  const staffToursPage = await request(
    "/company/tours/",
    {
      headers: { Cookie: `infaan_session=${customerBToken}` },
      redirect: "manual",
    },
  );
  const staffAnalyticsPage = await request(
    "/company/analytics/",
    {
      headers: { Cookie: `infaan_session=${customerBToken}` },
      redirect: "manual",
    },
  );
  const staffBookingPage = await request(
    `/company/bookings/${accessBookingA.id}/`,
    {
      headers: { Cookie: `infaan_session=${customerBToken}` },
      redirect: "manual",
    },
  );
  record(
    "staff page access is limited to dashboard and booking operations",
    staffToursPage.status === 403 &&
      staffAnalyticsPage.status === 403 &&
      staffBookingPage.status === 200,
    `tours=${staffToursPage.status} analytics=${staffAnalyticsPage.status} booking=${staffBookingPage.status}`,
  );

  const switchWithoutMembership = await requestWithCookies(
    "/api/company/switch/",
    accessJar,
    json("POST", { company_id: companyId }),
  );
  const contextAfterRejectedSwitch = await requestWithCookies(
    "/api/company/context/",
    accessJar,
  );
  record(
    "a revoked membership cannot be selected or used for access",
    switchWithoutMembership.status === 404 &&
      contextAfterRejectedSwitch.body?.company?.id === accessCompanyA.id,
    `switch=${switchWithoutMembership.status} company=${contextAfterRejectedSwitch.body?.company?.id}`,
  );

  accessJar.set("active_company", String(accessCompanyB.id + 900000));
  const tamperedCookieContext = await requestWithCookies(
    "/api/company/context/",
    accessJar,
  );
  record(
    "a tampered company selector does not authorize another company",
    tamperedCookieContext.status === 409,
    `status=${tamperedCookieContext.status}`,
  );

  const switchToB = await requestWithCookies(
    "/api/company/switch/",
    accessJar,
    json("POST", { company_id: accessCompanyB.id }),
  );
  const staffContextB = await requestWithCookies(
    "/api/company/context/",
    accessJar,
  );
  const staffProfileB = await requestWithCookies(
    "/api/company/profile/",
    accessJar,
  );
  const staffToursB = await requestWithCookies(
    "/api/company/tours/",
    accessJar,
  );
  const staffBookingsB = await requestWithCookies(
    "/api/company/bookings/",
    accessJar,
  );
  const staffBookingItemsB = Array.isArray(staffBookingsB.body)
    ? staffBookingsB.body
    : staffBookingsB.body?.results;
  record(
    "staff has dashboard and booking access but no profile or tours access",
    switchToB.status === 200 &&
      staffContextB.status === 200 &&
      staffContextB.body?.company?.id === accessCompanyB.id &&
      staffContextB.body?.role === "STAFF" &&
      staffProfileB.status === 403 &&
      staffToursB.status === 403 &&
      staffBookingsB.status === 200 &&
      staffBookingItemsB?.some(
        (booking) => booking.id === accessBookingB.id,
      ) &&
      !staffBookingItemsB?.some(
        (booking) => booking.id === accessBookingA.id,
      ),
    `context=${staffContextB.status} profile=${staffProfileB.status} tours=${staffToursB.status} bookings=${staffBookingsB.status}`,
  );

  const switchBackToA = await requestWithCookies(
    "/api/company/switch/",
    accessJar,
    json("POST", { company_id: accessCompanyA.id }),
  );

  const singleMembershipContext = await request(
    "/api/company/context/",
    { headers: { Authorization: `Bearer ${customerBToken}` } },
  );
  const staffProfileA = await request("/api/company/profile/", {
    headers: { Authorization: `Bearer ${customerBToken}` },
  });
  const staffToursA = await request("/api/company/tours/", {
    headers: { Authorization: `Bearer ${customerBToken}` },
  });
  const staffBookingsA = await request("/api/company/bookings/", {
    headers: { Authorization: `Bearer ${customerBToken}` },
  });
  const staffBookingItemsA = Array.isArray(staffBookingsA.body)
    ? staffBookingsA.body
    : staffBookingsA.body?.results;
  record(
    "a single active membership is selected server-side for staff",
    switchBackToA.status === 200 &&
      singleMembershipContext.status === 200 &&
      singleMembershipContext.body?.company?.id === accessCompanyA.id &&
      singleMembershipContext.body?.role === "STAFF" &&
      staffProfileA.status === 403 &&
      staffToursA.status === 403 &&
      staffBookingsA.status === 200 &&
      staffBookingItemsA?.some(
        (booking) => booking.id === accessBookingA.id,
      ),
    `context=${singleMembershipContext.status} profile=${staffProfileA.status} bookings=${staffBookingsA.status}`,
  );

  const privilegeEscalation = await request(
    "/api/user/",
    json(
      "PATCH",
      {
        is_staff: true,
        is_superuser: true,
        company_id: accessCompanyB.id,
        role: "OWNER",
      },
      customerAToken,
    ),
  );
  const escalatedUser = await prisma.user.findUnique({
    where: { id: createdCustomerId },
    select: { isStaff: true, isSuperuser: true },
  });
  const roleAfterEscalation = await prisma.companyMembership.findFirst({
    where: {
      companyId: accessCompanyB.id,
      userId: createdCustomerId,
      status: "ACTIVE",
    },
    select: { role: true },
  });
  record(
    "profile updates cannot escalate platform or company roles",
    privilegeEscalation.status === 200 &&
      escalatedUser?.isStaff === false &&
      escalatedUser?.isSuperuser === false &&
      roleAfterEscalation?.role === "STAFF" &&
      privilegeEscalation.body?.is_staff === false,
    `status=${privilegeEscalation.status} role=${roleAfterEscalation?.role}`,
  );

  const ownerAdminAttempt = await request(
    `/api/admin/companies/${accessCompanyA.id}/members/`,
    json(
      "POST",
      { user_id: createdCustomerBId, role: "OWNER" },
      customerAToken,
    ),
  );
  record(
    "a company owner cannot use platform company administration",
    ownerAdminAttempt.status === 403,
    `status=${ownerAdminAttempt.status}`,
  );

  const publicTourBeforeSuspend = await request(
    `/api/tours/${accessTourA.id}/`,
  );
  const publicListBeforeSuspend = await request("/api/tours/");
  const accessCompanyReview = await prisma.review.create({
    data: {
      userId: createdCustomerId,
      tourId: accessTourA.id,
      rating: 5,
      content: `Access company review ${stamp}`,
      status: "approved",
    },
  });
  created.reviewIds.push(accessCompanyReview.id);
  const publicReviewsBeforeSuspend = await request("/api/reviews/");
  record(
    "an active company tour has public presence",
    publicTourBeforeSuspend.status === 200 &&
      Array.isArray(publicListBeforeSuspend.body) &&
      publicListBeforeSuspend.body.some(
        (tour) => tour.id === accessTourA.id,
      ) &&
      JSON.stringify(publicReviewsBeforeSuspend.body).includes(
        accessCompanyReview.content,
      ),
    `detail=${publicTourBeforeSuspend.status}`,
  );

  const suspendAccessCompany = await request(
    `/api/admin/companies/${accessCompanyA.id}/lifecycle/`,
    json("POST", { action: "suspend" }, adminToken),
  );
  const suspendedCompanyContext = await requestWithCookies(
    "/api/company/context/",
    accessJar,
  );
  const suspendedDashboardPage = await requestWithCookies(
    "/company/dashboard/",
    accessJar,
    { redirect: "manual" },
  );
  const adminRetainsSuspended = await request(
    `/api/admin/companies/${accessCompanyA.id}/`,
    { headers: { Authorization: `Bearer ${adminToken}` } },
  );
  const suspendedPublicTour = await request(
    `/api/tours/${accessTourA.id}/`,
  );
  const suspendedPublicList = await request("/api/tours/");
  const suspendedPublicReviews = await request("/api/reviews/");
  const suspendedBookingAttempt = await request(
    "/api/bookings/",
    json(
      "POST",
      {
        tour: accessTourA.id,
        full_name: "Suspended Company Booking",
        email: CUSTOMER_B.email,
        phone: "255700000103",
        travelers: 1,
        travel_date: "2028-07-01",
      },
      customerBToken,
    ),
  );
  record(
    "suspension immediately blocks company operations and public presence",
    suspendAccessCompany.status === 200 &&
      suspendAccessCompany.body?.status === "SUSPENDED" &&
      suspendAccessCompany.body?.is_public === false &&
      suspendedCompanyContext.status === 403 &&
      suspendedDashboardPage.status === 403 &&
      adminRetainsSuspended.status === 200 &&
      suspendedPublicTour.status === 404 &&
      Array.isArray(suspendedPublicList.body) &&
      !suspendedPublicList.body.some(
        (tour) => tour.id === accessTourA.id,
      ) &&
      suspendedPublicList.body.some((tour) => tour.id === accessTourB.id) &&
      !JSON.stringify(suspendedPublicReviews.body).includes(
        accessCompanyReview.content,
      ) &&
      suspendedBookingAttempt.status === 404,
    `context=${suspendedCompanyContext.status} page=${suspendedDashboardPage.status} public=${suspendedPublicTour.status} booking=${suspendedBookingAttempt.status}`,
  );

  const recoverPickerPage = await requestWithCookies(
    "/company/select/",
    accessJar,
    { redirect: "manual" },
  );
  const reactivateAccessCompany = await request(
    `/api/admin/companies/${accessCompanyA.id}/lifecycle/`,
    json("POST", { action: "reactivate" }, adminToken),
  );
  const restoredCompanyContext = await requestWithCookies(
    "/api/company/context/",
    accessJar,
  );
  record(
    "a suspended selection is recoverable after reactivation",
    recoverPickerPage.status === 200 &&
      reactivateAccessCompany.status === 200 &&
      restoredCompanyContext.status === 200 &&
      restoredCompanyContext.body?.company?.id === accessCompanyA.id,
    `picker=${recoverPickerPage.status} reactivate=${reactivateAccessCompany.status} context=${restoredCompanyContext.status}`,
  );

  const staffMembershipId = staffACompanyAssign.body?.id;
  const revokeStaffMembership = staffMembershipId
    ? await request(
        `/api/admin/companies/${accessCompanyA.id}/members/${staffMembershipId}/`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${adminToken}` },
        },
      )
    : { status: 0, body: null };
  const revokedStaffContext = await request("/api/company/context/", {
    headers: { Authorization: `Bearer ${customerBToken}` },
  });
  const revokedStaffNav = await request("/api/user/", {
    headers: { Authorization: `Bearer ${customerBToken}` },
  });
  const revokedStaffMembershipRow = staffMembershipId
    ? await prisma.companyMembership.findUnique({
        where: { id: staffMembershipId },
        select: { status: true, revokedAt: true },
      })
    : null;
  record(
    "revoking a membership removes company access immediately but keeps history",
    revokeStaffMembership.status === 200 &&
      revokedStaffContext.status === 403 &&
      Array.isArray(revokedStaffNav.body?.companies) &&
      revokedStaffNav.body.companies.length === 0 &&
      revokedStaffMembershipRow?.status === "REVOKED" &&
      Boolean(revokedStaffMembershipRow?.revokedAt),
    `revoke=${revokeStaffMembership.status} context=${revokedStaffContext.status} companies=${revokedStaffNav.body?.companies?.length}`,
  );

  const logoutWithCompany = await requestWithCookies(
    "/api/auth/logout/",
    accessJar,
    { method: "POST" },
  );
  const clearedCompanyCookie = (
    logoutWithCompany.headers.getSetCookie?.() ?? []
  ).some(
    (header) =>
      header.startsWith("active_company=") &&
      /max-age=0|expires=thu, 01 jan 1970/i.test(header),
  );
  const userAfterCompanyLogout = await requestWithCookies(
    "/api/user/",
    accessJar,
  );
  record(
    "logout clears the active company selector with the session",
    logoutWithCompany.status === 200 &&
      clearedCompanyCookie &&
      userAfterCompanyLogout.status === 401,
    `logout=${logoutWithCompany.status} cleared=${clearedCompanyCookie} user=${userAfterCompanyLogout.status}`,
  );

  // Password reset verified in person: staff issues the code, the customer uses it.
  const resetIssue = await request(
    "/api/auth/password-reset/issue/",
    json("POST", { user_id: createdCustomerId }, adminToken),
  );
  record("staff can issue a password reset code", resetIssue.status === 200 && Boolean(resetIssue.body?.code));

  const resetConfirm = await request(
    "/api/auth/password-reset/confirm/",
    json("POST", {
      email: CUSTOMER_A.email,
      code: resetIssue.body?.code,
      new_password: "ResetCustomer123!",
    }),
  );
  record("the reset code sets a new password", resetConfirm.status === 200, `status=${resetConfirm.status}`);

  const loginWithNewPassword = await request(
    "/api/token/",
    json("POST", { username: CUSTOMER_A.username, password: "ResetCustomer123!" }),
  );
  record("the customer can sign in with the new password", loginWithNewPassword.status === 200);

  const reuseCode = await request(
    "/api/auth/password-reset/confirm/",
    json("POST", {
      email: CUSTOMER_A.email,
      code: resetIssue.body?.code,
      new_password: "AnotherPass123!",
    }),
  );
  record("a used reset code cannot be reused", reuseCode.status === 400, `status=${reuseCode.status}`);

  // Email verification issued and confirmed in person.
  const verificationIssue = await request(
    "/api/auth/email-verification/issue/",
    json("POST", { user_id: createdCustomerId }, adminToken),
  );
  const verificationConfirm = await request(
    "/api/auth/email-verification/confirm/",
    json("POST", { email: CUSTOMER_A.email, code: verificationIssue.body?.code }),
  );
  record(
    "email verification works end to end",
    verificationIssue.status === 200 && verificationConfirm.status === 200,
    `issue=${verificationIssue.status} confirm=${verificationConfirm.status}`,
  );

  // Mobile compatibility: token pair and trailing slash.
  const tokenPair = await request("/api/token/", json("POST", ADMIN));
  record(
    "mobile token endpoint returns access + refresh",
    tokenPair.status === 200 && typeof tokenPair.body?.access === "string" && typeof tokenPair.body?.refresh === "string",
  );

  const refresh = await request("/api/token/refresh/", json("POST", { refresh: tokenPair.body?.refresh }));
  record("mobile refresh endpoint works", refresh.status === 200 && typeof refresh.body?.access === "string");

  // Logout revokes already-issued Bearer tokens and the refresh token.
  const logout = await request("/api/auth/logout/", {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenPair.body?.access}` },
  });
  record("logout succeeds", logout.status === 200, `status=${logout.status}`);

  const accessAfterLogout = await request("/api/user/", {
    headers: { Authorization: `Bearer ${tokenPair.body?.access}` },
  });
  record("logout revokes an already-issued access token", accessAfterLogout.status === 401, `status=${accessAfterLogout.status}`);

  const refreshAfterLogout = await request(
    "/api/token/refresh/",
    json("POST", { refresh: tokenPair.body?.refresh }),
  );
  record(
    "logout revokes an already-issued refresh token",
    refreshAfterLogout.status === 401,
    `status=${refreshAfterLogout.status}`,
  );
}

async function cleanup() {
  if (created.reviewIds.length) {
    await prisma.review.deleteMany({ where: { id: { in: created.reviewIds } } });
  }
  if (created.bookingIds.length) {
    await prisma.booking.deleteMany({ where: { id: { in: created.bookingIds } } });
  }
  if (created.sessionIds.length) {
    await prisma.visitorTracking.deleteMany({ where: { sessionId: { in: created.sessionIds } } });
  }
  if (created.tourIds.length) {
    await prisma.tour.deleteMany({ where: { id: { in: created.tourIds } } });
  }
  if (created.companyIds.length) {
    const companies = await prisma.company.findMany({
      where: { id: { in: created.companyIds } },
      select: { logoImageKey: true, coverImageKey: true },
    });
    await prisma.auditLog.deleteMany({
      where: { companyId: { in: created.companyIds } },
    });
    await prisma.notification.deleteMany({
      where: { companyId: { in: created.companyIds } },
    });
    for (const company of companies) {
      for (const key of [company.logoImageKey, company.coverImageKey]) {
        if (!key) continue;
        await unlink(path.join(process.cwd(), "public", "uploads", key)).catch(() => {});
      }
    }
    await prisma.company.deleteMany({ where: { id: { in: created.companyIds } } });
  }
  await prisma.contactMessage.deleteMany({ where: { email: { contains: `smoke_visitor_${stamp}` } } });
  if (created.userIds.length) {
    await prisma.profile.deleteMany({ where: { userId: { in: created.userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: created.userIds } } });
  }
}

try {
  await run();
} catch (error) {
  record("smoke run completed", false, error instanceof Error ? error.message : String(error));
} finally {
  await cleanup();
  await prisma.$disconnect();
}

const failed = results.filter((result) => !result.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length) process.exitCode = 1;
