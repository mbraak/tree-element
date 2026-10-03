import cspellESLintPluginRecommended from "@cspell/eslint-plugin/recommended";
import compatPlugin from "eslint-plugin-compat";
import css from "@eslint/css";
import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import-x";
import jestDomPlugin from "eslint-plugin-jest-dom";
import jestExtendedPlugin from "eslint-plugin-jest-extended";
import perfectionistPlugin from "eslint-plugin-perfectionist";
import playwrightPlugin from "eslint-plugin-playwright";
import testingLibraryPlugin from "eslint-plugin-testing-library";
import tsdocPlugin from "eslint-plugin-tsdoc";
import unicornPlugin from "eslint-plugin-unicorn";
import vitestPlugin from "@vitest/eslint-plugin";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,ts}"],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      importPlugin.flatConfigs.recommended,
      importPlugin.flatConfigs.typescript,
      perfectionistPlugin.configs["recommended-natural"],
      cspellESLintPluginRecommended,
      unicornPlugin.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/interface-name-prefix": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-use-before-define": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/non-nullable-type-assertion-style": "off",
      "@typescript-eslint/prefer-includes": "off",
      "@typescript-eslint/triple-slash-reference": "off",
      "@typescript-eslint/prefer-string-starts-ends-with": "off",
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          allowNumber: true,
          allowBoolean: true,
          allowAny: false,
          allowNullish: false,
        },
      ],
      "@typescript-eslint/unified-signatures": "off",
      // Node.children is the tree data, not the DOM
      "unicorn/better-dom-traversing": "off",
      "unicorn/consistent-boolean-name": "off",
      "unicorn/consistent-class-member-order": "off",
      // !x.length is shorter in the minified bundle
      "unicorn/explicit-length-check": "off",
      "unicorn/filename-case": "off",
      "unicorn/name-replacements": "off",
      "unicorn/no-null": "off",
      // toSorted is ES2023, the project targets ES2022
      "unicorn/no-array-sort": "off",
      "unicorn/prefer-await": "off",
      // Node.remove and Node.removeChild are tree methods, not DOM
      "unicorn/prefer-dom-node-remove": "off",
      // getHTML and setHTML are too new for the supported browsers
      "unicorn/prefer-dom-node-html-methods": "off",
      "unicorn/prefer-logical-operator-over-ternary": "off",
      // parseInt("3px") and Number("3px") differ
      "unicorn/prefer-number-coercion": "off",
      // Browser library: globalThis.setTimeout resolves to the node typings
      "unicorn/prefer-global-this": "off",
      "unicorn/prefer-number-is-safe-integer": "off",
      "unicorn/prefer-simple-condition-first": "off",
      "unicorn/max-nested-calls": "off",
      "@cspell/spellchecker": [
        "error",
        {
          configFile: "./config/cspell.json",
        },
      ],
    },
  },
  {
    files: ["src/**/*.ts"],
    ...compatPlugin.configs["flat/recommended"],
  },
  {
    files: ["**/*.ts"],
    plugins: { tsdoc: tsdocPlugin },
    rules: {
      "tsdoc/syntax": "error",
    },
  },
  {
    // The javascript build configuration is not part of the typescript
    // project, so the type aware rules have nothing to work with.
    files: ["config/**/*.mjs"],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      ...tseslint.configs.disableTypeChecked.languageOptions,
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      "unicorn/no-process-exit": "off",
      // Rollup plugin hooks are called with a plugin context as `this`
      "unicorn/no-this-outside-of-class": "off",
    },
  },
  {
    files: ["test/**/*.ts"],
    ...vitestPlugin.configs.all,
  },
  {
    files: ["test/**/*.ts"],
    rules: {
      "import-x/no-named-as-default": "off",
      "import-x/no-named-as-default-member": "off",
      "vitest/no-duplicate-hooks": "off",
      "vitest/no-hooks": "off",
      "vitest/no-identical-title": "off",
      "vitest/prefer-called-times": "off",
      "vitest/prefer-describe-function-title": "off",
      "vitest/prefer-expect-assertions": "off",
      "vitest/prefer-importing-vitest-globals": "off",
      "vitest/prefer-lowercase-title": "off",
      "vitest/prefer-strict-boolean-matchers": "off",
      "vitest/require-hook": "off",
      "vitest/require-mock-type-parameters": "off",
      "unicorn/consistent-function-scoping": "off",
    },
  },
  {
    files: ["test/**/*.ts"],
    ...testingLibraryPlugin.configs["flat/dom"],
  },
  {
    files: ["test/**/*.ts"],
    ...jestDomPlugin.configs["flat/recommended"],
  },
  {
    files: ["test/**/*.ts"],
    ...jestExtendedPlugin.configs["flat/all"],
  },
  {
    files: ["test/**/*.ts"],
    rules: {
      "perfectionist/sort-imports": [
        "error",
        {
          internalPattern: ["^app"],
        },
      ],
    },
  },
  {
    files: ["playwright/**/*.ts"],
    ...playwrightPlugin.configs["flat/recommended"],
  },
  {
    files: ["**/*.css", "**/*.postcss"],
    language: "css/css",
    plugins: { css },
    extends: ["css/recommended"],
  },
]);
