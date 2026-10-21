/**
 * Header and mobile drawer audit: verifies the sticky glass Travel. header, the
 * primary nav breakpoint and the off-canvas drawer across mobile, tablet and
 * desktop viewports.
 *
 * Usage: node scripts/header-audit.mjs
 */
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE || "http://127.0.0.1:3000";
const CHROME = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844, isMobile: true },
  { name: "tablet", width: 820, height: 1180, isMobile: true },
  { name: "tablet-wide", width: 1024, height: 1180, isMobile: true },
  { name: "desktop", width: 1440, height: 1000, isMobile: false },
];

const results = [];
const record = (name, passed, detail = "") => {
  results.push({ name, passed });
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox"],
});

const readState = (page) =>
  page.evaluate(() => {
    const header = document.querySelector(".top-header");
    const menuButton = document.querySelector(".top-header-menu-btn");
    const sidebar = document.querySelector(".sidebar");
    const nav = document.querySelector(".top-header-nav");
    const overlay = document.querySelector(".sidebar-overlay");
    const shell = document.querySelector(".app-shell");
    const headerRect = header?.getBoundingClientRect();
    const sidebarRect = sidebar?.getBoundingClientRect();

    return {
      headerTop: headerRect ? headerRect.top : null,
      headerPosition: header ? getComputedStyle(header).position : null,
      headerDisplay: header ? getComputedStyle(header).display : null,
      menuButtonDisplay: menuButton ? getComputedStyle(menuButton).display : null,
      menuButtonExpanded: menuButton ? menuButton.getAttribute("aria-expanded") : null,
      menuButtonLabel: menuButton ? menuButton.getAttribute("aria-label") : null,
      navDisplay: nav ? getComputedStyle(nav).display : null,
      drawerOpen: sidebar?.classList.contains("mobile-open") ?? false,
      sidebarPosition: sidebar ? getComputedStyle(sidebar).position : null,
      sidebarRect: sidebarRect ? sidebarRect.toJSON() : null,
      shellMarginLeft: shell ? getComputedStyle(shell).marginLeft : null,
      overlay: Boolean(overlay),
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  });

for (const vp of VIEWPORTS) {
  const page = await browser.newPage();
  await page.setViewport({
    width: vp.width,
    height: vp.height,
    isMobile: vp.isMobile,
    hasTouch: vp.isMobile,
  });

  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForNetworkIdle({ idleTime: 400, timeout: 10000 }).catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 800));

  const initial = await readState(page);

  record(
    `${vp.name}: header is visible at the top of the page`,
    initial.headerDisplay !== "none" && initial.headerTop === 0,
    JSON.stringify({ display: initial.headerDisplay, top: initial.headerTop })
  );
  record(`${vp.name}: header is sticky`, initial.headerPosition === "sticky", initial.headerPosition);
  record(
    `${vp.name}: no horizontal overflow`,
    initial.scrollWidth <= initial.clientWidth + 1,
    `${initial.scrollWidth}/${initial.clientWidth}`
  );
  record(`${vp.name}: sidebar stays a fixed rail`, initial.sidebarPosition === "fixed", initial.sidebarPosition);

  // The drawer replaces the rail up to 1024px, so the menu button that opens it
  // has to be available for that whole range.
  if (vp.width <= 1024) {
    record(
      `${vp.name}: menu button is visible`,
      initial.menuButtonDisplay !== "none",
      String(initial.menuButtonDisplay)
    );
  } else {
    record(
      `${vp.name}: menu button is hidden`,
      initial.menuButtonDisplay === "none",
      String(initial.menuButtonDisplay)
    );
    record(`${vp.name}: primary nav is visible`, initial.navDisplay !== "none", String(initial.navDisplay));
  }

  if (vp.width <= 900) {
    record(`${vp.name}: primary nav is collapsed`, initial.navDisplay === "none", String(initial.navDisplay));
  }

  if (vp.width <= 1024) {
    record(
      `${vp.name}: drawer starts closed`,
      initial.drawerOpen === false && initial.overlay === false,
      JSON.stringify({ open: initial.drawerOpen, overlay: initial.overlay })
    );
    record(
      `${vp.name}: drawer is off screen when closed`,
      initial.sidebarRect ? initial.sidebarRect.right <= 1 : false,
      JSON.stringify(initial.sidebarRect)
    );

    await page.click(".top-header-menu-btn");
    await new Promise((resolve) => setTimeout(resolve, 700));

    const opened = await readState(page);
    record(
      `${vp.name}: drawer opens`,
      opened.drawerOpen === true && opened.overlay === true,
      JSON.stringify({ open: opened.drawerOpen, overlay: opened.overlay })
    );
    record(
      `${vp.name}: menu button reports the expanded state`,
      opened.menuButtonExpanded === "true",
      String(opened.menuButtonExpanded)
    );
    record(
      `${vp.name}: menu button switches to the close label`,
      opened.menuButtonLabel === "Close navigation",
      String(opened.menuButtonLabel)
    );
    record(
      `${vp.name}: drawer is on screen when open`,
      opened.sidebarRect ? opened.sidebarRect.x >= -1 && opened.sidebarRect.x < vp.width : false,
      JSON.stringify(opened.sidebarRect)
    );
    record(`${vp.name}: overlay is shown`, opened.overlay === true, String(opened.overlay));
    record(
      `${vp.name}: no horizontal overflow with the drawer open`,
      opened.scrollWidth <= opened.clientWidth + 1,
      `${opened.scrollWidth}/${opened.clientWidth}`
    );

    await page.evaluate(() => {
      document
        .querySelector(".sidebar .nav-item")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    });
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const afterNav = await readState(page);
    record(
      `${vp.name}: drawer closes after navigating`,
      afterNav.drawerOpen === false && afterNav.overlay === false,
      JSON.stringify({ open: afterNav.drawerOpen, overlay: afterNav.overlay })
    );
    record(
      `${vp.name}: menu button resets after navigating`,
      afterNav.menuButtonExpanded === "false",
      String(afterNav.menuButtonExpanded)
    );
  }

  record(`${vp.name}: no uncaught page errors`, errors.length === 0, errors.join(" | "));
  await page.close();
}

await browser.close();

const failed = results.filter((result) => !result.passed);
console.log(`\n${results.length - failed.length}/${results.length} header checks passed.`);
if (failed.length > 0) {
  process.exitCode = 1;
}
