import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./tests/server-only.js", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    // Reuse transformed modules between local runs and CI reruns. Vitest 5
    // stores this cache under node_modules so npm ci naturally invalidates it.
    fsModuleCache: true,
    include: ["tests/unit/**/*.test.js"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: [
        "src/lib/ckan/**/*.js",
        "src/lib/geo/**/*.js",
        "src/lib/data/public-indicators.js",
        "src/lib/data/public-infographics.js",
      ],
    },
  },
});
