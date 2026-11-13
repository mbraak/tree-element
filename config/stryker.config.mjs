// Mutation testing with StrykerJS. Run it with `pnpm mutation`; the report is
// written to reports/mutation/mutation.html.
//
// Only the vitest tests are used. The playwright tests run against the built
// bundle, which would mean a rebuild and a browser for every mutant.

/** @type {import("@stryker-mutator/api/core").PartialStrykerOptions} */
export default {
  checkers: ["typescript"],
  coverageAnalysis: "perTest",
  incremental: true,
  incrementalFile: "reports/stryker-incremental.json",
  // Listed explicitly: with pnpm the plugins are not next to
  // @stryker-mutator/core, where Stryker looks for them by default.
  plugins: [
    "@stryker-mutator/typescript-checker",
    "@stryker-mutator/vitest-runner",
  ],
  mutate: [
    "src/**/*.ts",
    // Type declarations only, or generated
    "!src/methodTypes.ts",
    "!src/dragAndDropHandler/types.ts",
    "!src/version.ts",
  ],
  reporters: ["html", "clear-text", "progress"],
  testRunner: "vitest",
  tsconfigFile: "tsconfig.json",
  vitest: {
    configFile: "config/vitest.stryker.config.mjs",
  },
};
