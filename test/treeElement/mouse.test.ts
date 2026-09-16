import type { TreeElementOptions } from "treeElement/options";

import { screen, waitFor } from "@testing-library/dom";
import { userEvent } from "@testing-library/user-event";
import TreeElement from "treeElement";

import exampleData from "../support/exampleData";
import { getTreeButton } from "../support/queries";

describe("mouse", () => {
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

  it("selects a node and sets the focus when it is clicked", async () => {
    createTreeElement({ data: exampleData });

    const treeItem = screen.getByRole("treeitem", { name: "node1" });

    expect(treeItem).not.toBeAriaSelected();
    expect(treeItem).not.toHaveFocus();

    await userEvent.click(treeItem);

    expect(treeItem).toBeAriaSelected();
    expect(treeItem).toHaveFocus();
  });

  it("deselects when a selected node is clicked", async () => {
    const tree = createTreeElement({ data: exampleData });

    const node = tree.getNodeByNameMustExist("node1");
    tree.selectNode(node);

    const treeItem = screen.getByRole("treeitem", { name: "node1" });

    expect(treeItem).toBeAriaSelected();

    await userEvent.click(treeItem);

    expect(treeItem).not.toBeAriaSelected();
  });

  it("opens a node when the toggle button is clicked", async () => {
    createTreeElement({ data: exampleData });

    const treeItem = screen.getByRole("treeitem", { name: "node1" });

    expect(treeItem).not.toBeAriaExpanded();

    await userEvent.click(getTreeButton(treeItem));

    await waitFor(() => {
      expect(treeItem).toBeAriaExpanded();
    });
  });

  it("closes a node when the toggle button of an open node is clicked", async () => {
    createTreeElement({ autoOpen: true, data: exampleData });

    const treeItem = screen.getByRole("treeitem", { name: "node1" });

    expect(treeItem).toBeAriaExpanded();

    await userEvent.click(getTreeButton(treeItem));

    await waitFor(() => {
      expect(treeItem).not.toBeAriaExpanded();
    });
  });

  it("doesn't select a node when it is opened", async () => {
    createTreeElement({ data: exampleData });

    const treeItem = screen.getByRole("treeitem", { name: "node1" });

    expect(treeItem).not.toBeAriaSelected();
    expect(treeItem).not.toBeAriaExpanded();

    await userEvent.click(getTreeButton(treeItem));

    await waitFor(() => {
      expect(treeItem).toBeAriaExpanded();
    });

    expect(treeItem).not.toBeAriaSelected();
  });

  it("keeps it selected when a selected node is opened", async () => {
    const tree = createTreeElement({ data: exampleData });

    const node = tree.getNodeByNameMustExist("node1");
    tree.selectNode(node);

    const treeItem = screen.getByRole("treeitem", { name: "node1" });

    expect(treeItem).toBeAriaSelected();
    expect(treeItem).not.toBeAriaExpanded();

    await userEvent.click(getTreeButton(treeItem));

    await waitFor(() => {
      expect(treeItem).toBeAriaExpanded();
    });

    expect(treeItem).toBeAriaSelected();
  });

  it("doesn't select a node when the selectable option is false", async () => {
    const tree = createTreeElement({ data: exampleData, selectable: false });

    await userEvent.click(screen.getByRole("treeitem", { name: "node1" }));

    expect(tree.getSelectedNode()).toBeNull();
  });
});
