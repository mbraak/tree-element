import { babel } from "@rollup/plugin-babel";
import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import serve from "rollup-plugin-serve";
import tsConfigPaths from "rollup-plugin-tsconfig-paths";

import { getBanner } from "./banner.mjs";

const debugBuild = Boolean(process.env.DEBUG_BUILD);
const devServer = Boolean(process.env.SERVE);
const includeCoverage = Boolean(process.env.COVERAGE);

const resolvePlugin = resolve({ extensions: [".ts"] });

const babelConfigFile = includeCoverage
  ? "babel.coverage.config.json"
  : "babel.config.json";

const babelPlugin = babel({
  babelHelpers: "bundled",
  configFile: `./config/${babelConfigFile}`,
  extensions: [".ts"],
});

const terserPlugin = terser({
  mangle: {
    properties: {
      regex: /^_/,
    },
  },
  output: {
    comments: /@license/,
  },
});

// Constructing the serve plugin starts the server, so only do it on demand.
const servePlugin = devServer
  ? serve({
      contentBase: ["./devserver", "./"],
      port: 8080,
    })
  : null;

// One iife bundle per entry point: tree_element.js is the full tree,
// tree_element.core.js the tree without drag and drop. Both expose the global
// `TreeElement`. The debug build writes the variants without minification.
const bundle = ({ input, name, withDevServer }) => ({
  input,
  output: {
    banner: getBanner(),
    file: debugBuild ? `${name}.debug.js` : `${name}.js`,
    format: "iife",
    name: "TreeElement",
    sourcemap: true,
  },
  plugins: [
    tsConfigPaths(),
    resolvePlugin,
    babelPlugin,
    ...(debugBuild ? [] : [terserPlugin]),
    // The dev server starts once, so attach it to a single bundle.
    ...(servePlugin && withDevServer ? [servePlugin] : []),
  ],
});

export default [
  bundle({ input: "src/index.ts", name: "tree_element", withDevServer: true }),
  bundle({ input: "src/core.ts", name: "tree_element.core" }),
];
