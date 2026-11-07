import { defineConfig, mergeConfig } from "vitest/config";

import baseConfig from "./vitest.config.mjs";

// The vitest config for mutation testing (`pnpm mutation`). Stryker mutates the
// files in src, so the tests that check a build instead of src can't catch a
// mutant. The bundle test also needs the debug bundle to be built first.
export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      exclude: ["test/bundle/**", "test/css/**"],
      // Without isolation the initial Stryker run fails: Element.prototype.animate
      // is undefined in some tests, although setupTests.ts mocks it with
      // mockAnimationsApi (whose afterAll restores the undefined original).
      isolate: true,
    },
  }),
);
