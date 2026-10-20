import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  {
    files: ["src/features/pages/**/*.tsx"],
    rules: {
      // The data loaders are declared below the effect that calls them. That is
      // valid JavaScript (effects run after the render) and the React Compiler
      // rule reports it as a false positive, so it is disabled for the pages.
      "react-hooks/immutability": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "next-env.d.ts",
    "scripts/**",
    "tests/**",
  ]),
]);
