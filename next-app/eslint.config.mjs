import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "next-env.d.ts",
    "scripts/**",
    "tests/**",
    // The legacy React pages were ported verbatim under @ts-nocheck so their
    // behaviour and markup stay identical. API, service and library code is
    // fully type-checked by `npm run typecheck`.
    "src/features/pages/**",
  ]),
]);
