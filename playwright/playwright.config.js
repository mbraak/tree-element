import { defineConfig, devices } from "@playwright/test";
import process from "node:process";

export default defineConfig({
  projects: [
    {
      name: "Chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  testDir: "./",
  webServer: {
    // Run rollup directly instead of `pnpm devserver-with-coverage`: pnpm
    // 12.6 leaves the rollup child running when Playwright stops the server,
    // so Playwright never exits.
    command:
      "COVERAGE=true SERVE=true rollup --config config/rollup.config.mjs",
    cwd: "..",
    port: 8080,
  },
  workers: process.env.CI ? 1 : undefined,
});
