/**
 * Theme audit: the application must always render the light aqua-glass theme,
 * even when the operating system reports a dark colour-scheme preference.
 *
 * Usage: npm run audit:theme   (server must already be running)
 */
import puppeteer from "puppeteer-core";
import { getPublicTourPaths } from "./public-audit-pages.mjs";

const BASE = process.env.THEME_BASE_URL || "http://127.0.0.1:3100";
const CHROME =
  process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const ROUTES = [
  "/",
  "/tours",
  "/attractions",
  "/contact",
  "/onboarding/",
  "/login",
  "/register",
  ...await getPublicTourPaths(BASE),
];

const results = [];
function record(name, passed, detail = "") {
  results.push({ name, passed });
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${detail ? " - " + detail : ""}`);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

/** Very dark pixels mean a dark surface leaked into the light theme. */
function isDark(rgb) {
  const [r, g, b] = rgb;
  return (r + g + b) / 3 < 90;
}

for (const scheme of ["dark", "light"]) {
  for (const route of ROUTES) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000 });
    await page.emulateMediaFeatures([
      { name: "prefers-color-scheme", value: scheme },
    ]);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));

    try {
      await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForNetworkIdle({ idleTime: 500, timeout: 15000 }).catch(() => {});

      const data = await page.evaluate(() => {
        const cs = getComputedStyle(document.documentElement);
        const htmlBg = getComputedStyle(document.documentElement).backgroundColor;
        const bodyBg = getComputedStyle(document.body).backgroundColor;
        const bodyColor = getComputedStyle(document.body).color;
        return {
          pageBgVar: cs.getPropertyValue("--page-bg").trim(),
          surfaceVar: cs.getPropertyValue("--surface").trim(),
          textPrimary: cs.getPropertyValue("--text-primary").trim(),
          htmlBg,
          bodyBg,
          bodyColor,
          hasDarkClass: document.documentElement.classList.contains("dark"),
          colorScheme: cs.colorScheme,
        };
      });

      // --page-bg must stay the light aqua value (#D8E4E0) regardless of scheme.
      const lightPageBg = data.pageBgVar.toUpperCase() === "#D8E4E0";
      record(
        `${scheme}: ${route} keeps the light --page-bg token`,
        lightPageBg,
        data.pageBgVar,
      );

      // The body must not be painted with a near-black background. The body
      // may intentionally use only gradients with a transparent
      // background-color, in which case the html surface is the painted base.
      const bodyParts = data.bodyBg.match(/[\d.]+/g)?.map(Number) ?? [];
      const bodyAlpha = bodyParts.length === 4 ? bodyParts[3] : 1;
      const effectiveBodyBg = bodyAlpha === 0 ? data.htmlBg : data.bodyBg;
      const m = effectiveBodyBg.match(/[\d.]+/g)?.map(Number) ?? [255, 255, 255];
      record(
        `${scheme}: ${route} body background is not dark`,
        !isDark(m),
        `body=${data.bodyBg} effective=${effectiveBodyBg}`,
      );

      // Body text must be the dark ink colour on a light surface.
      const tm = data.bodyColor.match(/\d+/g)?.map(Number) ?? [0, 0, 0];
      record(
        `${scheme}: ${route} body text is dark ink`,
        tm[0] < 80 && tm[1] < 80 && tm[2] < 80,
        data.bodyColor,
      );

      record(
        `${scheme}: ${route} has no uncaught page errors`,
        errors.length === 0,
        errors.join("; "),
      );
    } catch (error) {
      record(`${scheme}: ${route} loads`, false, error.message);
    } finally {
      await page.close();
    }
  }
}

// Destination cards must show an in-flow light panel, not a black scrim.
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.emulateMediaFeatures([
    { name: "prefers-color-scheme", value: "dark" },
  ]);
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForNetworkIdle({ idleTime: 500, timeout: 15000 }).catch(() => {});

  const cards = await page.evaluate(() => {
    const list = [...document.querySelectorAll(".destination-card")];
    return list.map((card) => {
      const image = card.querySelector(".destination-image");
      const info = card.querySelector(".destination-info");
      const imgRect = image?.getBoundingClientRect();
      const infoRect = info?.getBoundingClientRect();
      const infoStyle = info ? getComputedStyle(info) : null;
      const imgStyle = image ? getComputedStyle(image) : null;
      return {
        cardHeight: Math.round(card.getBoundingClientRect().height),
        imageAspect:
          imgRect && imgRect.height
            ? Math.round((imgRect.width / imgRect.height) * 100) / 100
            : 0,
        infoInFlow:
          !!imgRect &&
          !!infoRect &&
          infoRect.top >= imgRect.bottom - 1,
        infoPosition: infoStyle?.position ?? "",
        infoBg: infoStyle?.backgroundColor ?? "",
        infoColor: infoStyle?.color ?? "",
        imageAspectRatio: imgStyle?.aspectRatio ?? "",
      };
    });
  });

  record("dark: destination cards are rendered", cards.length > 0, `${cards.length} cards`);

  for (const [index, card] of cards.entries()) {
    // The current design uses cinematic 16:9 feature media on desktop and
    // 4:3 media on phones. This audit runs at a 1440px viewport.
    record(
      `dark: destination card ${index} image uses the desktop 16:9 ratio`,
      Math.abs(card.imageAspect - 16 / 9) < 0.02,
      `aspect=${card.imageAspect}`,
    );
    record(
      `dark: destination card ${index} panel flows below the image`,
      card.infoInFlow && card.infoPosition === "relative",
      `position=${card.infoPosition} inFlow=${card.infoInFlow}`,
    );
    const m = card.infoBg.match(/\d+/g)?.map(Number) ?? [255, 255, 255];
    record(
      `dark: destination card ${index} panel is not a black scrim`,
      !isDark(m),
      card.infoBg,
    );
  }

  await page.close();
}

await browser.close();

const failed = results.filter((r) => !r.passed);
console.log(`\n${results.length - failed.length}/${results.length} theme checks passed.`);
if (failed.length) {
  console.log("FAILURES:");
  for (const f of failed) console.log(` - ${f.name}`);
  process.exitCode = 1;
}
