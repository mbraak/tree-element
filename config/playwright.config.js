import { defineConfig, devices } from "@playwright/test";
import process from "node:process";

export default defineConfig({
  projects: [
    {
      name: "Chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  testDir: "../playwright",
  webServer: {
    // Run rollup directly instead of `pnpm devserver-with-coverage`: pnpm
    // 12.6 leaves the rollup child running when Playwright stops the server,
    // so Playwright never exits. The variables are in `env` instead of the
    // command, because the Windows shell has no `NAME=value command` syntax.
    command: "rollup --config config/rollup.config.mjs",
    cwd: "..",
    env: { COVERAGE: "true", SERVE: "true" },
    port: 8080,
  },
  workers: process.env.CI ? 1 : undefined,
});
