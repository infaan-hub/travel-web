import puppeteer from "puppeteer-core";

const BASE = (process.env.BASE || "http://127.0.0.1:3000").replace(/\/$/, "");
const CHROME =
  process.env.CHROME ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
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

async function createPage({
  viewport = { width: 390, height: 844, isMobile: true, hasTouch: true },
  notificationResult = "granted",
  locationResult = "granted",
  unsupported = "",
} = {}) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport(viewport);
  const errors = [];
  const responses = [];
  page.__testErrors = errors;
  page.__testResponses = responses;

  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    errors.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`);
  });
  page.on("response", (response) => {
    if (new URL(response.url()).pathname === "/api/user/") {
      responses.push(`${response.status()} ${response.url()}`);
    }
  });
  return { context, page, errors, notificationResult, locationResult, unsupported };
}

async function installPermissionMocks(page, options) {
  await page.evaluate((options) => {
    let permission = "default";
    window.__notificationRequests = Number(sessionStorage.getItem("mock_notification_requests") || 0);
    window.__locationRequests = Number(sessionStorage.getItem("mock_location_requests") || 0);
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: {
        get permission() {
          return permission;
        },
        async requestPermission() {
          window.__notificationRequests += 1;
          sessionStorage.setItem("mock_notification_requests", String(window.__notificationRequests));
          permission = options.notificationResult;
          return permission;
        },
      },
    });

    const hideProperty = (object, property) => {
      for (let prototype = object; prototype; prototype = Object.getPrototypeOf(prototype)) {
        if (!Object.prototype.hasOwnProperty.call(prototype, property)) continue;
        const descriptor = Object.getOwnPropertyDescriptor(prototype, property);
        if (descriptor?.configurable) delete prototype[property];
        return;
      }
    };
    if (options.unsupported === "notifications") {
      hideProperty(navigator, "serviceWorker");
    }
    if (options.unsupported === "location") {
      hideProperty(navigator, "geolocation");
    }

    Object.defineProperty(navigator, "permissions", {
      configurable: true,
      value: { query: async () => ({ state: "prompt" }) },
    });
    if (options.unsupported !== "location") {
      Object.defineProperty(navigator, "geolocation", {
        configurable: true,
        value: {
          getCurrentPosition(success, failure) {
            window.__locationRequests += 1;
            sessionStorage.setItem("mock_location_requests", String(window.__locationRequests));
            if (options.locationResult === "granted") {
              success({});
            } else {
              failure({
                code: options.locationResult === "denied" ? 1 : 2,
                PERMISSION_DENIED: 1,
                TIMEOUT: 3,
              });
            }
          },
        },
      });
    }
  }, options);
}

async function waitForTitle(page, title) {
  try {
    await page.waitForFunction(
      (expected) => document.querySelector(".onboarding-title")?.textContent?.trim() === expected,
      { timeout: 15000 },
      title,
    );
  } catch (error) {
    const state = await page.evaluate(() => ({
      url: location.href,
      title: document.querySelector(".onboarding-title")?.textContent?.trim() ?? null,
      body: document.body.innerText.slice(0, 500),
      onboarding: localStorage.getItem("travel_onboarding_seen"),
      scripts: [...document.scripts].map((script) => script.src).filter(Boolean).slice(0, 8),
    }));
    console.error(
      "Could not reach expected onboarding screen:",
      JSON.stringify({
        ...state,
        browserErrors: page.__testErrors ?? [],
        userResponses: page.__testResponses ?? [],
      }),
    );
    throw error;
  }
}

async function clickButton(page, label) {
  await page.evaluate((expected) => {
    const button = [...document.querySelectorAll("button")].find(
      (candidate) => candidate.textContent?.trim() === expected,
    );
    if (!button) throw new Error(`Could not find button "${expected}".`);
    button.click();
  }, label);
}

async function beginFromHome(page) {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await waitForTitle(page, "Discover Your Next Adventure");
}

function permissionOptions(test) {
  return {
    notificationResult: test.notificationResult,
    locationResult: test.locationResult,
    unsupported: test.unsupported,
  };
}

async function advanceSlides(page) {
  await clickButton(page, "Get Started");
  await waitForTitle(page, "Your Journey Starts Here");
  await clickButton(page, "Continue");
  await waitForTitle(page, "Stay Updated and Discover Nearby");
  await clickButton(page, "Continue");
  await waitForTitle(page, "Enable Travel Updates");
}

async function prepareLogin(page) {
  await page.goto(`${BASE}/onboarding/`, { waitUntil: "domcontentloaded" });
  await waitForTitle(page, "Discover Your Next Adventure");
  await page.evaluate(() => localStorage.setItem("travel_onboarding_seen", "true"));
  await page.goto(`${BASE}/login/?onboarding=complete`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[name="username"]', { timeout: 15000 });
}

try {
  const firstVisit = await createPage();
  await beginFromHome(firstVisit.page);
  const firstSlide = await firstVisit.page.evaluate(() => {
    const shell = document.querySelector(".onboarding-shell");
    const copy = document.querySelector(".onboarding-copy");
    const button = document.querySelector(".onboarding-cta");
    return {
      slide: document.querySelector(".onboarding-dashes")?.getAttribute("aria-label"),
      background: shell ? getComputedStyle(shell).backgroundColor : "",
      cardBackground: copy ? getComputedStyle(copy).backgroundColor : "",
      cardBlur: copy ? getComputedStyle(copy).backdropFilter : "",
      button: button ? getComputedStyle(button).backgroundColor : "",
      width: Math.round(shell?.getBoundingClientRect().width ?? 0),
    };
  });
  record(
    "First-time visitor is sent from Home to onboarding",
    new URL(firstVisit.page.url()).pathname.includes("/onboarding"),
    firstVisit.page.url(),
  );
  record(
    "Onboarding uses the splash background and solid blue actions",
    firstSlide.background === "rgb(8, 66, 140)" &&
      firstSlide.button === "rgb(8, 66, 140)" &&
      firstSlide.cardBackground === "rgb(255, 255, 255)" &&
      firstSlide.cardBlur === "none",
    JSON.stringify(firstSlide),
  );
  record(
    "Mobile onboarding fits the viewport without horizontal overflow",
    await firstVisit.page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  );

  await installPermissionMocks(firstVisit.page, permissionOptions(firstVisit));
  await clickButton(firstVisit.page, "Skip Introduction");
  await waitForTitle(firstVisit.page, "Enable Travel Updates");
  let permissionCounts = await firstVisit.page.evaluate(() => ({
    notifications: window.__notificationRequests,
    location: window.__locationRequests,
  }));
  record(
    "Skipping slides does not request device permissions",
    permissionCounts.notifications === 0 && permissionCounts.location === 0,
    JSON.stringify(permissionCounts),
  );
  await firstVisit.page.reload({ waitUntil: "domcontentloaded" });
  await waitForTitle(firstVisit.page, "Enable Travel Updates");
  await installPermissionMocks(firstVisit.page, permissionOptions(firstVisit));
  await clickButton(firstVisit.page, "Allow Notifications");
  await waitForTitle(firstVisit.page, "Discover Experiences Near You");
  await clickButton(firstVisit.page, "Allow Location");
  await firstVisit.page.waitForFunction(
    () => document.querySelector(".onboarding-permission-message")?.textContent?.includes("Location access is ready"),
  );
  await clickButton(firstVisit.page, "Continue to sign in");
  await firstVisit.page.waitForSelector('input[name="username"]', { timeout: 15000 });
  const completedState = await firstVisit.page.evaluate(() => ({
    complete: localStorage.getItem("travel_onboarding_seen"),
    step: sessionStorage.getItem("travel_onboarding_step"),
    notificationRequests: window.__notificationRequests,
    locationRequests: window.__locationRequests,
  }));
  record(
    "Granted permissions reach the existing login screen",
    completedState.complete === "true" &&
      completedState.step === null &&
      completedState.notificationRequests === 1 &&
      completedState.locationRequests === 1,
    JSON.stringify(completedState),
  );
  await firstVisit.context.close();

  const desktop = await createPage({
    viewport: { width: 1440, height: 1000, isMobile: false, hasTouch: false },
  });
  await beginFromHome(desktop.page);
  const desktopStyle = await desktop.page.evaluate(() => ({
    width: Math.round(document.querySelector(".onboarding-frame")?.getBoundingClientRect().width ?? 0),
    background: getComputedStyle(document.querySelector(".onboarding-shell")).backgroundColor,
    button: getComputedStyle(document.querySelector(".onboarding-cta")).backgroundColor,
  }));
  record(
    "Desktop onboarding uses the same splash and CTA colors",
    desktopStyle.background === "rgb(8, 66, 140)" &&
      desktopStyle.button === "rgb(8, 66, 140)" &&
      desktopStyle.width <= 1000,
    JSON.stringify(desktopStyle),
  );
  await desktop.context.close();

  const denied = await createPage({ notificationResult: "denied", locationResult: "denied" });
  await beginFromHome(denied.page);
  await installPermissionMocks(denied.page, permissionOptions(denied));
  await advanceSlides(denied.page);
  await clickButton(denied.page, "Allow Notifications");
  await denied.page.waitForFunction(() =>
    document.body.textContent?.includes("You can enable notifications later"),
  );
  await clickButton(denied.page, "Continue");
  await waitForTitle(denied.page, "Discover Experiences Near You");
  await clickButton(denied.page, "Allow Location");
  await denied.page.waitForFunction(() =>
    document.body.textContent?.includes("Location is blocked"),
  );
  await clickButton(denied.page, "Continue to sign in");
  await denied.page.waitForSelector('input[name="username"]', { timeout: 15000 });
  record(
    "Denied permissions show settings guidance and do not block login",
    new URL(denied.page.url()).pathname.includes("/login"),
    denied.page.url(),
  );
  await denied.context.close();

  const unsupportedNotifications = await createPage({ unsupported: "notifications" });
  await beginFromHome(unsupportedNotifications.page);
  await installPermissionMocks(
    unsupportedNotifications.page,
    permissionOptions(unsupportedNotifications),
  );
  await clickButton(unsupportedNotifications.page, "Skip Introduction");
  await waitForTitle(unsupportedNotifications.page, "Enable Travel Updates");
  await unsupportedNotifications.page.waitForFunction(() =>
    document.body.textContent?.includes("does not support push notifications"),
  );
  record(
    "Unsupported notification APIs allow the visitor to continue",
    await unsupportedNotifications.page.$(".onboarding-permission-message") !== null,
  );
  await unsupportedNotifications.context.close();

  const unsupportedLocation = await createPage({ unsupported: "location" });
  await beginFromHome(unsupportedLocation.page);
  await installPermissionMocks(unsupportedLocation.page, permissionOptions(unsupportedLocation));
  await clickButton(unsupportedLocation.page, "Skip Introduction");
  await waitForTitle(unsupportedLocation.page, "Enable Travel Updates");
  await clickButton(unsupportedLocation.page, "Not Now");
  await waitForTitle(unsupportedLocation.page, "Discover Experiences Near You");
  await unsupportedLocation.page.waitForFunction(() =>
    document.body.textContent?.includes("does not support location access"),
  );
  await clickButton(unsupportedLocation.page, "Continue to sign in");
  await unsupportedLocation.page.waitForSelector('input[name="username"]', { timeout: 15000 });
  record(
    "Unsupported geolocation allows the visitor to continue to login",
    new URL(unsupportedLocation.page.url()).pathname.includes("/login"),
    unsupportedLocation.page.url(),
  );
  await unsupportedLocation.context.close();

  const directLogin = await createPage();
  await directLogin.page.goto(`${BASE}/login/`, { waitUntil: "domcontentloaded" });
  await waitForTitle(directLogin.page, "Discover Your Next Adventure");
  record(
    "First-time visitors cannot bypass onboarding by opening Login directly",
    new URL(directLogin.page.url()).pathname.includes("/onboarding"),
    directLogin.page.url(),
  );
  await directLogin.context.close();

  const returning = await createPage();
  await returning.page.goto(`${BASE}/onboarding/`, { waitUntil: "domcontentloaded" });
  await waitForTitle(returning.page, "Discover Your Next Adventure");
  await returning.page.evaluate(() => localStorage.setItem("travel_onboarding_seen", "true"));
  await returning.page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await returning.page.waitForFunction(() => !location.pathname.includes("/onboarding"));
  record(
    "Returning visitors are not sent through onboarding again",
    new URL(returning.page.url()).pathname === "/",
    returning.page.url(),
  );
  await returning.context.close();

  const invalidLogin = await createPage();
  await prepareLogin(invalidLogin.page);
  await invalidLogin.page.type('input[name="username"]', "invalid-user");
  await invalidLogin.page.type('input[name="password"]', "invalid-password");
  await clickButton(invalidLogin.page, "Sign in");
  await invalidLogin.page.waitForFunction(() =>
    Boolean(document.querySelector('[role="alert"]')?.textContent?.trim()),
  );
  record("Invalid login credentials remain visible as an error", true);
  const loginLinks = await invalidLogin.page.evaluate(() => ({
    register: document.querySelector('a[href="/register"]') !== null,
    recovery: document.querySelector('a[href="/forgot-password/"]') !== null,
  }));
  record(
    "Existing registration and password-recovery links remain available",
    loginLinks.register && loginLinks.recovery,
    JSON.stringify(loginLinks),
  );
  await invalidLogin.context.close();

  let successfulLogin = null;
  if (process.env.TEST_USERNAME && process.env.TEST_PASSWORD) {
    successfulLogin = await createPage();
    await prepareLogin(successfulLogin.page);
    await successfulLogin.page.type('input[name="username"]', process.env.TEST_USERNAME);
    await successfulLogin.page.type('input[name="password"]', process.env.TEST_PASSWORD);
    await clickButton(successfulLogin.page, "Sign in");
    const expectedPath =
      process.env.TEST_ROLE === "admin"
        ? "/admin/dashboard"
        : process.env.TEST_ROLE === "company"
          ? "/tour-company/dashboard"
          : "/";
    await successfulLogin.page.waitForFunction(
      (path) => location.pathname === path,
      { timeout: 15000 },
      expectedPath,
    );
    record(`Successful ${process.env.TEST_ROLE || "visitor"} login routes correctly`, true);
  } else {
    console.log("SKIP Successful-login browser check — set TEST_USERNAME and TEST_PASSWORD to use a test account.");
  }
  const browserErrors = [
    ...firstVisit.errors,
    ...desktop.errors,
    ...denied.errors,
    ...unsupportedNotifications.errors,
    ...unsupportedLocation.errors,
    ...directLogin.errors,
    ...returning.errors,
    ...invalidLogin.errors,
    ...(successfulLogin?.errors ?? []),
  ];
  record("No uncaught browser errors", browserErrors.length === 0, browserErrors.join(" | "));
  if (successfulLogin) await successfulLogin.context.close();
} finally {
  await browser.close();
}

const failed = results.filter((result) => !result.passed);
console.log(`\n${results.length - failed.length}/${results.length} onboarding checks passed.`);
if (failed.length) process.exitCode = 1;
