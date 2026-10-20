/**
 * Black-box smoke test for the migrated API. Requires a running production
 * server (`npm run start`) and the migrated local database.
 *
 * Usage: npm run smoke
 */
import { PrismaClient } from "@prisma/client";

const BASE = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000";
const prisma = new PrismaClient();

const stamp = Date.now();
const ADMIN = { username: `smoke_admin_${stamp}`, email: `smoke_admin_${stamp}@example.com`, password: "SmokeAdmin123!" };
const CUSTOMER_A = { username: `smoke_a_${stamp}`, email: `smoke_a_${stamp}@example.com`, password: "SmokeCustomer123!" };
const CUSTOMER_B = { username: `smoke_b_${stamp}`, email: `smoke_b_${stamp}@example.com`, password: "SmokeCustomer123!" };

const results = [];
const created = { userIds: [], bookingIds: [], reviewIds: [], sessionIds: [] };

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
  const customerBToken = await login(CUSTOMER_B);

  // Staff guards.
  const stats = await request("/api/dashboard/stats/", { headers: { Authorization: `Bearer ${adminToken}` } });
  record("GET /api/dashboard/stats/ works for staff", stats.status === 200 && stats.body?.total_users >= 3);

  const statsDenied = await request("/api/dashboard/stats/", { headers: { Authorization: `Bearer ${customerAToken}` } });
  record("GET /api/dashboard/stats/ is denied for customers", statsDenied.status === 403);

  const users = await request("/api/users/", { headers: { Authorization: `Bearer ${adminToken}` } });
  record("GET /api/users/ works for staff", users.status === 200 && Array.isArray(users.body));

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
  record("customer can create a booking", bookingCreate.status === 201, `status=${bookingCreate.status}`);
  const bookingId = bookingCreate.body?.id;
  if (bookingId) created.bookingIds.push(bookingId);

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

  const customerPage = await request("/dashboard/", {
    headers: { Cookie: `infaan_session=${customerAToken}` },
    redirect: "manual",
  });
  record("customer can open /dashboard/ with a session cookie", customerPage.status === 200);

  const anonymousAdminPage = await request("/admin/dashboard/", { redirect: "manual" });
  record(
    "anonymous visitor is redirected from /admin/dashboard/",
    anonymousAdminPage.status === 307 && anonymousAdminPage.headers.get("location")?.includes("/admin/login"),
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
