/** Capture review screenshots at phone and desktop widths. */
import { mkdir } from "node:fs/promises";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE || "http://127.0.0.1:3000";
const CHROME =
  process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT = "scripts/.shots";

await mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

async function shot(page, name, path, viewport, fullPage = false) {
  await page.setViewport({ ...viewport, deviceScaleFactor: 1 });
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle2", timeout: 30000 });
  await new Promise((resolve) => setTimeout(resolve, 600));
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage });
  console.log(`${name}.png`);
}

const phone = { width: 390, height: 844, isMobile: true, hasTouch: true };
const small = { width: 320, height: 640, isMobile: true, hasTouch: true };
const tablet = { width: 768, height: 1024, isMobile: true, hasTouch: true };
const desktop = { width: 1440, height: 900, isMobile: false };
const wide = { width: 1920, height: 1080, isMobile: false };

const page = await browser.newPage();
await shot(page, "home-mobile", "/", phone, true);
await shot(page, "tours-mobile", "/tours/", phone, true);
await shot(page, "tour-mobile", "/tour/46/", phone);
await shot(page, "attractions-mobile", "/attractions/", phone, true);
await shot(page, "contact-mobile", "/contact/", phone, true);
await shot(page, "trips-mobile", "/trips/", phone, true);
await shot(page, "login-mobile", "/login/", phone);
await page.setViewport({ ...phone, deviceScaleFactor: 1 });
await page.goto(`${BASE}/`, { waitUntil: "networkidle2" });
await page.click(".top-header-menu-btn");
await new Promise((resolve) => setTimeout(resolve, 700));
await page.screenshot({ path: `${OUT}/drawer-mobile.png` });
console.log("drawer-mobile.png");
await page.setViewport({ ...phone, deviceScaleFactor: 1 });
await page.goto(`${BASE}/onboarding/`, { waitUntil: "networkidle2" });
await page.waitForSelector(".onboarding-welcome", { timeout: 10000 }).catch(() => {});
await new Promise((resolve) => setTimeout(resolve, 400));
await page.screenshot({ path: `${OUT}/onboarding-mobile.png` });
console.log("onboarding-mobile.png");
await page.click(".onboarding-copy > .onboarding-cta");
await new Promise((resolve) => setTimeout(resolve, 600));
await page.screenshot({ path: `${OUT}/onboarding-2-mobile.png` });
console.log("onboarding-2-mobile.png");
await shot(page, "home-desktop", "/", desktop, false);
await shot(page, "tours-desktop", "/tours/", desktop, false);
await shot(page, "home-small-320", "/", small, false);
await shot(page, "home-tablet-768", "/", tablet, false);
await shot(page, "home-wide-1920", "/", wide, false);
await shot(page, "tours-tablet-768", "/tours/", tablet, false);

// Admin views.
await page.setViewport(desktop);
await page.goto(`${BASE}/login/`, { waitUntil: "domcontentloaded" });
await page.waitForSelector('input[name="username"]');
await page.type('input[name="username"]', "spacing_admin");
await page.type('input[name="password"]', "SpacingAdmin123!");
await Promise.all([
  page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {}),
  page.click('button[type="submit"]'),
]);
await shot(page, "admin-mobile", "/admin/dashboard", phone, true);
await shot(page, "admin-bookings-mobile", "/admin/bookings", phone, true);
await shot(page, "admin-desktop", "/admin/dashboard", desktop, false);
await shot(page, "dashboard-mobile", "/dashboard/", phone, true);
await shot(page, "bookings-mobile", "/bookings/", phone, true);
await shot(page, "settings-mobile", "/settings/", phone, true);
await shot(page, "booking-mobile", "/booking/46/", phone, true);

await browser.close();
