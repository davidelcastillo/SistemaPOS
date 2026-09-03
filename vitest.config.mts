import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    // e2e specs are run by Playwright, not Vitest.
    exclude: ["e2e/**", "node_modules/**", "dist/**", ".next/**"],
coverage: {
      provider: "v8",
      enabled: true,
      // Vitest v4 removed `coverage.all`. Setting `include` now force-includes
      // every matching file (untested shells count at 0%). Omitting `include`
      // measures only files actually imported by tests — the progressive gate
      // from the Fase 0 design: shells accumulate coverage as their module
      // tests land (see docs/mapa-exposicion.md).
      exclude: [
        "src/generated/**",
        "src/test/**",
        "**/*.test.*",
        "src/components/__tests__/**",
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});