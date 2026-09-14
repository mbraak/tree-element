import type { TreeElementOptions } from "treeElement/options";

import { screen } from "@testing-library/dom";
import { userEvent } from "@testing-library/user-event";
import TreeElement from "treeElement/core";

import exampleData from "../support/exampleData";

// The "tree-element/core" entry point: the same tree without drag and drop.
describe("core", () => {
  let htmlElement: HTMLElement;
  let treeElement: TreeElement | undefined;

  const createTreeElement = (options: Partial<TreeElementOptions> = {}) => {
    treeElement = new TreeElement({
      animationSpeed: 0,
      data: exampleData,
      htmlElement,
      ...options,
    });

    return treeElement;
  };

  // Press the mouse button on a node, move the mouse and release it. With
  // drag and drop this would move the node.
  const dragNode = async (name: string) => {
    const user = userEvent.setup();
    const title = screen.getByRole("treeitem", { name });

    await user.pointer([
      { coords: { clientX: 50, clientY: 10 }, keys: "[MouseLeft>]", target: title },
      { coords: { clientX: 50, clientY: 25 }, target: htmlElement },
      { keys: "[/MouseLeft]", target: htmlElement },
    ]);
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

  it("renders the tree and opens a folder", async () => {
    const tree = createTreeElement();

    await userEvent.click(screen.getByRole("treeitem", { name: "node2" }));

    expect(tree.getSelectedNode()).toMatchObject({ name: "node2" });
    expect(htmlElement).toHaveTreeStructure([
      expect.objectContaining({ name: "node1" }),
      expect.objectContaining({ name: "node2" }),
    ]);
  });

  it("ignores the dragAndDrop option", async () => {
    const tree = createTreeElement({ dragAndDrop: true });

    await dragNode("node1");

    expect(tree.isDragging()).toBeFalse();
    expect(htmlElement).toHaveTreeStructure([
      expect.objectContaining({ name: "node1" }),
      expect.objectContaining({ name: "node2" }),
    ]);
  });

  it("refreshHitAreas does nothing", () => {
    const tree = createTreeElement({ dragAndDrop: true });

    expect(() => {
      tree.refreshHitAreas();
    }).not.toThrow();
  });
});
