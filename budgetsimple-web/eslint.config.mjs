import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // This codebase intentionally uses pragmatic typing in several MVP modules.
      "@typescript-eslint/no-explicit-any": "off",
      // The app uses effects to compute derived UI state from runtime/IndexedDB.
      "react-hooks/set-state-in-effect": "off",
      // Some files are legacy/DOM-driven; allow mutation patterns for now.
      "react-hooks/immutability": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Project-specific:
    // - Large DOM-driven runtime file (legacy-style) produces noisy TS lint.
    "src/lib/runtime.ts",
    // - E2E tests have their own type patterns; don't block app lint.
    "e2e/**",
  ]),
]);

export default eslintConfig;
