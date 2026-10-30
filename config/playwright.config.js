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
    command: "node config/devServer.mjs",
    cwd: "..",
    port: 8080,
  },
  workers: process.env.CI ? 1 : undefined,
});
