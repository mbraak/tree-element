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

const plugins = [tsConfigPaths(), resolvePlugin, babelPlugin];

if (!debugBuild) {
  const terserPlugin = terser({
    compress: {
      passes: 3,
      // The code has no getters, so property reads can be treated as
      // side-effect free.
      pure_getters: true,
    },
    mangle: {
      properties: {
        regex: /^_/,
      },
    },
    output: {
      comments: /@license/,
    },
  });
  plugins.push(terserPlugin);
}

if (devServer) {
  const servePlugin = serve({
    contentBase: ["./devserver", "./"],
    port: 8080,
  });
  plugins.push(servePlugin);
}

export default {
  input: "src/index.ts",
  output: {
    banner: getBanner(),
    file: debugBuild ? "tree_element.debug.js" : "tree_element.js",
    format: "iife",
    name: "TreeElement",
    sourcemap: true,
  },
  plugins,
};
