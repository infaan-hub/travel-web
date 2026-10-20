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
  await createUser(customer, false);

  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--window-size=1440,1000"],
  });

  // Anonymous visitor.
  const anon = await browser.newPage();
  await anon.setViewport({ width: 1440, height: 1000 });
  attachDiagnostics(anon);

  await visit(anon, "/", "Stone town");
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

  await visit(anon, "/tours/", "Stone town");
  await visit(anon, "/tours/zanzibar/", "Stone town");
  await visit(anon, "/tour/46/", "Test Safari");
  await visit(anon, "/attractions/", "stone town");
  await visit(anon, "/trips/", "Travel Tips");
  await visit(anon, "/contact/", "Contact Us");
  await visit(anon, "/login/", "Welcome Back");
  await visit(anon, "/register/", "Create Account");

  await anon.goto(`${BASE}/admin/dashboard/`, { waitUntil: "domcontentloaded" });
  const redirectPath = await anon.evaluate(() => location.pathname);
  record(
    "anonymous browser is redirected from the admin area",
    redirectPath.includes("/admin/login"),
    `path=${redirectPath}`,
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
  ];
  for (const [path, text] of staffPages) {
    await visit(staff, path, text);
  }
  await staff.close();

  // Customer journey.
  const client = await browser.newPage();
  await client.setViewport({ width: 1440, height: 1000 });
  attachDiagnostics(client);
  await uiLogin(client, "/login/", customer, "/", "Stone town");
  await visit(client, "/dashboard/", `Welcome, ${customer.username}`);
  await visit(client, "/bookings/", "My Booked Trips");
  await visit(client, "/settings/", "Settings");
  await client.close();

  record("no uncaught browser page errors", pageErrors.length === 0, pageErrors.join(" | "));
  record("no React hydration errors", hydrationErrors.length === 0, hydrationErrors.join(" | "));
  record("no 5xx responses", serverErrors.length === 0, serverErrors.join(" | "));
} catch (error) {
  record("browser run completed", false, error instanceof Error ? error.message : String(error));
} finally {
  await browser?.close().catch(() => {});
  await prisma.visitorTracking.deleteMany({ where: { sessionId: { in: [...sessionIds] } } });
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
