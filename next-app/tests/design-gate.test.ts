import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  classifyFile,
  classifyInputs,
  classifyRoute,
  loadScope,
  normalizeFile,
  normalizeRoute,
} from "../scripts/design-gate.mjs";

const APP_DIR = fileURLToPath(new URL("../src/app", import.meta.url));
const PAGES_DIR = fileURLToPath(new URL("../src/features/pages", import.meta.url));
const NEXT_APP_DIR = path.resolve(APP_DIR, "../..");
const CLI = fileURLToPath(new URL("../scripts/design-gate.mjs", import.meta.url));

function runCli(args: string[]) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: NEXT_APP_DIR,
    encoding: "utf8",
  });
}

function collectPageFiles(directory: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) files.push(...collectPageFiles(path.join(directory, entry.name)));
    else if (entry.name === "page.tsx") files.push(path.join(directory, entry.name));
  }

  return files;
}

function collectPageRoutes(directory: string, segments: string[] = []): string[] {
  const routes: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const isGroup = /^\(.+\)$/.test(entry.name);
      const segment = entry.name.startsWith("[") ? `:${entry.name.slice(1, -1)}` : entry.name;
      routes.push(
        ...collectPageRoutes(
          path.join(directory, entry.name),
          isGroup ? segments : [...segments, segment],
        ),
      );
    } else if (entry.name === "page.tsx") {
      routes.push(segments.length ? `/${segments.join("/")}` : "/");
    }
  }

  return routes;
}

describe("design scope route classification", () => {
  it("maps P0 discovery and booking routes", () => {
    expect(classifyRoute("/").scope).toBe("P0");
    expect(classifyRoute("/tours").scope).toBe("P0");
    expect(classifyRoute("/tours/food-and-drink").scope).toBe("P0");
    expect(classifyRoute("/tour/abc").scope).toBe("P0");
    expect(classifyRoute("/booking").scope).toBe("P0");
    expect(classifyRoute("/booking/abc").scope).toBe("P0");
  });

  it("maps P1 company profiles and trips", () => {
    expect(classifyRoute("/companies").scope).toBe("P1");
    expect(classifyRoute("/company/acme-tours").scope).toBe("P1");
    expect(classifyRoute("/trips").scope).toBe("P1");
    expect(classifyRoute("/trips/42").scope).toBe("P1");
  });

  it("prefers the static company workspace route over the dynamic profile route", () => {
    const dashboard = classifyRoute("/company/dashboard");
    expect(dashboard.scope).toBe("P3");
    expect(dashboard.matches.map((match) => match.scope)).toEqual(["P3"]);

    expect(classifyRoute("/company/tours").scope).toBe("P3");
    expect(classifyRoute("/company/tours/create").scope).toBe("P3");
    expect(classifyRoute("/company/tours/abc").scope).toBe("P3");
    expect(classifyRoute("/company/select").scope).toBe("P3");
    expect(classifyRoute("/company").scope).toBe("P3");
    expect(classifyRoute("/view-workspace/42").scope).toBe("P3");
  });

  it("maps customer account and admin routes", () => {
    expect(classifyRoute("/bookings").scope).toBe("P2");
    expect(classifyRoute("/profile").scope).toBe("P2");
    expect(classifyRoute("/settings").scope).toBe("P2");
    expect(classifyRoute("/admin").scope).toBe("P4");
    expect(classifyRoute("/admin/tours").scope).toBe("P4");
    expect(classifyRoute("/admin/companies/abc").scope).toBe("P4");
  });

  it("normalizes route groups, URLs, query strings, and trailing slashes", () => {
    expect(normalizeRoute("/(public)/tours/?page=2#top")).toBe("/tours");
    expect(normalizeRoute("https://travel.example.com/tours/")).toBe("/tours");
    expect(normalizeRoute("/")).toBe("/");
    expect(classifyRoute("/(public)/booking/abc/").scope).toBe("P0");
  });

  it("does not assign a tier to unknown or unmapped routes", () => {
    expect(classifyRoute("/definitely-not-a-page").scope).toBeNull();
    expect(classifyRoute("/company/acme/extra").scope).toBeNull();
  });

  it("assigns a tier to every App Router page", () => {
    const routes = collectPageRoutes(APP_DIR);
    expect(routes.length).toBeGreaterThan(30);

    const unmapped = routes.filter((route) => !classifyRoute(route).matched);
    expect(unmapped).toEqual([]);
  });
});

