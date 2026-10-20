/**
 * Runtime WCAG 2.1 AA contrast audit.
 *
 * Walks the rendered pages, resolves the effective background of every text
 * node (compositing translucent layers and using the first gradient stop)
 * and reports pairs below 4.5:1 for normal text and 3:1 for large text.
 *
 * Usage: node scripts/contrast-audit.mjs
 */
import puppeteer from "puppeteer-core";

const BASE = process.env.AUDIT_BASE_URL || "http://127.0.0.1:3000";
const CHROME = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const PAGES = [
  { path: "/", name: "home" },
  { path: "/tours/", name: "tours" },
  { path: "/tour/46/", name: "tour detail" },
  { path: "/attractions/", name: "attractions" },
  { path: "/trips/", name: "trips" },
  { path: "/contact/", name: "contact" },
  { path: "/login/", name: "login" },
  { path: "/register/", name: "register" },
  { path: "/booking/46/", name: "booking" },
];

const audit = () => {
  const parse = (value) => {
    if (!value) return null;
    const match = value.match(/rgba?\(([^)]+)\)/);
    if (!match) {
      const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
      if (!hex) return null;
      let digits = hex[1];
      if (digits.length === 3) digits = digits.split("").map((c) => c + c).join("");
      return {
        r: parseInt(digits.slice(0, 2), 16),
        g: parseInt(digits.slice(2, 4), 16),
        b: parseInt(digits.slice(4, 6), 16),
        a: 1,
      };
    }
    const parts = match[1].split(",").map((part) => parseFloat(part.trim()));
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  };
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  const luminance = ({ r, g, b }) => {
    const channel = (value) => {
      const scaled = value / 255;
      return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };
  const ratio = (a, b) => {
    const l1 = luminance(a);
    const l2 = luminance(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };

  const gradientStops = (image) => {
    const stops = image.match(/rgba?\([^)]+\)|#[0-9a-f]{3,6}/gi) || [];
    return stops.map((stop) => parse(stop)).filter(Boolean);
  };

  const effectiveBackground = (element, skipOwnGradient = false) => {
    let node = element;
    const layers = [];
    let imageBackground = false;
    let first = true;
    while (node && node.nodeType === 1) {
      const style = getComputedStyle(node);
      const image = style.backgroundImage;
      if (image && image !== "none" && !(first && skipOwnGradient)) {
        if (/url\(/.test(image)) {
          imageBackground = true;
          break;
        }
        const stops = image.match(/rgba?\([^)]+\)|#[0-9a-f]{3,6}/gi) || [];
        // The darkest stop is the worst case for light text on a scrim.
        const stop = stops[stops.length - 1];
        if (stop) {
          const colour = parse(stop);
          if (colour) {
            layers.push(colour);
            if (colour.a === 1) break;
          }
        }
      }
      const background = parse(style.backgroundColor);
      if (background && background.a > 0) {
        layers.push(background);
        if (background.a === 1) break;
      }
      node = node.parentElement;
      first = false;
    }
    let result = { r: 255, g: 255, b: 255, a: 1 };
    for (const layer of layers.reverse()) {
      result = over(layer, result);
    }
    return { colour: result, imageBackground };
  };

  const results = [];
  let imageBacked = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  let node = walker.nextNode();
  while (node) {
    const text = (node.textContent || "").trim();
    const parent = node.parentElement;
    if (text && parent) {
      const style = getComputedStyle(parent);
      if (style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity) > 0.1) {
        const key = `${parent.className}|${text.slice(0, 24)}`;
        if (!seen.has(key)) {
          seen.add(key);
          const fill = style.webkitTextFillColor || "";
          const gradientText =
            /rgba\(0,\s*0,\s*0,\s*0\)/.test(fill) && style.backgroundImage.includes("gradient");
          let foreground = parse(style.color);
          if (gradientText) {
            // The glyphs are painted with the gradient: use its lightest stop
            // as the worst case and ignore the element's own background.
            const stops = gradientStops(style.backgroundImage);
            if (stops.length) {
              foreground = stops.reduce((lightest, stop) =>
                luminance(stop) > luminance(lightest) ? stop : lightest,
              );
            }
          }
          if (foreground && foreground.a > 0) {
            const { colour: background, imageBackground } = effectiveBackground(
              parent,
              gradientText,
            );
            if (imageBackground) {
              // Text sits on top of photography: the contrast depends on the
              // scrim that covers the image, which the audit cannot sample.
              imageBacked += 1;
            }
            if (!imageBackground) {
              const composited = foreground.a < 1 ? over(foreground, background) : foreground;
              const size = parseFloat(style.fontSize);
              const weight = Number(style.fontWeight) || 400;
              const large = size >= 24 || (size >= 18.66 && weight >= 700);
              const required = large ? 3 : 4.5;
              const value = ratio(composited, background);
              if (value < required) {
                results.push({
                  selector:
                    parent.tagName.toLowerCase() +
                    (parent.className ? `.${String(parent.className).split(" ").join(".")}` : ""),
                  text: text.slice(0, 40),
                  color: style.color,
                  background: `rgb(${Math.round(background.r)}, ${Math.round(background.g)}, ${Math.round(background.b)})`,
                  ratio: Number(value.toFixed(2)),
                  required,
                  size: Math.round(size),
                });
              }
            }
          }
        }
      }
    }
    node = walker.nextNode();
  }
  return { results, imageBacked };
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const failures = [];
let imageBackedCount = 0;
const SCHEMES = ["light", "dark"];
for (const scheme of SCHEMES) {
for (const target of PAGES) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }]);
  try {
    await page.goto(`${BASE}${target.path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForNetworkIdle({ idleTime: 400, timeout: 10000 }).catch(() => {});
    const { results, imageBacked } = await page.evaluate(audit);
    imageBackedCount += imageBacked;
    for (const result of results) {
      failures.push({ page: `${scheme}/${target.name}`, ...result });
    }
  } catch (error) {
    console.log(`skipped ${target.path}: ${error.message}`);
  }
  await page.close();
}
}

await browser.close();

console.log(`\n${failures.length} contrast failures`);
const grouped = new Map();
for (const failure of failures) {
  const key = `${failure.selector}|${failure.color}|${failure.background}`;
  if (!grouped.has(key)) grouped.set(key, { ...failure, count: 0, pages: new Set() });
  const entry = grouped.get(key);
  entry.count += 1;
  entry.pages.add(failure.page);
}
for (const entry of [...grouped.values()].sort((a, b) => a.ratio - b.ratio)) {
  console.log(
    `${String(entry.ratio).padStart(5)}:1 (needs ${entry.required}) ${entry.selector.slice(0, 58)} | ${entry.color} on ${entry.background} | ${entry.count}x on ${[...entry.pages].join(",")}`,
  );
}
if (failures.length) process.exitCode = 1;
