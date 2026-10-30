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
    // Only serves the files; build tree_element.js with coverage first. Run
    // node directly instead of through pnpm: pnpm 12.6 leaves the child
    // running when Playwright stops the server, so Playwright never exits.
    command: "node config/playwrightServer.mjs",
    cwd: "..",
    port: 8080,
  },
  workers: process.env.CI ? 1 : undefined,
});
