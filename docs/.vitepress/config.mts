import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitepress";

const srcDir = fileURLToPath(new URL("../../src", import.meta.url));

export default defineConfig({
  base: "/tree-element/",
  description: "Tree widget in plain javascript",
  themeConfig: {
    editLink: {
      pattern: "https://github.com/mbraak/tree-element/edit/master/docs/:path",
      text: "Edit this page on GitHub",
    },
    footer: {
      copyright: "Released under the Apache 2.0 License.",
    },
    nav: [
      { link: "/guide/getting-started", text: "Guide" },
      { link: "/reference/options", text: "Reference" },
      { link: "/changelog", text: "Changelog" },
      { link: "https://github.com/mbraak/tree-element", text: "GitHub" },
    ],
    search: {
      provider: "local",
    },
    sidebar: [
      {
        items: [
          { link: "/guide/getting-started", text: "Getting started" },
          { link: "/guide/data", text: "Data" },
          { link: "/guide/loading-on-demand", text: "Loading on demand" },
          { link: "/guide/selection", text: "Selection" },
          { link: "/guide/drag-and-drop", text: "Drag and drop" },
          { link: "/guide/saving-state", text: "Saving state" },
          { link: "/guide/styling", text: "Styling" },
        ],
        text: "Guide",
      },
      {
        items: [
          { link: "/reference/options", text: "Options" },
          { link: "/reference/methods", text: "Methods" },
          { link: "/reference/events", text: "Events" },
          { link: "/reference/node", text: "Node" },
        ],
        text: "Reference",
      },
      {
        items: [{ link: "/changelog", text: "Changelog" }],
        text: "Changelog",
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/mbraak/tree-element" },
    ],
  },
  lang: "en-US",
  // The typedoc output is included into reference/methods.md, so it must not
  // become a page of its own.
  srcExclude: ["reference/generated/**"],
  title: "tree-element",
  // The live demos import the widget from src, which imports itself through the
  // "treeElement" alias from tsconfig.json.
  vite: {
    resolve: {
      alias: [
        { find: /^treeElement$/, replacement: `${srcDir}/index.ts` },
        { find: /^treeElement\//, replacement: `${srcDir}/` },
      ],
    },
  },
});
