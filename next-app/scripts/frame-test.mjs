/**
 * Verifies that the app can be embedded in a page from another origin.
 * Serves a local parent page (or a data: document) with an iframe pointing at
 * TARGET_URL and checks that the framed document actually loads, i.e. no
 * X-Frame-Options or CSP frame-ancestors block.
 *
 * Usage: node scripts/frame-test.mjs
 *   TARGET_URL     target site (default http://127.0.0.1:3000/)
 *   PARENT_MODE    http (default) | data
 */
import http from "node:http";
import puppeteer from "puppeteer-core";

const TARGET = process.env.TARGET_URL || "http://127.0.0.1:3000/";
const CHROME = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PARENT_MODE = process.env.PARENT_MODE || "http";
const PARENT_PORT = 4599;

const parentHtml = `<!doctype html><html><body><h1>frame test</h1><iframe id="f" src="${TARGET}" style="width:1000px;height:700px"></iframe></body></html>`;

let parent = null;
if (PARENT_MODE === "http") {
  parent = http.createServer((_request, response) => {
    response.writeHead(200, { "Content-Type": "text/html" });
    response.end(parentHtml);
  });
  await new Promise((resolve) => parent.listen(PARENT_PORT, "127.0.0.1", resolve));
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const page = await browser.newPage();
const messages = [];
page.on("console", (message) => messages.push(`${message.type()}: ${message.text()}`));
page.on("pageerror", (error) => messages.push(`pageerror: ${error.message}`));

if (PARENT_MODE === "http") {
  await page.goto(`http://127.0.0.1:${PARENT_PORT}/`, { waitUntil: "domcontentloaded" });
} else {
  await page.setContent(parentHtml, { waitUntil: "domcontentloaded" });
}
await new Promise((resolve) => setTimeout(resolve, 8000));

const frames = page.frames().map((frame) => frame.url());
const blocked = messages.filter((message) =>
  /Refused to display|frame-ancestors|X-Frame-Options/i.test(message),
);
const attached = frames.some((url) => url.startsWith(new URL(TARGET).origin));

console.log(JSON.stringify({ target: TARGET, parentMode: PARENT_MODE, attached, frames, blocked }, null, 2));

await browser.close();
parent?.close();
if (!attached || blocked.length) process.exitCode = 1;
