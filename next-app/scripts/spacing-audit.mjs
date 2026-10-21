/**
 * Responsive sizing and spacing audit.
 *
 * Measures real layout geometry at six device widths (Android, iPhone,
 * tablet portrait/landscape, desktop) and reports:
 *   - page gutter value and symmetry
 *   - control heights and the iOS 16px zoom rule
 *   - tap targets below 44px
 *   - cards in the same grid row with uneven heights
 *   - missing/incorrect card grid gaps
 *   - inconsistent card photography ratios
 *   - content wider than its own card
 *
 * Usage: node scripts/spacing-audit.mjs
 */
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE || "http://127.0.0.1:3000";
const CHROME =
  process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const PUBLIC_PAGES = [
  "/",
  "/tours/",
  "/tour/46/",
  "/attractions/",
  "/trips/",
  "/contact/",
  "/login/",
  "/register/",
  "/onboarding/",
  "/booking/46/",
];

const ADMIN_PAGES = ["/admin/dashboard", "/admin/bookings", "/admin/customers", "/admin/tours"];
const MEMBER_PAGES = ["/dashboard/", "/bookings/", "/settings/", "/booking/46/"];

const VIEWPORTS = [
  { name: "android-360", width: 360, height: 740, isMobile: true },
  { name: "iphone-390", width: 390, height: 844, isMobile: true },
  { name: "pixel-412", width: 412, height: 915, isMobile: true },
  { name: "tablet-768", width: 768, height: 1024, isMobile: true },
  { name: "tablet-1024", width: 1024, height: 768, isMobile: true },
  { name: "desktop-1440", width: 1440, height: 900, isMobile: false },
];