describe("design scope file classification", () => {
  it("maps P0 page components and route files", () => {
    expect(classifyFile("src/features/pages/HomePage.tsx").scope).toBe("P0");
    expect(classifyFile("src/features/pages/ToursPage.tsx").scope).toBe("P0");
    expect(classifyFile("src/features/pages/BookingPage.tsx").scope).toBe("P0");
    expect(classifyFile("src/app/(public)/booking/[tourId]/page.tsx").scope).toBe("P0");
  });

  it("maps shared tokens and shell files to SYSTEM", () => {
    expect(classifyFile("src/app/globals.css").scope).toBe("SYSTEM");
    expect(classifyFile("src/app/travel-theme.css").scope).toBe("SYSTEM");
    expect(classifyFile("src/app/layout.tsx").scope).toBe("SYSTEM");
    expect(classifyFile("src/components/Sidebar.tsx").scope).toBe("SYSTEM");
    expect(classifyFile("src/components/ui/button.tsx").scope).toBe("SYSTEM");
    expect(classifyFile("public/manifest.json").scope).toBe("SYSTEM");
    expect(classifyFile("public/icons/icon-192x192.png").scope).toBe("SYSTEM");
  });

  it("maps company workspace and admin files", () => {
    expect(classifyFile("src/app/company/(protected)/dashboard/page.tsx").scope).toBe("P3");
    expect(classifyFile("src/features/pages/CompanyWorkspacePage.tsx").scope).toBe("P3");
    expect(classifyFile("src/features/pages/company-profile.module.css").scope).toBe("P3");
    expect(classifyFile("src/features/pages/AdminDashboardPage.tsx").scope).toBe("P4");
    expect(classifyFile("src/app/admin/(protected)/tours/page.tsx").scope).toBe("P4");
  });

  it("does not confuse the public company profile with the workspace profile", () => {
    expect(classifyFile("src/app/company/[slug]/page.tsx").scope).toBe("P1");
    expect(classifyFile("src/features/pages/company-profile-page.module.css").scope).toBe("P1");
    expect(classifyFile("src/features/pages/company-profile.module.css").scope).toBe("P3");
  });

  it("reports the shared company form in both P1 and P4", () => {
    const form = classifyFile("src/features/pages/CompanyForm.tsx");
    expect(form.scope).toBe("P1");
    expect(form.matches.map((match) => match.scope)).toEqual(["P1", "P4"]);
  });

  it("ignores API, library, test, and tooling files", () => {
    expect(classifyFile("src/app/api/tours/route.ts").ignored).toBe(true);
    expect(classifyFile("src/lib/services/public-companies.ts").ignored).toBe(true);
    expect(classifyFile("tests/design-gate.test.ts").ignored).toBe(true);
    expect(classifyFile("scripts/design-gate.mjs").ignored).toBe(true);
    expect(classifyFile("prisma/schema.prisma").ignored).toBe(true);
    expect(classifyFile("docs/REPORT.md").ignored).toBe(true);
    expect(classifyFile("public/data/zanzibar-roads-main.json").ignored).toBe(true);
  });

  it("normalizes repo-relative, absolute, and Windows paths", () => {
    expect(normalizeFile("next-app\\src\\app\\globals.css")).toBe("src/app/globals.css");
    expect(normalizeFile("D:\\travel-web\\next-app\\src\\app\\globals.css")).toBe(
      "src/app/globals.css",
    );
    expect(normalizeFile("/home/runner/work/travel/next-app/src/app/globals.css")).toBe(
      "src/app/globals.css",
    );
    expect(normalizeFile("./src/app/globals.css")).toBe("src/app/globals.css");
    expect(classifyFile("D:\\travel-web\\next-app\\src\\app\\travel-theme.css").scope).toBe(
      "SYSTEM",
    );
  });

  it("maps every App Router page file", () => {
    const unmapped = collectPageFiles(APP_DIR)
      .map((file) => `src/app/${path.relative(APP_DIR, file).split(path.sep).join("/")}`)
      .filter((file) => !classifyFile(file).matched);

    expect(unmapped).toEqual([]);
  });

  it("maps every page component and page CSS module", () => {
    const unmapped = readdirSync(PAGES_DIR)
      .filter((file) => file.endsWith(".tsx") || file.endsWith(".module.css"))
      .map((file) => `src/features/pages/${file}`)
      .filter((file) => !classifyFile(file).matched);

    expect(unmapped).toEqual([]);
  });
});

describe("design scope aggregation", () => {
  it("combines routes and files into ranked scopes", () => {
    const result = classifyInputs({
      routes: ["/tours"],
      files: ["src/app/globals.css", "src/app/api/tours/route.ts"],
    });

    expect(result.scopes).toEqual(["SYSTEM", "P0"]);
    expect(result.details.find((entry) => entry.id === "P0")?.routes).toEqual(["/tours"]);
    expect(result.details.find((entry) => entry.id === "SYSTEM")?.files).toEqual([
      "src/app/globals.css",
    ]);
    expect(result.ignoredFiles).toContain("src/app/api/tours/route.ts");
  });

  it("reports unmatched files separately from ignored files", () => {
    const result = classifyInputs({ files: ["src/unknown/thing.ts"] });
    expect(result.matched).toBe(false);
    expect(result.unmatchedFiles).toEqual(["src/unknown/thing.ts"]);
  });

  it("loads all six scopes from the policy file", () => {
    const scope = loadScope();
    expect(Object.keys(scope.tiers)).toEqual(["SYSTEM", "P0", "P1", "P2", "P3", "P4"]);
  });
});

describe("design scope CLI", () => {
  it("prints JSON for a route", () => {
    const result = runCli(["--route", "/company/dashboard", "--json"]);
    expect(result.status).toBe(0);

    const payload = JSON.parse(result.stdout);
    expect(payload.scopes).toEqual(["P3"]);
  });

  it("fails strict mode for SYSTEM and P0 until acknowledged", () => {
    expect(runCli(["--files", "src/app/globals.css", "--strict"]).status).toBe(1);
    expect(runCli(["--files", "src/app/globals.css", "--strict", "--ack"]).status).toBe(0);
    expect(runCli(["--route", "/tours", "--strict"]).status).toBe(1);
    expect(runCli(["--route", "/tours", "--strict", "--ack"]).status).toBe(0);
  });

  it("does not fail strict mode for advisory tiers", () => {
    expect(runCli(["--route", "/bookings", "--strict"]).status).toBe(0);
    expect(runCli(["--route", "/admin/tours", "--strict"]).status).toBe(0);
  });
});
