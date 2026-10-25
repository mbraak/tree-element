import type { TreeElementOptions } from "treeElement/options";

import { screen, waitFor } from "@testing-library/dom";
import { userEvent } from "@testing-library/user-event";
import TreeElement from "treeElement";

import exampleData from "../support/exampleData";
import { getTreeButton, getTreeTitle } from "../support/queries";

describe("mouse", () => {
  let htmlElement: HTMLElement;
  let treeElement: TreeElement | undefined;

  const createTreeElement = (options: Partial<TreeElementOptions> = {}) => {
    treeElement = new TreeElement({ htmlElement, ...options });

    return treeElement;
  };

  beforeEach(() => {
    document.body.replaceChildren();

    htmlElement = document.createElement("div");
    document.body.append(htmlElement);
  });

  afterEach(() => {
    treeElement?.deinit();
    treeElement = undefined;

    document.body.replaceChildren();
  });

  it("selects a node and sets the focus when it is clicked", async () => {
    createTreeElement({ data: exampleData });

    const treeItem = screen.getByRole("treeitem", { name: "node1" });

    expect(treeItem).not.toBeAriaSelected();
    expect(treeItem).not.toHaveFocus();

    await userEvent.click(getTreeTitle(treeItem));

    expect(treeItem).toBeAriaSelected();
    expect(treeItem).toHaveFocus();
  });

  it("deselects when a selected node is clicked", async () => {
    const tree = createTreeElement({ data: exampleData });

    const node = tree.getNodeByNameMustExist("node1");
    tree.selectNode(node);

    const treeItem = screen.getByRole("treeitem", { name: "node1" });

    expect(treeItem).toBeAriaSelected();

    await userEvent.click(getTreeTitle(treeItem));

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

    await userEvent.click(
      getTreeTitle(screen.getByRole("treeitem", { name: "node1" })),
    );

    expect(tree.getSelectedNode()).toBeNull();
  });

  describe("with multiSelect", () => {
    it("adds a node to the selection when it is clicked", async () => {
      const tree = createTreeElement({ data: exampleData, multiSelect: true });

      const node1 = screen.getByRole("treeitem", { name: "node1" });
      const node2 = screen.getByRole("treeitem", { name: "node2" });

      await userEvent.click(getTreeTitle(node1));
      await userEvent.click(getTreeTitle(node2));

      expect(node1).toBeAriaSelected();
      expect(node2).toBeAriaSelected();
      expect(tree.getSelectedNodes().map((node) => node.name)).toStrictEqual([
        "node1",
        "node2",
      ]);
    });

    it("removes a selected node from the selection when it is clicked", async () => {
      const tree = createTreeElement({ data: exampleData, multiSelect: true });

      tree.addToSelection(tree.getNodeByNameMustExist("node1"));
      tree.addToSelection(tree.getNodeByNameMustExist("node2"));

      const node1 = screen.getByRole("treeitem", { name: "node1" });
      const node2 = screen.getByRole("treeitem", { name: "node2" });

      await userEvent.click(getTreeTitle(node1));

      expect(node1).not.toBeAriaSelected();
      expect(node2).toBeAriaSelected();
    });

    it("dispatches tree.select and tree.deselect on a click", async () => {
      createTreeElement({ data: exampleData, multiSelect: true });

      const onSelect = vi.fn();
      const onDeselect = vi.fn();
      htmlElement.addEventListener("tree.select", onSelect);
      htmlElement.addEventListener("tree.deselect", onDeselect);

      const title = getTreeTitle(
        screen.getByRole("treeitem", { name: "node1" }),
      );

      await userEvent.click(title);
      await userEvent.click(title);

      expect(onSelect).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ type: "tree.select" }),
      );
      expect(onDeselect).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ type: "tree.deselect" }),
      );
    });

    it("doesn't add a node that can't be selected", async () => {
      const tree = createTreeElement({
        data: exampleData,
        multiSelect: true,
        onCanSelectNode: (node) => node.name !== "node2",
      });

      await userEvent.click(
        getTreeTitle(screen.getByRole("treeitem", { name: "node1" })),
      );
      await userEvent.click(
        getTreeTitle(screen.getByRole("treeitem", { name: "node2" })),
      );

      expect(tree.getSelectedNodes().map((node) => node.name)).toStrictEqual([
        "node1",
      ]);
    });

    it("marks the tree as multiselectable", () => {
      createTreeElement({ data: exampleData, multiSelect: true });

      expect(screen.getByRole("tree")).toHaveAttribute(
        "aria-multiselectable",
        "true",
      );
    });
  });

  it("replaces the selection on a click without multiSelect", async () => {
    const tree = createTreeElement({ data: exampleData });

    tree.addToSelection(tree.getNodeByNameMustExist("node1"));
    tree.addToSelection(tree.getNodeByNameMustExist("child2"));

    await userEvent.click(
      getTreeTitle(screen.getByRole("treeitem", { name: "node2" })),
    );

    expect(tree.getSelectedNodes().map((node) => node.name)).toStrictEqual([
      "node2",
    ]);
    expect(screen.getByRole("tree")).not.toHaveAttribute(
      "aria-multiselectable",
    );
  });
});
