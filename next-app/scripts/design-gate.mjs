#!/usr/bin/env node
/**
 * Design scope gate for the Travel. app.
 *
 * Classifies routes and changed files against the P0-P4 policy in
 * .github/skills/travel-ui-design/scope.json. The gate is advisory by default:
 * it reports which design tier a change touches and which critique, handoff,
 * and audits that tier requires. Pass --strict to fail when a strict tier
 * (SYSTEM or P0) is touched without --ack.
 *
 * Usage:
 *   node scripts/design-gate.mjs --route /tours
 *   node scripts/design-gate.mjs --files src/features/pages/HomePage.tsx
 *   node scripts/design-gate.mjs --changed --base origin/main
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_SCOPE_PATH = fileURLToPath(
  new URL("../../.github/skills/travel-ui-design/scope.json", import.meta.url),
);

const compiledScopes = new WeakMap();
let defaultScope = null;

class UsageError extends Error {}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitList(value) {
  return String(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Normalize an App Router URL to a comparable route.
 * Query strings, hashes, trailing slashes, duplicate slashes, and route groups
 * such as (public) are removed.
 */
export function normalizeRoute(input = "/") {
  let route = String(input).trim();
  route = route.replace(/^https?:\/\/[^/]+/i, "");
  route = route.split(/[?#]/)[0] ?? "";
  route = route.replace(/\\/g, "/");
  if (!route.startsWith("/")) route = `/${route}`;
  const segments = route
    .split("/")
    .filter(Boolean)
    .filter((segment) => !/^\([^)]*\)$/.test(segment));
  return segments.length ? `/${segments.join("/")}` : "/";
}

/**
 * Normalize a file path to be relative to next-app/.
 * Accepts forward or back slashes, repo-relative paths (`next-app/src/...`),
 * absolute Windows paths, and file:// URLs.
 */
export function normalizeFile(input) {
  let file = String(input).trim().replace(/\\/g, "/");
  file = file.split(/[?#]/)[0] ?? file;

  if (file.startsWith("file://")) {
    try {
      file = fileURLToPath(file).replace(/\\/g, "/");
    } catch {
      // Keep the original string; it simply will not match a scope glob.
    }
  }

  const marker = file.toLowerCase().lastIndexOf("/next-app/");
  if (marker !== -1) {
    file = file.slice(marker + 1);
  } else if (/^[A-Za-z]:\//.test(file)) {
    file = file.replace(/^[A-Za-z]:\//, "");
  }

  file = file.replace(/^\.\//, "").replace(/^\/+/, "");
  if (file.startsWith("next-app/")) file = file.slice("next-app/".length);
  return file;
}

function globToRegExp(glob) {
  const normalized = String(glob).replace(/\\/g, "/");
  let source = "^";
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    if (char === "*") {
      if (normalized[index + 1] === "*") {
        if (normalized[index + 2] === "/") {
          source += "(?:.*/)?";
          index += 2;
        } else {
          source += ".*";
          index += 1;
        }
      } else {
        source += "[^/]*";
      }
    } else if (char === "?") {
      source += "[^/]";
    } else {
      source += escapeRegExp(char);
    }
  }
  return new RegExp(`${source}$`);
}

function routePatternToRegExp(pattern) {
  const normalized = normalizeRoute(pattern);
  if (normalized === "/") return /^\/$/;
  const segments = normalized.slice(1).split("/");
  let source = "^";
  for (const segment of segments) {
    if (segment === "**") source += "(?:/.*)?";
    else if (segment === "*" || segment.startsWith(":")) source += "/[^/]+";
    else source += `/${escapeRegExp(segment)}`;
  }
  return new RegExp(`${source}$`);
}

function routePatternScore(pattern) {
  const segments = normalizeRoute(pattern).split("/").filter(Boolean);
  const staticCount = segments.filter(
    (segment) => segment !== "*" && segment !== "**" && !segment.startsWith(":"),
  ).length;
  const dynamicCount = segments.filter(
    (segment) => segment === "*" || segment.startsWith(":"),
  ).length;
  const wildcardCount = segments.filter((segment) => segment === "**").length;
  return staticCount * 1000 + segments.length * 10 - dynamicCount * 2 - wildcardCount * 5;
}

function compileScope(scope) {
  const tiers = Object.entries(scope.tiers ?? {})
    .map(([id, tier], index) => ({
      id,
      tier,
      rank: Number.isFinite(tier.rank) ? tier.rank : index,
      routeMatchers: (tier.routePatterns ?? []).map((pattern) => ({
        pattern,
        regex: routePatternToRegExp(pattern),
        score: routePatternScore(pattern),
      })),
      fileMatchers: (tier.fileGlobs ?? []).map((glob) => ({
        glob,
        regex: globToRegExp(glob),
      })),
    }))
    .sort((a, b) => a.rank - b.rank);

  return {
    ignoreMatchers: (scope.ignore ?? []).map((glob) => ({
      glob,
      regex: globToRegExp(glob),
    })),
    tiers,
  };
}

function compiled(scope) {
  let value = compiledScopes.get(scope);
  if (!value) {
    value = compileScope(scope);
    compiledScopes.set(scope, value);
  }
  return value;
}

function getDefaultScope() {
  if (!defaultScope) defaultScope = loadScope();
  return defaultScope;
}

/**
 * Read and minimally validate scope.json.
 */
export function loadScope(scopePath = DEFAULT_SCOPE_PATH) {
  let scope;
  try {
    scope = JSON.parse(readFileSync(scopePath, "utf8"));
  } catch (error) {
    throw new Error(`Could not read scope file ${scopePath}: ${error.message}`);
  }

  if (!scope || typeof scope !== "object" || !scope.tiers || typeof scope.tiers !== "object") {
    throw new Error(`Scope file ${scopePath} must define a "tiers" object.`);
  }

  if (scope.ignore !== undefined && !Array.isArray(scope.ignore)) {
    throw new Error(`Scope file ${scopePath} must define "ignore" as an array.`);
  }

  for (const [id, tier] of Object.entries(scope.tiers)) {
    if (!tier || typeof tier !== "object") {
      throw new Error(`Tier ${id} must be an object.`);
    }
    if (tier.routePatterns !== undefined && !Array.isArray(tier.routePatterns)) {
      throw new Error(`Tier ${id}.routePatterns must be an array.`);
    }
    if (tier.fileGlobs !== undefined && !Array.isArray(tier.fileGlobs)) {
      throw new Error(`Tier ${id}.fileGlobs must be an array.`);
    }
  }

  return scope;
}

/**
 * Classify one route. Static segments beat dynamic segments, so
 * /company/dashboard resolves to P3 instead of the P1 /company/:slug rule.
 */
export function classifyRoute(input, scope = getDefaultScope()) {
  const route = normalizeRoute(input);
  const matches = [];

  for (const { id, tier, rank, routeMatchers } of compiled(scope).tiers) {
    let best = null;
    for (const matcher of routeMatchers) {
      if (matcher.regex.test(route) && (!best || matcher.score > best.score)) {
        best = { scope: id, label: tier.label, pattern: matcher.pattern, score: matcher.score };
      }
    }
    if (best) matches.push({ ...best, rank });
  }

  matches.sort((a, b) => b.score - a.score || a.rank - b.rank);
  const primary = matches[0] ?? null;

  return {
    input: String(input),
    route,
    scope: primary?.scope ?? null,
    pattern: primary?.pattern ?? null,
    // A route has one design tier. Static segments shadow dynamic ones, so
    // /company/dashboard is P3, not the P1 /company/:slug profile.
    matches: primary ? [{ scope: primary.scope, label: primary.label, pattern: primary.pattern }] : [],
    alternatives: matches
      .slice(1)
      .map(({ score, rank, ...match }) => match),
    matched: Boolean(primary),
  };
}

/**
 * Classify one file. Ignored paths are reported explicitly so a reviewer can
 * see that an API or test change was skipped on purpose.
 */
export function classifyFile(input, scope = getDefaultScope()) {
  const file = normalizeFile(input);
  const { ignoreMatchers, tiers } = compiled(scope);
  const ignored = ignoreMatchers.find((matcher) => matcher.regex.test(file));

  if (ignored) {
    return {
      input: String(input),
      file,
      scope: null,
      glob: null,
      matches: [],
      matched: false,
      ignored: true,
      ignoreGlob: ignored.glob,
    };
  }

  const matches = [];
  for (const { id, tier, rank, fileMatchers } of tiers) {
    const hit = fileMatchers.find((matcher) => matcher.regex.test(file));
    if (hit) matches.push({ scope: id, label: tier.label, glob: hit.glob, rank });
  }

  matches.sort((a, b) => a.rank - b.rank);

  return {
    input: String(input),
    file,
    scope: matches[0]?.scope ?? null,
    glob: matches[0]?.glob ?? null,
    matches: matches.map(({ rank, ...match }) => match),
    matched: matches.length > 0,
    ignored: false,
    ignoreGlob: null,
  };
}

/**
 * Classify a batch of routes and files and aggregate the scopes they touch.
 */
export function classifyInputs(inputs = {}, scope = getDefaultScope()) {
  const routes = (inputs.routes ?? []).map((route) => classifyRoute(route, scope));
  const files = (inputs.files ?? []).map((file) => classifyFile(file, scope));
  const rankById = new Map(compiled(scope).tiers.map((tier) => [tier.id, tier.rank]));

  const details = new Map();
  const add = (match) => {
    if (!details.has(match.scope)) {
      details.set(match.scope, {
        id: match.scope,
        label: match.label,
        rank: rankById.get(match.scope) ?? 999,
        routes: [],
        files: [],
      });
    }
    return details.get(match.scope);
  };

  for (const route of routes) {
    for (const match of route.matches) {
      const bucket = add(match);
      if (!bucket.routes.includes(route.route)) bucket.routes.push(route.route);
    }
  }

  for (const file of files) {
    for (const match of file.matches) {
      const bucket = add(match);
      if (!bucket.files.includes(file.file)) bucket.files.push(file.file);
    }
  }

  const ordered = [...details.values()].sort((a, b) => a.rank - b.rank);

  return {
    routes,
    files,
    scopes: ordered.map((entry) => entry.id),
    details: ordered,
    ignoredFiles: files.filter((file) => file.ignored).map((file) => file.file),
    unmatchedFiles: files
      .filter((file) => !file.ignored && !file.matched)
      .map((file) => file.file),
    matched: ordered.length > 0,
  };
}

function git(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function repoRoot(cwd) {
  try {
    return git(["rev-parse", "--show-toplevel"], cwd);
  } catch {
    return cwd;
  }
}

/**
 * List changed files relative to next-app/.
 * --changed alone includes committed, staged, unstaged, and untracked work.
 * --base compares the merge base to HEAD, which is what CI needs.
 */
export function changedFiles({ base = null, cwd = process.cwd() } = {}) {
  const root = repoRoot(cwd);
  let files = [];

  if (base) {
    try {
      files = git(
        ["diff", "--name-only", "--diff-filter=ACMRTUXB", `${base}...HEAD`],
        root,
      ).split(/\r?\n/);
    } catch (mergeBaseError) {
      try {
        files = git(
          ["diff", "--name-only", "--diff-filter=ACMRTUXB", `${base}..HEAD`],
          root,
        ).split(/\r?\n/);
      } catch {
        throw new Error(
          `Could not compare against "${base}". Check the ref and fetch depth. ` +
            `Git said: ${mergeBaseError.message}`,
        );
      }
    }
  } else {
    try {
      files = git(["diff", "--name-only", "--diff-filter=ACMRTUXB", "HEAD"], root).split(
        /\r?\n/,
      );
      files.push(...git(["ls-files", "--others", "--exclude-standard"], root).split(/\r?\n/));
    } catch (error) {
      throw new Error(`Could not read changed files from git. ${error.message}`);
    }
  }

  return [...new Set(files.map((file) => normalizeFile(file)).filter(Boolean))];
}

function formatList(values, limit = 12) {
  if (!values.length) return "";
  const shown = values.slice(0, limit).map((value) => `    - ${value}`);
  if (values.length > limit) shown.push(`    - ...and ${values.length - limit} more`);
  return shown.join("\n");
}

function printHelp() {
  console.log(`Travel. design scope gate

Usage:
  node scripts/design-gate.mjs --route /tours
  node scripts/design-gate.mjs --files src/features/pages/HomePage.tsx
  node scripts/design-gate.mjs --changed
  node scripts/design-gate.mjs --changed --base origin/main

Options:
  --route <path>    Route to classify (repeatable, comma-separated)
  --files <path>    File to classify, relative to next-app (repeatable, comma-separated)
  --changed         Include changed and untracked files vs HEAD
  --base <ref>      Compare <ref>...HEAD (implies --changed)
  --json            Print machine-readable JSON
  --strict          Exit 1 when a strict tier (SYSTEM/P0) matches; --ack overrides
  --ack             Record that the required critique/handoff was completed
  --scope <path>    Use an alternate scope.json
  -h, --help        Show this help

Exit codes: 0 report or no match, 1 strict violation, 2 usage error.`);
}

function printReport(report, scope, options) {
  const routeCount = report.routes.length;
  const fileCount = report.files.length;
  console.log(
    `Design scope gate: ${routeCount} route(s), ${fileCount} file(s), ${report.scopes.length} scope(s)`,
  );

  if (!report.matched) {
    console.log("\nNo design-scoped routes or files. Nothing to review for UI.");
  }

  for (const entry of report.details) {
    const tier = scope.tiers[entry.id];
    const strict = tier?.strict ? " [strict]" : "";
    console.log(`\n${entry.id} - ${entry.label}${strict}`);
    if (entry.routes.length) {
      console.log("  Routes:");
      console.log(formatList(entry.routes));
    }
    if (entry.files.length) {
      console.log("  Files:");
      console.log(formatList(entry.files));
    }
    if (tier?.critique) console.log(`  Critique: ${tier.critique}`);
    if (tier?.handoff) console.log(`  Handoff: ${tier.handoff}`);
    if (tier?.audits?.length) {
      console.log(
        `  Audits: ${tier.audits.map((audit) => `npm run ${audit}`).join(", ")}`,
      );
    }
  }

  if (report.ignoredFiles.length) {
    console.log(`\nIgnored by policy (${report.ignoredFiles.length}):`);
    console.log(formatList(report.ignoredFiles, 8));
  }

  if (report.unmatchedFiles.length) {
    console.log(`\nNot mapped to a tier (${report.unmatchedFiles.length}):`);
    console.log(formatList(report.unmatchedFiles, 8));
    console.log("  Review manually if the file renders UI.");
  }

  const strictScopes = report.scopes.filter((id) => scope.tiers[id]?.strict);
  if (options.strict && strictScopes.length) {
    console.log(`\nStrict review required: ${strictScopes.join(", ")}.`);
    if (options.ack) {
      console.log("Acknowledged with --ack. Record the critique/handoff link in the PR.");
    } else {
      console.log("Run the critique, then re-run with --ack (or use report mode).");
    }
  } else if (strictScopes.length) {
    console.log(`\nReview required before merge: ${strictScopes.join(", ")}.`);
  }
}

function readValue(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new UsageError(`${flag} requires a value.`);
  }
  return value;
}

function parseArgs(argv) {
  const options = {
    routes: [],
    files: [],
    changed: false,
    base: null,
    json: false,
    strict: false,
    ack: false,
    help: false,
    scopePath: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const equals = arg.startsWith("--") ? arg.indexOf("=") : -1;
    const name = equals === -1 ? arg : arg.slice(0, equals);
    const inline = equals === -1 ? null : arg.slice(equals + 1);

    switch (name) {
      case "--route":
        options.routes.push(...splitList(inline ?? readValue(argv, index++, name)));
        break;
      case "--files":
        options.files.push(...splitList(inline ?? readValue(argv, index++, name)));
        break;
      case "--changed":
        options.changed = true;
        break;
      case "--base":
        options.base = inline ?? readValue(argv, index++, name);
        options.changed = true;
        break;
      case "--json":
        options.json = true;
        break;
      case "--strict":
        options.strict = true;
        break;
      case "--ack":
        options.ack = true;
        break;
      case "--scope":
        options.scopePath = inline ?? readValue(argv, index++, name);
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        throw new UsageError(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function main(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(`design-gate: ${error.message}`);
      console.error("Run with --help for usage.");
      return 2;
    }
    throw error;
  }

  if (options.help) {
    printHelp();
    return 0;
  }

  let scope;
  try {
    scope = loadScope(options.scopePath ?? DEFAULT_SCOPE_PATH);
  } catch (error) {
    console.error(`design-gate: ${error.message}`);
    return 2;
  }

  if (options.changed) {
    try {
      options.files.push(...changedFiles({ base: options.base }));
    } catch (error) {
      console.error(`design-gate: ${error.message}`);
      return 2;
    }
  }

  if (!options.changed && options.routes.length === 0 && options.files.length === 0) {
    printHelp();
    return 2;
  }

  const report = classifyInputs({ routes: options.routes, files: options.files }, scope);

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          scopes: report.scopes,
          details: report.details,
          routes: report.routes,
          files: report.files,
          ignoredFiles: report.ignoredFiles,
          unmatchedFiles: report.unmatchedFiles,
          strict: options.strict,
          acknowledged: options.ack,
        },
        null,
        2,
      ),
    );
  } else {
    printReport(report, scope, options);
  }

  const strictScopes = report.scopes.filter((id) => scope.tiers[id]?.strict);
  if (options.strict && strictScopes.length && !options.ack) {
    console.error(
      `\nStrict gate failed: review required for ${strictScopes.join(", ")}. ` +
        "Re-run with --ack after completing the critique/handoff.",
    );
    return 1;
  }

  return 0;
}

const invokedDirectly =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedDirectly) {
  process.exitCode = main();
}
