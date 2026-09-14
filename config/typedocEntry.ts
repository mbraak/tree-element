// The entry point for typedoc, which generates the methods, options, events
// and node references in the documentation. It exports only what those pages
// document, so nothing else gets a page.
//
// The class comes from treeElement.ts rather than index.ts: index.ts only
// subclasses it to plug in drag and drop, and documenting the subclass would
// mark every method as inherited.
export type { TreeElementOptions, TreeEvents } from "../src/index";
export { Node } from "../src/node";
export { default as TreeElement } from "../src/treeElement";
