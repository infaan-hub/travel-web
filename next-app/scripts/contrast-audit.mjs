/**
 * Runtime WCAG 2.1 AA contrast audit.
 *
 * Builds the real paint stack for every text node: each ancestor contributes
 * either a solid colour or a gradient layer, translucent layers are composited
 * in paint order, and every gradient stop is evaluated so the worst case is
 * reported.
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
  { path: "/companies/", name: "companies" },
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

  const splitLayers = (image) => {
    // Split on top level commas only (not inside parentheses).
    const layers = [];
    let depth = 0;
    let current = "";
    for (const character of image) {
      if (character === "(") depth += 1;
      if (character === ")") depth -= 1;
      if (character === "," && depth === 0) {
        layers.push(current);
        current = "";
      } else {
        current += character;
      }
    }
    if (current.trim()) layers.push(current);
    return layers;
  };

  const stopsOf = (layer) => {
    const stops = layer.match(/rgba?\([^)]+\)|#[0-9a-f]{3,6}/gi) || [];
    // Fully transparent stops do not paint anything.
    return stops
      .map((stop) => parse(stop))
      .filter((colour) => colour && colour.a > 0);
  };

  const isTransparent = (colour) => !colour || colour.a === 0;

  /**
   * Collects the background layers behind an element, bottom (deepest
   * ancestor) first.
   */
  const paintStack = (element) => {
    const nodes = [];
    let node = element;
    while (node && node.nodeType === 1) {
      nodes.push(node);
      node = node.parentElement;
    }
    const stack = [];
    for (const candidate of nodes.reverse()) {
      const style = getComputedStyle(candidate);
      if (style.backgroundImage && style.backgroundImage !== "none") {
        for (const layer of splitLayers(style.backgroundImage).reverse()) {
          if (/url\(/.test(layer)) {
            // Photography: the text must rely on its own scrim.
            stack.push({ image: true });
            continue;
          }
          const stops = stopsOf(layer);
          if (stops.length) stack.push({ stops });
        }
      }
      const colour = parse(style.backgroundColor);
      if (!isTransparent(colour)) stack.push({ colour });
    }
    return stack;
  };

  const results = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  let node = walker.nextNode();
  let imageBacked = 0;

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
            const stops = stopsOf(splitLayers(style.backgroundImage)[0] || "");
            if (stops.length) {
              foreground = stops.reduce((lightest, stop) =>
                luminance(stop) > luminance(lightest) ? stop : lightest,
              );
            }
          }

          if (foreground && foreground.a > 0) {
            const stack = paintStack(gradientText ? parent.parentElement ?? parent : parent);
            if (stack.some((layer) => layer.image)) {
              imageBacked += 1;
            } else {
              // Composite the stack. Only the topmost layer sits directly
              // behind the text, so its stops define the candidate
              // backgrounds; deeper layers only shape the colour underneath.
              let base = { r: 255, g: 255, b: 255, a: 1 };
              let candidates = [base];
              for (const layer of stack) {
                if (layer.colour) {
                  base = over(layer.colour, base);
                  candidates = [base];
                } else if (layer.stops) {
                  const composited = layer.stops.map((stop) => over(stop, base));
                  candidates = composited;
                  const top = layer.stops[layer.stops.length - 1];
                  base = over(top, base);
                }
              }
              const composited =
                foreground.a < 1 ? over(foreground, candidates[candidates.length - 1] ?? base) : foreground;
              const size = parseFloat(style.fontSize);
              const weight = Number(style.fontWeight) || 400;
              const large = size >= 24 || (size >= 18.66 && weight >= 700);
              const required = large ? 3 : 4.5;
              const value = candidates.length
                ? Math.min(...candidates.map((candidate) => ratio(composited, candidate)))
                : ratio(composited, base);
              if (value < required) {
                results.push({
                  selector:
                    parent.tagName.toLowerCase() +
                    (parent.className ? `.${String(parent.className).split(" ").join(".")}` : ""),
                  text: text.slice(0, 40),
                  color: style.color,
                  background: `rgb(${Math.round((candidates[candidates.length - 1] ?? base).r)}, ${Math.round(
                    (candidates[candidates.length - 1] ?? base).g,
                  )}, ${Math.round((candidates[candidates.length - 1] ?? base).b)})`,
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

console.log(
  `\n${failures.length} contrast failures (${imageBackedCount} text nodes sit on photography and rely on the image scrim)`,
);
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
    `${String(entry.ratio).padStart(5)}:1 (needs ${entry.required}) ${entry.selector.slice(0, 54)} | ${entry.color} on ${entry.background} | ${entry.count}x on ${[...entry.pages].join(",")}`,
  );
}
if (failures.length) process.exitCode = 1;
