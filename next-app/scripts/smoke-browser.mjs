/**
 * Real-browser smoke test for the migrated website. Uses the locally installed
 * Chrome through puppeteer-core; no browser download is required.
 *
 * Usage: npm run smoke:browser   (server must already be running)
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import puppeteer from "puppeteer-core";

const BASE = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000";
const CHROME =
  process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const prisma = new PrismaClient();
const stamp = Date.now();

const admin = {
  username: `browser_admin_${stamp}`,
  email: `browser_admin_${stamp}@example.com`,
  password: "BrowserAdmin123!",
};
const customer = {
  username: `browser_customer_${stamp}`,
  email: `browser_customer_${stamp}@example.com`,
  password: "BrowserCustomer123!",
};

const results = [];
const pageErrors = [];
const hydrationErrors = [];
const serverErrors = [];
const sessionIds = new Set();
const userIds = [];
const companyIds = [];
const tourIds = [];
const bookingIds = [];

function record(name, passed, detail = "") {
  results.push({ name, passed, detail });
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function createUser(user, isStaff) {
  const password = await hash(user.password, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
  const created = await prisma.user.create({
    data: {
      username: user.username,
      email: user.email,
      password,
      isStaff,
      isActive: true,
    },
  });
  userIds.push(created.id);
  return created;
}

function attachDiagnostics(page) {
  page.on("pageerror", (error) => pageErrors.push(`${page.url()}: ${error.message}`));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /hydration|did not match|Minified React error/i.test(message.text())
    ) {
      hydrationErrors.push(`${page.url()}: ${message.text()}`);
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 500) {
      serverErrors.push(`${response.status()} ${response.url()}`);
    }
  });
}

async function visit(page, path, expectedText) {
  const response = await page.goto(`${BASE}${path}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  const status = response?.status() ?? 0;
  await page.waitForNetworkIdle({ idleTime: 400, timeout: 15000 }).catch(() => {});
  if (expectedText) {
    await page
      .waitForFunction(
        (text) => document.body.innerText.toLowerCase().includes(text.toLowerCase()),
        { timeout: 15000 },
        expectedText,
      )
      .catch(() => {});
  }
  const body = await page.evaluate(() => document.body.innerText);
  const found = expectedText ? body.toLowerCase().includes(expectedText.toLowerCase()) : true;
  record(
    `${path} renders${expectedText ? ` with “${expectedText}”` : ""}`,
    status < 400 && found,
    `status=${status} url=${page.url()} body=${body.replace(/\s+/g, " ").slice(0, 160)}`,
  );
  const sessionId = await page
    .evaluate(() => localStorage.getItem("session_id"))
    .catch(() => null);
  if (sessionId) sessionIds.add(sessionId);
}

async function checkResponsive(page, path, expectedText) {
  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewport({ width, height: 1000 });
    const response = await page.goto(`${BASE}${path}`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForSelector("h1", { timeout: 15000 }).catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 350));
    const state = await page.evaluate(() => ({
      overflow: Math.max(
        document.documentElement.scrollWidth,
        document.body?.scrollWidth ?? 0,
      ) - window.innerWidth,
      text: document.body.innerText,
    }));
    record(
      `${path} fits the ${width}px viewport`,
      (response?.status() ?? 0) < 400 &&
        state.overflow <= 1 &&
        (!expectedText || state.text.toLowerCase().includes(expectedText.toLowerCase())),
      `status=${response?.status() ?? 0} overflow=${state.overflow}px`,
    );
  }
  await page.setViewport({ width: 1440, height: 1000 });
}

async function uiLogin(page, path, user, expectedPath, expectedText) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[name="username"]', { timeout: 15000 });
  await page.type('input[name="username"]', user.username);
  await page.type('input[name="password"]', user.password);
  await page.click('button[type="submit"]');
  await page
    .waitForFunction(
      (fragment) => location.pathname.includes(fragment),
      { timeout: 20000 },
      expectedPath,
    )
    .catch(() => {});
  await page.waitForNetworkIdle({ idleTime: 500, timeout: 15000 }).catch(() => {});
  if (expectedText) {
    await page
      .waitForFunction(
        (text) => document.body.innerText.toLowerCase().includes(text.toLowerCase()),
        { timeout: 15000 },
        expectedText,
      )
      .catch(() => {});
  }
  const body = await page.evaluate(() => document.body.innerText);
  const pathname = await page.evaluate(() => location.pathname);
  record(
    `UI login for ${user.username} reaches ${expectedPath}`,
    pathname.includes(expectedPath) && body.toLowerCase().includes((expectedText || "").toLowerCase()),
    `path=${pathname}`,
  );
}

let browser;
try {
  await createUser(admin, true);
  const browserCustomer = await createUser(customer, false);

  const browserCompany = await prisma.company.create({
    data: {
      name: `Browser Company ${stamp}`,
      slug: `browser-company-${stamp}`,
      description: "Temporary company fixture for browser checks.",
      region: "Zanzibar",
      country: "Tanzania",
      latitude: -6.165917,
      longitude: 39.202641,
      status: "PENDING",
      isPublic: false,
    },
  });
  companyIds.push(browserCompany.id);

  const accessCompanyA = await prisma.company.create({
    data: {
      name: `Browser Access Company A ${stamp}`,
      slug: `browser-access-a-${stamp}`,
      description:
        "Temporary Phase 5 company workspace with a clear description for browser checks.",
      locality: "Nungwi",
      region: "Zanzibar",
      country: "Tanzania",
      status: "ACTIVE",
      isPublic: true,
    },
  });
  const accessCompanyB = await prisma.company.create({
    data: {
      name: `Browser Access Company B ${stamp}`,
      slug: `browser-access-b-${stamp}`,
      description: "Temporary Phase 5 second workspace for the switcher.",
      locality: "Dar es Salaam",
      region: "Dar es Salaam",
      country: "Tanzania",
      status: "ACTIVE",
      isPublic: false,
    },
  });
  companyIds.push(accessCompanyA.id, accessCompanyB.id);
  await prisma.companyMembership.createMany({
    data: [
      {
        companyId: accessCompanyA.id,
        userId: browserCustomer.id,
        role: "OWNER",
        status: "ACTIVE",
      },
      {
        companyId: accessCompanyB.id,
        userId: browserCustomer.id,
        role: "STAFF",
        status: "ACTIVE",
      },
    ],
  });

  const workspaceTour = await prisma.tour.create({
    data: {
      title: `Browser Workspace Tour ${stamp}`,
      description:
        "Temporary Phase 6 tour used to exercise company operations pages.",
      shortDescription: "Browser workspace fixture.",
      price: "125.00",
      duration: "2 days",
      destination: "Nungwi",
      category: "zanzibar",
      available: true,
      companyId: accessCompanyA.id,
      publicationStatus: "PUBLISHED",
      publishedAt: new Date(),
      maxTravelers: 12,
      includes: ["Professional guide"],
      excludes: ["Flights"],
    },
  });
  tourIds.push(workspaceTour.id);

  const workspaceBooking = await prisma.booking.create({
    data: {
      reference: `BROWSER-PH6-${stamp}`,
      userId: browserCustomer.id,
      tourId: workspaceTour.id,
      companyId: accessCompanyA.id,
      companyNameSnapshot: accessCompanyA.name,
      tourTitleSnapshot: workspaceTour.title,
      fullName: "Browser Phase Six Guest",
      email: customer.email,
      phone: "255700000300",
      address: "Nungwi Beach Road",
      travelers: 2,
      travelDate: new Date("2029-05-05T00:00:00.000Z"),
      notes: "Temporary operational note for the company booking detail page.",
      status: "pending",
    },
  });
  bookingIds.push(workspaceBooking.id);

  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--window-size=1440,1000"],
  });

  // Anonymous visitor.
  const anon = await browser.newPage();
  await anon.setViewport({ width: 1440, height: 1000 });
  attachDiagnostics(anon);

  await visit(anon, "/", workspaceTour.title);
  const imageState = await anon.evaluate(() => {
    const images = Array.from(document.images);
    return {
      total: images.length,
      loaded: images.filter((image) => image.complete && image.naturalWidth > 0).length,
      uploads: images.filter((image) => image.currentSrc.includes("/uploads/")).length,
    };
  });
  record(
    "home page images load from migrated /uploads media",
    imageState.uploads > 0 && imageState.loaded > 0,
    JSON.stringify(imageState),
  );

  await visit(anon, "/tours/", workspaceTour.title);
  const cardCompanyLink = await anon.evaluate((slug) => {
    const link = document.querySelector(`a.tour-company-link[href="/company/${slug}/"]`);
    return link
      ? {
          text: link.textContent?.replace(/\s+/g, " ").trim(),
          href: link.getAttribute("href"),
        }
      : null;
  }, accessCompanyA.slug);
  record(
    "public tour cards attribute an active company without breaking the card",
    cardCompanyLink?.href === `/company/${accessCompanyA.slug}/` &&
      cardCompanyLink?.text === accessCompanyA.name,
    JSON.stringify(cardCompanyLink),
  );
  await visit(anon, "/tours/zanzibar/", workspaceTour.title);
  await visit(anon, `/tour/${workspaceTour.id}/`, workspaceTour.title);
  await visit(anon, `/tour/${workspaceTour.id}/`, "Operated by");
  const detailCompanyLink = await anon.evaluate((slug) => {
    const link = document.querySelector(
      `a.tour-company-link-detail[href="/company/${slug}/"]`,
    );
    return link
      ? {
          text: link.textContent?.replace(/\s+/g, " ").trim(),
          href: link.getAttribute("href"),
        }
      : null;
  }, accessCompanyA.slug);
  record(
    "public tour detail attributes the operating company and keeps booking visible",
    detailCompanyLink?.href === `/company/${accessCompanyA.slug}/` &&
      detailCompanyLink?.text === `Operated by ${accessCompanyA.name}` &&
      (await anon.evaluate(() =>
        Array.from(document.querySelectorAll("button")).some((button) =>
          /book/i.test(button.textContent ?? ""),
        ),
      )),
    JSON.stringify(detailCompanyLink),
  );
  await visit(anon, "/companies/", "companies");
  const directoryCompanyLink = await anon.evaluate((slug) => {
    const link = document.querySelector(`a[href="/company/${slug}/"]`);
    return link ? link.getAttribute("href") : null;
  }, accessCompanyA.slug);
  record(
    "the public company directory links to an active company profile",
    directoryCompanyLink === `/company/${accessCompanyA.slug}/`,
    JSON.stringify(directoryCompanyLink),
  );
  await visit(anon, `/company/${accessCompanyA.slug}/`, "Published tours");
  const profileHasPublishedTour = await anon.evaluate(
    (title) => document.body.innerText.includes(title),
    workspaceTour.title,
  );
  record(
    "a public company profile renders its published tours",
    profileHasPublishedTour,
    `publishedTour=${profileHasPublishedTour}`,
  );
  await visit(anon, "/attractions/", "stone town");
  await visit(anon, "/trips/", "Travel Tips");
  await visit(anon, "/contact/", "How can we help?");
  await visit(anon, "/login/", "Welcome Back");
  await visit(anon, "/register/", "Create Account");

  await anon.goto(`${BASE}/admin/dashboard/`, { waitUntil: "domcontentloaded" });
  const redirectPath = await anon.evaluate(() => location.pathname);
  record(
    "anonymous browser is redirected from the admin area",
    redirectPath.includes("/admin/login"),
    `path=${redirectPath}`,
  );

  await anon.goto(`${BASE}/company/dashboard/`, { waitUntil: "domcontentloaded" });
  const companyRedirectPath = await anon.evaluate(() => location.pathname);
  record(
    "anonymous browser is redirected from the company area",
    companyRedirectPath.includes("/login"),
    `path=${companyRedirectPath}`,
  );

  await anon.close();

  // Staff journey.
  const staff = await browser.newPage();
  await staff.setViewport({ width: 1440, height: 1000 });
  attachDiagnostics(staff);
  await uiLogin(staff, "/admin/login/", admin, "/admin/dashboard", "Admin Dashboard");

  const staffPages = [
    ["/admin/tours/", "Manage Tours"],
    ["/admin/bookings/", "All Bookings"],
    ["/admin/customers/", "Customers"],
    ["/admin/messages/", "Messages"],
    ["/admin/reviews/", "Reviews Management"],
    ["/admin/tips/", "Travel Tips"],
    ["/admin/analytics/", "Analytics"],
    ["/admin/settings/", "Settings"],
    ["/admin/home-editor/", "Home Editor"],
    ["/admin/travel/", "Manage Travel"],
    ["/view-workspace/", "All Workspaces"],
    ["/view-workspace/1/", "Tour Workspace"],
    ["/admin/work-space/", "Workspace"],
    ["/admin/work-space/pricing/1/", "Pricing"],
    ["/admin/companies/", "Companies"],
    ["/admin/companies/create/", "Add company"],
    [`/admin/companies/${browserCompany.id}/`, browserCompany.name],
  ];
  for (const [path, text] of staffPages) {
    await visit(staff, path, text);
  }
  await checkResponsive(staff, "/admin/companies/", "Companies");
  await checkResponsive(staff, `/admin/companies/${browserCompany.id}/`, browserCompany.name);

  await staff.goto(`${BASE}/company/dashboard/`, { waitUntil: "domcontentloaded" });
  const staffCompanyPath = await staff.evaluate(() => location.pathname);
  record(
    "platform staff without a membership is redirected to a safe page",
    staffCompanyPath.includes("/dashboard") &&
      !staffCompanyPath.includes("/company/"),
    `path=${staffCompanyPath}`,
  );
  await staff.close();

  // Customer journey.
  const client = await browser.newPage();
  await client.setViewport({ width: 1440, height: 1000 });
  attachDiagnostics(client);
  await uiLogin(client, "/login/", customer, "/", workspaceTour.title);
  await visit(client, "/dashboard/", `Welcome, ${customer.username}`);
  await visit(client, "/bookings/", "My booking requests");
  await visit(client, "/settings/", "Settings");

  const companyDashboardAttempt = await client.goto(
    `${BASE}/company/dashboard/`,
    { waitUntil: "domcontentloaded" },
  );
  await client
    .waitForFunction(
      () => location.pathname.includes("/company/select"),
      { timeout: 15000 },
    )
    .catch(() => {});
  await client.waitForNetworkIdle({ idleTime: 400, timeout: 15000 }).catch(() => {});
  const pickerBody = await client.evaluate(() => document.body.innerText);
  record(
    "a customer with multiple companies is sent to the company picker",
    (companyDashboardAttempt?.status() ?? 0) < 400 &&
      pickerBody.includes("Choose a company workspace") &&
      pickerBody.includes(accessCompanyA.name) &&
      pickerBody.includes(accessCompanyB.name),
    `status=${companyDashboardAttempt?.status() ?? 0} url=${client.url()}`,
  );

  const openCompanyA = `button[aria-label="Open the ${accessCompanyA.name} workspace"]`;
  await client.waitForSelector(openCompanyA, { timeout: 15000 });
  await client.click(openCompanyA);
  await client
    .waitForFunction(
      (name) =>
        location.pathname.includes("/company/dashboard") &&
        document.body.innerText.includes(name),
      { timeout: 20000 },
      accessCompanyA.name,
    )
    .catch(() => {});
  await client.waitForNetworkIdle({ idleTime: 500, timeout: 15000 }).catch(() => {});
  const companyDashboardBody = await client.evaluate(() => document.body.innerText);
  record(
    "selecting a company opens its protected dashboard",
    client.url().includes("/company/dashboard") &&
      companyDashboardBody.includes(accessCompanyA.name) &&
      companyDashboardBody.includes("What this role can do"),
    `url=${client.url()}`,
  );

  const sidebarState = await client.evaluate(() => ({
    links: Array.from(document.querySelectorAll(".sidebar-nav a"))
      .map((link) => link.textContent?.replace(/\s+/g, " ").trim())
      .filter(Boolean),
    badges: Array.from(
      document.querySelectorAll(".sidebar-footer .user-badge"),
    ).map((badge) => badge.textContent?.trim()),
  }));
  record(
    "the sidebar exposes company navigation and the active role badge",
    sidebarState.links.includes("Experiences") &&
      sidebarState.links.includes("Booking requests") &&
      sidebarState.links.includes("Company profile") &&
      sidebarState.links.includes("Insights") &&
      sidebarState.badges.includes("Owner"),
    `links=${sidebarState.links.length} badges=${sidebarState.badges.join(",")}`,
  );

  const companyWorkspacePages = [
    ["/company/tours/", "Create tour"],
    [`/company/tours/${workspaceTour.id}/`, "Tour basics"],
    ["/company/tours/create/", "Tour basics"],
    ["/company/bookings/", "Search and operate this company"],
    [`/company/bookings/${workspaceBooking.id}/`, "Booking actions"],
    ["/company/profile/", "Platform record"],
    ["/company/analytics/", "Tour performance"],
  ];
  for (const [path, text] of companyWorkspacePages) {
    await visit(client, path, text);
  }

  await client.goto(`${BASE}/company/profile/`, {
    waitUntil: "domcontentloaded",
  });
  await client.waitForNetworkIdle({ idleTime: 400, timeout: 15000 }).catch(() => {});
  const editableProfile = await client.evaluate(() => {
    const body = document.body.innerText;
    return {
      editable: body.includes("Editable"),
      save: body.includes("Save profile"),
    };
  });
  record(
    "an owner sees editable profile controls",
    editableProfile.editable && editableProfile.save,
    JSON.stringify(editableProfile),
  );

  await checkResponsive(client, "/company/tours/", "Create tour");
  await checkResponsive(
    client,
    `/company/tours/${workspaceTour.id}/`,
    "Tour basics",
  );
  await checkResponsive(
    client,
    `/company/bookings/${workspaceBooking.id}/`,
    "Booking actions",
  );
  await checkResponsive(client, "/company/profile/", "Platform record");
  await checkResponsive(client, "/company/analytics/", "Tour performance");

  const activeCompanyCookie = (await client.cookies()).find(
    (cookie) => cookie.name === "active_company",
  );
  record(
    "the active company selector cookie is HttpOnly",
    activeCompanyCookie?.httpOnly === true,
    `httpOnly=${activeCompanyCookie?.httpOnly}`,
  );

  await checkResponsive(
    client,
    "/company/dashboard/",
    accessCompanyA.name,
  );

  const switcherAvailable = await client.$("#company-switcher");
  record(
    "the company dashboard offers a switcher for multiple companies",
    Boolean(switcherAvailable),
  );
  if (switcherAvailable) {
    await client.select("#company-switcher", String(accessCompanyB.id));
    await client.evaluate(() => {
      const select = document.querySelector("#company-switcher");
      select?.closest("form")?.requestSubmit();
    });
    await client
      .waitForFunction(
        (name) => document.body.innerText.includes(name),
        { timeout: 20000 },
        accessCompanyB.name,
      )
      .catch(() => {});
    await client.waitForNetworkIdle({ idleTime: 400, timeout: 15000 }).catch(() => {});
    const switchedBody = await client.evaluate(() => document.body.innerText);
    record(
      "the company switcher changes the active workspace",
      switchedBody.includes(accessCompanyB.name) &&
        switchedBody.includes("Staff"),
      `url=${client.url()}`,
    );

    await client.select("#company-switcher", String(accessCompanyA.id));
    await client.evaluate(() => {
      const select = document.querySelector("#company-switcher");
      select?.closest("form")?.requestSubmit();
    });
    await client
      .waitForFunction(
        (name) => document.body.innerText.includes(name),
        { timeout: 20000 },
        accessCompanyA.name,
      )
      .catch(() => {});
    await client.waitForNetworkIdle({ idleTime: 400, timeout: 15000 }).catch(() => {});
  }

  await prisma.company.update({
    where: { id: accessCompanyA.id },
    data: { status: "SUSPENDED", isPublic: false },
  });
  const suspendedCompanyPage = await client.goto(
    `${BASE}/company/dashboard/`,
    { waitUntil: "domcontentloaded" },
  );
  await client.waitForSelector("h1", { timeout: 15000 }).catch(() => {});
  const suspendedCompanyBody = await client.evaluate(
    () => document.body.innerText,
  );
  record(
    "a suspended company shows the branded 403 page",
    suspendedCompanyPage?.status() === 403 &&
      suspendedCompanyBody.includes("Company access unavailable"),
    `status=${suspendedCompanyPage?.status() ?? 0}`,
  );

  const recoveryPicker = await client.goto(
    `${BASE}/company/select/`,
    { waitUntil: "domcontentloaded" },
  );
  const recoveryBody = await client.evaluate(() => document.body.innerText);
  record(
    "the picker lets a user recover from a suspended selection",
    recoveryPicker?.status() === 200 &&
      recoveryBody.includes(accessCompanyB.name) &&
      !recoveryBody.includes(accessCompanyA.name),
    `status=${recoveryPicker?.status() ?? 0}`,
  );

  const openCompanyB = `button[aria-label="Open the ${accessCompanyB.name} workspace"]`;
  await client.waitForSelector(openCompanyB, { timeout: 15000 });
  await client.click(openCompanyB);
  await client
    .waitForFunction(
      (name) =>
        location.pathname.includes("/company/dashboard") &&
        document.body.innerText.includes(name),
      { timeout: 20000 },
      accessCompanyB.name,
    )
    .catch(() => {});
  await client.waitForNetworkIdle({ idleTime: 500, timeout: 15000 }).catch(() => {});
  const recoveredBody = await client.evaluate(() => document.body.innerText);
  record(
    "selecting an available company after suspension restores access",
    client.url().includes("/company/dashboard") &&
      recoveredBody.includes(accessCompanyB.name),
    `url=${client.url()}`,
  );

  await client.close();

  record("no uncaught browser page errors", pageErrors.length === 0, pageErrors.join(" | "));
  record("no React hydration errors", hydrationErrors.length === 0, hydrationErrors.join(" | "));
  record("no 5xx responses", serverErrors.length === 0, serverErrors.join(" | "));
} catch (error) {
  record("browser run completed", false, error instanceof Error ? error.message : String(error));
} finally {
  await browser?.close().catch(() => {});
  await prisma.visitorTracking.deleteMany({ where: { sessionId: { in: [...sessionIds] } } });
  if (bookingIds.length) {
    await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
  }
  if (tourIds.length) {
    await prisma.tour.deleteMany({ where: { id: { in: tourIds } } });
  }
  if (companyIds.length) {
    await prisma.auditLog.deleteMany({ where: { companyId: { in: companyIds } } });
    await prisma.notification.deleteMany({ where: { companyId: { in: companyIds } } });
    await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
  }
  if (userIds.length) {
    await prisma.profile.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
  await prisma.$disconnect();
}

const failed = results.filter((result) => !result.passed);
console.log(`\
${results.length - failed.length}/${results.length} browser checks passed.`);
if (failed.length) process.exitCode = 1;
