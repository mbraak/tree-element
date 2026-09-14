import type { TreeElementOptions } from "treeElement/options";

import TreeElement from "treeElement";

import exampleData from "../support/exampleData";

describe("create with data", () => {
  let htmlElement: HTMLElement;
  let treeElement: TreeElement | undefined;

  const createTreeElement = (options: Partial<TreeElementOptions> = {}) => {
    treeElement = new TreeElement({ htmlElement, ...options });

    return treeElement;
  };

  beforeEach(() => {
    document.body.innerHTML = "";

    htmlElement = document.createElement("div");
    document.body.append(htmlElement);
  });

  afterEach(() => {
    treeElement?.deinit();
    treeElement = undefined;

    document.body.innerHTML = "";
  });

  it("creates a tree", () => {
    createTreeElement({ data: exampleData });

    // The children of closed folders are rendered when the folder is opened
    expect(htmlElement).toHaveTreeStructure([
      expect.objectContaining({
        children: [],
        name: "node1",
        open: false,
        selected: false,
      }),
      expect.objectContaining({
        children: [],
        name: "node2",
        open: false,
        selected: false,
      }),
    ]);
  });

  it("creates a tree with open folders", () => {
    createTreeElement({ autoOpen: true, data: exampleData });

    expect(htmlElement).toHaveTreeStructure([
      expect.objectContaining({
        children: [
          expect.objectContaining({ name: "child1" }),
          expect.objectContaining({ name: "child2" }),
        ],
        name: "node1",
        open: true,
        selected: false,
      }),
      expect.objectContaining({
        children: [
          expect.objectContaining({
            children: [expect.objectContaining({ name: "child3" })],
            name: "node3",
            open: true,
          }),
        ],
        name: "node2",
        open: true,
        selected: false,
      }),
    ]);
  });

  it("creates an empty tree without data", () => {
    const tree = createTreeElement();

    expect(htmlElement).toHaveTreeStructure([]);
    expect(tree.getTree().children).toBeEmpty();
  });
});
