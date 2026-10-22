/**
 * Layout and spacing audit: horizontal overflow, elements pushed outside the
 * viewport and tap targets that are too small on touch devices.
 *
 * Usage: node scripts/layout-audit.mjs
 */
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE || "http://127.0.0.1:3000";
const CHROME = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const PAGES = [
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
  "/companies/",
];

const audit = () => {
  const problems = [];
  const documentWidth = document.documentElement.clientWidth;
  if (document.documentElement.scrollWidth > documentWidth + 1) {
    problems.push({
      type: "horizontal-scroll",
      detail: `scrollWidth ${document.documentElement.scrollWidth} > ${documentWidth}`,
    });
  }

  const visible = Array.from(document.querySelectorAll("body *")).filter((element) => {
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) {
      return false;
    }
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });

  for (const element of visible) {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const tag = element.tagName.toLowerCase();
    const name = `${tag}.${String(element.className).split(" ").filter(Boolean).slice(0, 2).join(".")}`;

    const clipped = (() => {
      let parent = element.parentElement;
      while (parent && parent !== document.body) {
        const parentStyle = getComputedStyle(parent);
        if (
          parentStyle.overflowX === "hidden" ||
          parentStyle.overflowX === "clip" ||
          parentStyle.overflow === "hidden" ||
          parentStyle.overflow === "clip"
        )
          return true;
        parent = parent.parentElement;
      }
      return false;
    })();
    if (rect.right > documentWidth + 1 && style.position !== "fixed" && !clipped) {
      problems.push({
        type: "overflow-right",
        detail: `${name} right=${Math.round(rect.right)} vw=${documentWidth}`,
      });
    }

    const interactive = tag === "button" || tag === "a" || element.getAttribute("role") === "button";
    if (interactive && rect.height < 40 && rect.width < 400 && style.display !== "inline") {
      problems.push({
        type: "small-tap-target",
        detail: `${name} ${Math.round(rect.width)}x${Math.round(rect.height)}`,
      });
    }
  }

  const unique = new Map();
  for (const problem of problems) {
    const key = `${problem.type}|${problem.detail}`;
    if (!unique.has(key)) unique.set(key, problem);
  }
  return [...unique.values()].slice(0, 25);
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

let total = 0;
for (const viewport of [
  { name: "mobile", width: 390, height: 844, isMobile: true },
  { name: "desktop", width: 1440, height: 1000, isMobile: false },
]) {
  for (const path of PAGES) {
    const page = await browser.newPage();
    await page.setViewport({
      width: viewport.width,
      height: viewport.height,
      isMobile: viewport.isMobile,
      hasTouch: viewport.isMobile,
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
      console.log(`skipped ${path}: ${error.message}`);
    }
    await page.close();
  }
}

await browser.close();
console.log(`\n${total} layout problems`);
