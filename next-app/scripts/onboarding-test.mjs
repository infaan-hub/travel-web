import puppeteer from "puppeteer-core";

const BASE = process.env.BASE || "http://127.0.0.1:3000";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const results = [];
const record = (name, passed, detail = "") => {
  results.push({ name, passed });
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
};

for (const viewport of [
  { name: "mobile", width: 390, height: 844, isMobile: true },
  { name: "desktop", width: 1440, height: 1000, isMobile: false },
]) {
  const page = await browser.newPage();
  await page.setViewport({
    width: viewport.width,
    height: viewport.height,
    isMobile: viewport.isMobile,
    hasTouch: viewport.isMobile,
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto(`${BASE}/onboarding/`, { waitUntil: "domcontentloaded" });
  await page.waitForNetworkIdle({ idleTime: 400, timeout: 10000 }).catch(() => {});

  const screen1 = await page.evaluate(() => ({
    collage: document.querySelectorAll(".collage-item").length,
    stars: document.querySelectorAll(".onboarding-star").length,
    cta: document.querySelector(".onboarding-cta")?.textContent?.trim(),
    divider: document.querySelector(".onboarding-divider")?.textContent?.trim(),
    socials: document.querySelectorAll(".onboarding-social").length,
    frameWidth: Math.round(document.querySelector(".onboarding-frame")?.getBoundingClientRect().width ?? 0),
  }));
  record(
    `${viewport.name}: onboarding screen 1 collage, stars and actions`,
    screen1.collage === 4 &&
      screen1.stars === 3 &&
      screen1.cta?.includes("Continue with Email") &&
      screen1.divider === "or continue with" &&
      screen1.socials === 2,
    JSON.stringify(screen1),
  );
  record(
    `${viewport.name}: frame width follows the responsive rule`,
    viewport.isMobile ? screen1.frameWidth >= 380 : screen1.frameWidth === 360,
    `width=${screen1.frameWidth}`,
  );

  // Screen 1 -> screen 2
  await page.click(".onboarding-cta");
  await page.waitForSelector(".onboarding-hero", { timeout: 10000 });
  const screen2 = await page.evaluate(() => ({
    hero: Boolean(document.querySelector(".onboarding-hero img")),
    dashes: document.querySelectorAll(".onboarding-dash").length,
    title: document.querySelector(".onboarding-title")?.textContent?.trim(),
    cta: document.querySelector(".onboarding-cta")?.textContent?.trim(),
  }));
  record(
    `${viewport.name}: onboarding screen 2 hero, dashes and CTA`,
    screen2.hero && screen2.dashes === 3 && screen2.cta === "Next",
    JSON.stringify(screen2),
  );

  // Next swaps the slide, the last slide shows "Get Started".
  await page.click(".onboarding-cta");
  await new Promise((resolve) => setTimeout(resolve, 400));
  const second = await page.evaluate(() => ({
    title: document.querySelector(".onboarding-title")?.textContent?.trim(),
    cta: document.querySelector(".onboarding-cta")?.textContent?.trim(),
  }));
  record(
    `${viewport.name}: Next swaps the slide`,
    second.title !== screen2.title && second.cta === "Next",
    JSON.stringify(second),
  );

  await page.click(".onboarding-cta");
  await new Promise((resolve) => setTimeout(resolve, 400));
  const last = await page.evaluate(() => ({
    cta: document.querySelector(".onboarding-cta")?.textContent?.trim(),
  }));
  record(`${viewport.name}: the last slide shows Get Started`, last.cta === "Get Started");

  await page.click(".onboarding-cta");
  await page.waitForFunction(() => location.pathname.includes("/register"), { timeout: 10000 }).catch(() => {});
  const destination = await page.evaluate(() => location.pathname);
  record(
    `${viewport.name}: Get Started ends the onboarding at sign up`,
    destination.includes("/register"),
    destination,
  );

  // The aqua hero on the public pages.
  await page.goto(`${BASE}/tours/`, { waitUntil: "domcontentloaded" });
  await page.waitForNetworkIdle({ idleTime: 400, timeout: 10000 }).catch(() => {});
  const hero = await page.evaluate(() => {
    const element = document.querySelector(".page-hero");
    if (!element) return null;
    const style = getComputedStyle(element);
    return {
      title: element.querySelector(".page-hero-title")?.textContent?.trim(),
      radius: style.borderBottomLeftRadius,
      background: style.backgroundImage,
    };
  });
  record(
    `${viewport.name}: public pages use the aqua rounded hero`,
    Boolean(hero?.title) && Number.parseFloat(hero?.radius ?? "0") >= 32,
    JSON.stringify(hero),
  );

  record(`${viewport.name}: no uncaught page errors`, errors.length === 0, errors.join(" | "));
  await page.close();
}

await browser.close();
const failed = results.filter((result) => !result.passed);
console.log(`\n${results.length - failed.length}/${results.length} onboarding checks passed.`);
if (failed.length) process.exitCode = 1;
