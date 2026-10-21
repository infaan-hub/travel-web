// Temporary: measure rendered card geometry across viewports.
import puppeteer from "puppeteer-core";

const BASE = "http://localhost:3100";
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--no-sandbox"],
});

const VIEWPORTS = [
  ["android-360", 360, 740],
  ["iphone-390", 390, 844],
  ["pixel-412", 412, 915],
  ["tablet-768", 768, 1024],
  ["tablet-1024", 1024, 768],
  ["desktop-1440", 1440, 900],
];
const PAGES = ["/tours/", "/attractions/", "/"];

for (const [name, width, height] of VIEWPORTS) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, isMobile: width <= 768, hasTouch: width <= 768 });
  for (const path of PAGES) {
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    await page.waitForNetworkIdle({ idleTime: 300, timeout: 10000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 500));
    const data = await page.evaluate(() => {
      const out = [];
      const grids = document.querySelectorAll(
        ".tours-grid, .attractions-grid, .destinations-grid, .home-attractions-grid, .testimonials-grid, .tips-grid"
      );
      for (const grid of grids) {
        const cs = getComputedStyle(grid);
        const cols = cs.gridTemplateColumns.split(" ").length;
        const kids = [...grid.children].filter((k) => k.getBoundingClientRect().width > 1);
        if (!kids.length) continue;
        const r = kids[0].getBoundingClientRect();
        const img = kids[0].querySelector("img");
        const im = img ? img.getBoundingClientRect() : null;
        out.push({
          grid: grid.className.split(" ")[0],
          cols,
          gap: cs.gap,
          cardW: Math.round(r.width),
          cardH: Math.round(r.height),
          imgH: im ? Math.round(im.height) : null,
        });
      }
      return out;
    });
    if (data.length) {
      console.log(`\n${name} ${path}`);
      for (const d of data) {
        console.log(
          `  ${d.grid.padEnd(20)} cols=${d.cols} gap=${d.gap.padEnd(6)} card=${d.cardW}x${d.cardH}${
            d.imgH ? ` imgH=${d.imgH}` : ""
          }`
        );
      }
    }
  }
  await page.close();
}

await browser.close();