const audit = () => {
  const problems = [];
  const seen = new Set();
  const add = (type, detail) => {
    const key = `${type}|${detail}`;
    if (!seen.has(key)) {
      seen.add(key);
      problems.push({ type, detail });
    }
  };
  const label = (element) => {
    const tag = element.tagName.toLowerCase();
    const cls = String(element.className || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .join(".");
    return cls ? `${tag}.${cls}` : tag;
  };
  const visible = (element) => {
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0)
      return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 1 && rect.height > 1;
  };

  const viewportWidth = document.documentElement.clientWidth;

  if (document.documentElement.scrollWidth > viewportWidth + 1) {
    add("horizontal-scroll", `scrollWidth ${document.documentElement.scrollWidth} > ${viewportWidth}`);
  }

  // ---- 1. Page gutter ------------------------------------------------------
  const page = document.querySelector(".page");
  if (page) {
    const style = getComputedStyle(page);
    const left = parseFloat(style.paddingLeft);
    const right = parseFloat(style.paddingRight);
    const expected = viewportWidth <= 768 ? 16 : 24;
    if (Math.abs(left - expected) > 0.6) {
      add("page-gutter", `left ${left}px, expected ${expected}px`);
    }
    if (Math.abs(right - expected) > 0.6) {
      add("page-gutter", `right ${right}px, expected ${expected}px`);
    }
    if (Math.abs(left - right) > 0.6) {
      add("gutter-asymmetry", `${left}px left vs ${right}px right`);
    }
    if (page.scrollWidth > page.clientWidth + 1) {
      add("page-overflow", `scrollWidth ${page.scrollWidth} > clientWidth ${page.clientWidth}`);
    }
  }

  // ---- 2. Controls ---------------------------------------------------------
  const controls = Array.from(
    document.querySelectorAll(
      "input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file]), select, textarea",
    ),
  ).filter(visible);

  for (const control of controls) {
    const rect = control.getBoundingClientRect();
    const type = control.getAttribute("type");
    if (type === "submit" || type === "button") continue;
    if (rect.height < 44) {
      add("control-too-short", `${label(control)} ${Math.round(rect.height)}px`);
    }
    if (rect.height > 64 && control.tagName !== "TEXTAREA") {
      add("control-too-tall", `${label(control)} ${Math.round(rect.height)}px`);
    }
    const fontSize = parseFloat(getComputedStyle(control).fontSize);
    if (viewportWidth <= 768 && fontSize < 16) {
      add("ios-input-zoom", `${label(control)} font ${fontSize}px`);
    }
  }

  // ---- 3. Tap targets ------------------------------------------------------
  const interactive = Array.from(
    document.querySelectorAll("button, a, [role=button], .page-hero-chip"),
  ).filter(visible);

  for (const element of interactive) {
    if (element.closest(".page-hero-chips")) continue;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    if (style.display === "inline") continue;
    if (rect.width > 320) continue;
    if (rect.height < 44) {
      add("tap-target-height", `${label(element)} ${Math.round(rect.width)}x${Math.round(rect.height)}`);
    }
  }

  // ---- 4. Grid rhythm and card heights ------------------------------------
  const mainGrids = [
    ".tours-grid",
    ".attractions-grid",
    ".destinations-grid",
    ".testimonials-grid",
    ".tips-grid",
    ".dashboard-stats-grid",
    ".stats-section",
    ".quick-links-grid",
  ];

  for (const selector of mainGrids) {
    for (const grid of Array.from(document.querySelectorAll(selector)).filter(visible)) {
      const style = getComputedStyle(grid);
      const columnGap = parseFloat(style.columnGap);
      if (Number.isFinite(columnGap) && !selector.includes("stats") && !selector.includes("quick")) {
        const expected = viewportWidth <= 768 ? 16 : 24;
        if (Math.abs(columnGap - expected) > 0.6) {
          add("grid-gap", `${selector} column-gap ${columnGap}px, expected ${expected}px`);
        }
      }

      const children = Array.from(grid.children).filter(visible);
      const rows = new Map();
      for (const child of children) {
        const rect = child.getBoundingClientRect();
        const key = Math.round(rect.top / 4) * 4;
        if (!rows.has(key)) rows.set(key, []);
        rows.get(key).push(Math.round(rect.height));
      }
      for (const heights of rows.values()) {
        if (heights.length < 2) continue;
        const spread = Math.max(...heights) - Math.min(...heights);
        if (spread > 3) {
          add("uneven-card-row", `${selector} heights ${heights.join("/")}`);
        }
      }
    }
  }

  // ---- 5. Photography ratios ---------------------------------------------
  const expectedRatios = {
    ".tour-card-image": 0.75,
    ".attraction-card-image": 0.75,
    ".home-attraction-image": 0.625,
  };
  for (const [selector, expectedRatio] of Object.entries(expectedRatios)) {
    for (const frame of Array.from(document.querySelectorAll(selector)).filter(visible)) {
      const rect = frame.getBoundingClientRect();
      if (rect.width < 80) continue;
      const ratio = rect.height / rect.width;
      if (Math.abs(ratio - expectedRatio) > 0.04) {
        add("image-ratio", `${selector} ${ratio.toFixed(2)} (expected ${expectedRatio})`);
      }
    }
  }

  // ---- 6. Content escaping its card --------------------------------------
  for (const card of Array.from(
    document.querySelectorAll(
      ".tour-card, .attraction-card, .glass-card, .dashboard-stat-card, .summary-card, .tip-card, .travel-card",
    ),
  ).filter(visible)) {
    if (card.scrollWidth > card.clientWidth + 2) {
      add("card-overflow", `${label(card)} ${card.scrollWidth} > ${card.clientWidth}`);
    }
  }

  return problems.slice(0, 30);
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

let total = 0;

async function auditPage(page, viewport, path) {
  await page.setViewport({
    width: viewport.width,
    height: viewport.height,
    isMobile: viewport.isMobile,
    hasTouch: viewport.isMobile,
    deviceScaleFactor: 1,
  });
  try {
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForNetworkIdle({ idleTime: 300, timeout: 10000 }).catch(() => {});
    const problems = await page.evaluate(audit);
    if (problems.length) {
      console.log(`${viewport.name} ${path}`);
      for (const problem of problems) console.log(`   ${problem.type}: ${problem.detail}`);
      total += problems.length;
    }
  } catch (error) {
    console.log(`skipped ${viewport.name} ${path}: ${error.message}`);
  }
}

// Public pages, logged out.
for (const viewport of VIEWPORTS) {
  const page = await browser.newPage();
  for (const path of PUBLIC_PAGES) {
    await auditPage(page, viewport, path);
  }
  await page.close();
}

// Admin pages need a session; open one and reuse it across widths.
const adminPage = await browser.newPage();
await adminPage.setViewport({ width: 1440, height: 900, isMobile: false });
try {
  await adminPage.goto(`${BASE}/login/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await adminPage.waitForSelector('input[name="username"]', { timeout: 15000 });
  await adminPage.type('input[name="username"]', "spacing_admin");
  await adminPage.type('input[name="password"]', "SpacingAdmin123!");
  await Promise.all([
    adminPage.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {}),
    adminPage.click('button[type="submit"]'),
  ]);
  await adminPage.waitForNetworkIdle({ idleTime: 300, timeout: 8000 }).catch(() => {});

  for (const viewport of [VIEWPORTS[1], VIEWPORTS[5]]) {
    await adminPage.setViewport({
      width: viewport.width,
      height: viewport.height,
      isMobile: viewport.isMobile,
      hasTouch: viewport.isMobile,
      deviceScaleFactor: 1,
    });
    for (const path of [...ADMIN_PAGES, ...MEMBER_PAGES]) {
      try {
        await adminPage.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await adminPage.waitForNetworkIdle({ idleTime: 300, timeout: 8000 }).catch(() => {});
        const problems = await adminPage.evaluate(audit);
        if (problems.length) {
          console.log(`${viewport.name} ${path}`);
          for (const problem of problems) console.log(`   ${problem.type}: ${problem.detail}`);
          total += problems.length;
        }
      } catch (error) {
        console.log(`skipped ${viewport.name} ${path}: ${error.message}`);
      }
    }
  }
} catch (error) {
  console.log(`admin audit skipped: ${error.message}`);
}

await adminPage.close();
await browser.close();
console.log(`\n${total} sizing/spacing problems`);
