import type { TreeElementOptions } from "treeElement/options";

import { screen } from "@testing-library/dom";
import { userEvent } from "@testing-library/user-event";
import TreeElement from "treeElement";
import { vi } from "vitest";

import exampleData from "../support/exampleData";
import { getTreeTitle } from "../support/queries";

describe("keyboard support", () => {
  let htmlElement: HTMLElement;
  let treeElement: TreeElement | undefined;

  const createTreeElement = (options: Partial<TreeElementOptions> = {}) => {
    treeElement = new TreeElement({
      animationSpeed: 0,
      autoOpen: false,
      data: exampleData,
      htmlElement,
      ...options,
    });

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

  describe("with key down", () => {
    it("selects the next node when a node is selected", async () => {
      const tree = createTreeElement();

      const node1 = tree.getNodeByNameMustExist("node1");
      tree.selectNode(node1);

      await userEvent.keyboard("{ArrowDown}");

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({ name: "node1", selected: false }),
        expect.objectContaining({ name: "node2", selected: true }),
      ]);
    });

    it("does nothing when no node is selected", async () => {
      const tree = createTreeElement();

      await userEvent.keyboard("{ArrowDown}");

      expect(tree.getSelectedNode()).toBeNull();
    });

    it("keeps the node selected when the last node is selected", async () => {
      const tree = createTreeElement();

      const node2 = tree.getNodeByNameMustExist("node2");
      tree.selectNode(node2);

      await userEvent.keyboard("{ArrowDown}");

      expect(tree.getSelectedNode()).toMatchObject({ name: "node2" });
    });
  });

  describe("with key up", () => {
    it("selects the previous node when a node is selected", async () => {
      const tree = createTreeElement();

      const node2 = tree.getNodeByNameMustExist("node2");
      tree.selectNode(node2);

      await userEvent.keyboard("{ArrowUp}");

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({ name: "node1", selected: true }),
        expect.objectContaining({ name: "node2", selected: false }),
      ]);
    });

    it("does nothing when no node is selected", async () => {
      const tree = createTreeElement();

      await userEvent.keyboard("{ArrowUp}");

      expect(tree.getSelectedNode()).toBeNull();
    });
  });

  describe("with key right", () => {
    it("opens the folder when a closed folder is selected", async () => {
      const tree = createTreeElement();

      const node1 = tree.getNodeByNameMustExist("node1");
      tree.selectNode(node1);

      await userEvent.keyboard("{ArrowRight}");

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({
          name: "node1",
          open: true,
          selected: true,
        }),
        expect.objectContaining({
          name: "node2",
          open: false,
          selected: false,
        }),
      ]);
    });

    it("selects the first child when an open folder is selected", async () => {
      const tree = createTreeElement({ autoOpen: true });

      const node1 = tree.getNodeByNameMustExist("node1");
      tree.selectNode(node1);

      await userEvent.keyboard("{ArrowRight}");

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({
          children: [
            expect.objectContaining({
              name: "child1",
              selected: true,
            }),
            expect.objectContaining({
              name: "child2",
              selected: false,
            }),
          ],
          name: "node1",
          open: true,
          selected: false,
        }),
        expect.objectContaining({
          name: "node2",
          selected: false,
        }),
      ]);
    });

    it("does nothing when no node is selected", async () => {
      const tree = createTreeElement();

      await userEvent.keyboard("{ArrowRight}");

      expect(tree.getSelectedNode()).toBeNull();
    });

    it("does nothing when a child is selected", async () => {
      const tree = createTreeElement();

      const child1 = tree.getNodeByNameMustExist("child1");
      tree.selectNode(child1);

      await userEvent.keyboard("{ArrowRight}");

      expect(tree.getSelectedNode()).toMatchObject({ name: "child1" });
    });
  });

  describe("with key left", () => {
    it("selects the previous node when a closed folder is selected", async () => {
      const tree = createTreeElement();

      const node3 = tree.getNodeByNameMustExist("node3");
      tree.selectNode(node3);

      await userEvent.keyboard("{ArrowLeft}");

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({
          name: "node1",
          selected: false,
        }),
        expect.objectContaining({
          children: [
            expect.objectContaining({
              name: "node3",
              open: false,
              selected: false,
            }),
          ],
          name: "node2",
          selected: true,
        }),
      ]);
    });

    it("closes the folder when an open folder is selected", async () => {
      const tree = createTreeElement({ autoOpen: true });

      const node2 = tree.getNodeByNameMustExist("node2");
      tree.selectNode(node2);

      await userEvent.keyboard("{ArrowLeft}");

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({
          name: "node1",
          open: true,
          selected: false,
        }),
        expect.objectContaining({
          name: "node2",
          open: false,
          selected: true,
        }),
      ]);
    });

    it("does nothing when no node is selected", async () => {
      const tree = createTreeElement();

      await userEvent.keyboard("{ArrowLeft}");

      expect(tree.getSelectedNode()).toBeNull();
    });
  });

  describe("with the home key", () => {
    it("selects the first node", async () => {
      const tree = createTreeElement({ autoOpen: true });

      tree.selectNode(tree.getNodeByNameMustExist("child3"));

      await userEvent.keyboard("{Home}");

      expect(tree.getSelectedNode()).toMatchObject({ name: "node1" });
    });
  });

  describe("with the end key", () => {
    it("selects the last visible node", async () => {
      const tree = createTreeElement({ autoOpen: true });

      tree.selectNode(tree.getNodeByNameMustExist("node1"));

      await userEvent.keyboard("{End}");

      expect(tree.getSelectedNode()).toMatchObject({ name: "child3" });
    });

    it("skips the children of closed folders", async () => {
      const tree = createTreeElement();

      tree.selectNode(tree.getNodeByNameMustExist("node1"));

      await userEvent.keyboard("{End}");

      expect(tree.getSelectedNode()).toMatchObject({ name: "node2" });
    });
  });

  describe("with the enter key", () => {
    it("dispatches tree.activate for the selected node", async () => {
      const tree = createTreeElement();
      const onActivate = vi.fn();
      htmlElement.addEventListener("tree.activate", (e) => {
        onActivate(e.detail.node, e.detail.originalEvent.key);
      });

      const node2 = tree.getNodeByNameMustExist("node2");
      tree.selectNode(node2);

      await userEvent.keyboard("{Enter}");

      expect(onActivate).toHaveBeenCalledExactlyOnceWith(node2, "Enter");
      expect(tree.getSelectedNode()).toBe(node2);
    });
  });

  describe("with page up key", () => {
    it("does nothing", async () => {
      const tree = createTreeElement();

      const child1 = tree.getNodeByNameMustExist("child1");
      tree.selectNode(child1);

      await userEvent.keyboard("{PageUp}");

      expect(tree.getSelectedNode()).toMatchObject({ name: "child1" });
    });
  });

  describe("with the keyboardSupport option false", () => {
    it("doesn't handle the key", async () => {
      const tree = createTreeElement({ keyboardSupport: false });

      const node1 = tree.getNodeByNameMustExist("node1");
      tree.selectNode(node1);

      await userEvent.keyboard("{ArrowDown}");

      expect(tree.getSelectedNode()).toMatchObject({ name: "node1" });
    });
  });

  describe("without a selected node", () => {
    const getTreeItem = (name: string) =>
      screen.getByRole("treeitem", { name });

    it("makes the first node the tab stop", () => {
      createTreeElement();

      expect(getTreeItem("node1")).toHaveAttribute("tabindex", "0");
      expect(getTreeItem("node2")).toHaveAttribute("tabindex", "-1");
    });

    it("focuses the first node with the tab key", async () => {
      createTreeElement();

      await userEvent.tab();

      expect(getTreeItem("node1")).toHaveFocus();
    });

    it.each(["{ArrowDown}", "{ArrowRight}", " "])(
      "selects the focused node with %s",
      async (key) => {
        const tree = createTreeElement();

        await userEvent.tab();
        await userEvent.keyboard(key);

        expect(tree.getSelectedNode()).toMatchObject({ name: "node1" });
        expect(getTreeItem("node1")).toHaveFocus();
      },
    );

    it("selects the first node with the home key", async () => {
      const tree = createTreeElement();

      await userEvent.tab();
      await userEvent.keyboard("{Home}");

      expect(tree.getSelectedNode()).toMatchObject({ name: "node1" });
    });

    it("selects the last node with the end key", async () => {
      const tree = createTreeElement();

      await userEvent.tab();
      await userEvent.keyboard("{End}");

      expect(tree.getSelectedNode()).toMatchObject({ name: "node2" });
      expect(getTreeItem("node2")).toHaveFocus();
    });

    it("activates the focused node with the enter key", async () => {
      const tree = createTreeElement();
      const onActivate = vi.fn();
      htmlElement.addEventListener("tree.activate", (e) => {
        onActivate(e.detail.node);
      });

      await userEvent.tab();
      await userEvent.keyboard("{Enter}");

      expect(onActivate).toHaveBeenCalledExactlyOnceWith(
        tree.getNodeByNameMustExist("node1"),
      );
      expect(tree.getSelectedNode()).toBeNull();
    });

    it("doesn't select the focused node with key up", async () => {
      const tree = createTreeElement();

      await userEvent.tab();
      await userEvent.keyboard("{ArrowUp}");

      expect(tree.getSelectedNode()).toBeNull();
    });

    it("moves the tab stop to the selected node", () => {
      const tree = createTreeElement();

      tree.selectNode(tree.getNodeByNameMustExist("node2"));

      expect(getTreeItem("node1")).toHaveAttribute("tabindex", "-1");
      expect(getTreeItem("node2")).toHaveAttribute("tabindex", "0");
    });

    it("moves the tab stop to a selected node in closed folders", async () => {
      const tree = createTreeElement();

      // child3 is in node3, which is in node2. Both folders are closed, so
      // child3 is rendered after selectNode returns.
      tree.selectNode(tree.getNodeByNameMustExist("child3"));

      const child3 = await screen.findByRole("treeitem", { name: "child3" });

      expect(child3).toHaveAttribute("tabindex", "0");
      expect(getTreeItem("node1")).toHaveAttribute("tabindex", "-1");
    });

    it("moves the tab stop back to the first node when the node is deselected", () => {
      const tree = createTreeElement();

      tree.selectNode(tree.getNodeByNameMustExist("node2"));
      tree.selectNode(null);

      expect(getTreeItem("node1")).toHaveAttribute("tabindex", "0");
      expect(getTreeItem("node2")).toHaveAttribute("tabindex", "-1");
    });

    it("keeps the tab stop when the first node is selected and deselected by clicking", async () => {
      const tree = createTreeElement();

      await userEvent.click(getTreeTitle(getTreeItem("node1")));

      expect(tree.getSelectedNode()).toMatchObject({ name: "node1" });

      await userEvent.click(getTreeTitle(getTreeItem("node1")));

      expect(tree.getSelectedNode()).toBeNull();

      expect(getTreeItem("node1")).toHaveAttribute("tabindex", "0");
    });

    it("restores the tab stop when removeFromSelection is called for the first node", () => {
      const tree = createTreeElement();

      tree.removeFromSelection(tree.getNodeByNameMustExist("node1"));

      expect(getTreeItem("node1")).toHaveAttribute("tabindex", "0");
    });

    it("moves the tab stop when the first node is removed", () => {
      const tree = createTreeElement();

      tree.removeNode(tree.getNodeByNameMustExist("node1"));

      expect(getTreeItem("node2")).toHaveAttribute("tabindex", "0");
    });

    it("moves the tab stop when the selected node is removed", () => {
      const tree = createTreeElement();

      tree.selectNode(tree.getNodeByNameMustExist("node2"));
      tree.removeNode(tree.getNodeByNameMustExist("node2"));

      expect(getTreeItem("node1")).toHaveAttribute("tabindex", "0");
    });

    it("makes the first node the tab stop after loading new data", () => {
      const tree = createTreeElement();

      tree.loadData([{ name: "new1" }, { name: "new2" }]);

      expect(getTreeItem("new1")).toHaveAttribute("tabindex", "0");
      expect(getTreeItem("new2")).toHaveAttribute("tabindex", "-1");
    });

    it("uses the tabIndex option", () => {
      createTreeElement({ tabIndex: 3 });

      expect(getTreeItem("node1")).toHaveAttribute("tabindex", "3");
    });

    it("doesn't make a tab stop when the tabIndex option is undefined", () => {
      createTreeElement({ tabIndex: undefined });

      expect(getTreeItem("node1")).not.toHaveAttribute("tabindex");
    });

    it("doesn't make a tab stop when the tree is empty", () => {
      createTreeElement({ data: [] });

      expect(screen.queryByRole("treeitem")).not.toBeInTheDocument();
    });
  });

  describe("with multiSelect", () => {
    const selectedNames = (tree: TreeElement) =>
      tree.getSelectedNodes().map((node) => node.name);

    const tabIndexes = () =>
      screen
        .getAllByRole("treeitem")
        .map((treeItem) => treeItem.getAttribute("tabindex"));

    it("moves the focus with the arrow keys without selecting", async () => {
      const tree = createTreeElement({ autoOpen: 0, multiSelect: true });

      await userEvent.tab();

      expect(screen.getByRole("treeitem", { name: "node1" })).toHaveFocus();

      await userEvent.keyboard("{ArrowDown}");

      expect(screen.getByRole("treeitem", { name: "child1" })).toHaveFocus();

      await userEvent.keyboard("{ArrowDown}{ArrowDown}");

      expect(screen.getByRole("treeitem", { name: "node2" })).toHaveFocus();

      await userEvent.keyboard("{ArrowUp}");

      expect(screen.getByRole("treeitem", { name: "child2" })).toHaveFocus();
      expect(selectedNames(tree)).toStrictEqual([]);
    });

    it("adds the focused node to the selection with Space, and removes it", async () => {
      const tree = createTreeElement({ autoOpen: 0, multiSelect: true });

      await userEvent.tab();
      await userEvent.keyboard(" {ArrowDown}{ArrowDown} ");

      expect(selectedNames(tree)).toStrictEqual(["node1", "child2"]);
      expect(screen.getByRole("treeitem", { name: "child2" })).toHaveFocus();

      await userEvent.keyboard("{ArrowUp}{ArrowUp} ");

      expect(selectedNames(tree)).toStrictEqual(["child2"]);
      expect(screen.getByRole("treeitem", { name: "node1" })).toHaveFocus();
    });

    it("opens and closes folders with the right and left keys", async () => {
      createTreeElement({ multiSelect: true });

      await userEvent.tab();

      const node1 = screen.getByRole("treeitem", { name: "node1" });

      await userEvent.keyboard("{ArrowRight}");

      expect(node1).toBeAriaExpanded();

      await userEvent.keyboard("{ArrowRight}");

      expect(screen.getByRole("treeitem", { name: "child1" })).toHaveFocus();

      await userEvent.keyboard("{ArrowLeft}");

      expect(node1).toHaveFocus();

      await userEvent.keyboard("{ArrowLeft}");

      expect(node1).not.toBeAriaExpanded();
    });

    it("moves the focus with the home and end keys", async () => {
      const tree = createTreeElement({ autoOpen: 0, multiSelect: true });

      await userEvent.tab();
      await userEvent.keyboard("{End}");

      expect(screen.getByRole("treeitem", { name: "node3" })).toHaveFocus();

      await userEvent.keyboard("{Home}");

      expect(screen.getByRole("treeitem", { name: "node1" })).toHaveFocus();
      expect(selectedNames(tree)).toStrictEqual([]);
    });

    it("activates the focused node with the enter key", async () => {
      const tree = createTreeElement({ autoOpen: 0, multiSelect: true });

      const onActivate = vi.fn();
      htmlElement.addEventListener("tree.activate", (e) => {
        onActivate(e.detail.node);
      });

      tree.addToSelection(tree.getNodeByNameMustExist("node1"), false);

      await userEvent.tab();
      await userEvent.keyboard("{ArrowDown}{Enter}");

      expect(onActivate).toHaveBeenCalledExactlyOnceWith(
        tree.getNodeByNameMustExist("child1"),
      );
    });

    it("keeps one tab stop: the focused node", async () => {
      createTreeElement({ autoOpen: 0, multiSelect: true });

      expect(tabIndexes()).toStrictEqual(["0", "-1", "-1", "-1", "-1"]);

      await userEvent.tab();
      await userEvent.keyboard(" {ArrowDown} {ArrowDown}");

      // node1 and child1 are selected, child2 has the focus
      expect(tabIndexes()).toStrictEqual(["-1", "-1", "0", "-1", "-1"]);

      await userEvent.tab({ shift: true });
      await userEvent.tab();

      expect(screen.getByRole("treeitem", { name: "child2" })).toHaveFocus();
    });

    it("makes a clicked node the tab stop", async () => {
      createTreeElement({ autoOpen: 0, multiSelect: true });

      const node2 = screen.getByRole("treeitem", { name: "node2" });

      await userEvent.click(getTreeTitle(node2));

      expect(node2).toHaveFocus();
      expect(node2).toBeAriaSelected();
      expect(tabIndexes()).toStrictEqual(["-1", "-1", "-1", "0", "-1"]);
    });

    it("keeps a clicked node the tab stop when it is deselected", async () => {
      createTreeElement({ autoOpen: 0, multiSelect: true });

      const node2 = screen.getByRole("treeitem", { name: "node2" });

      await userEvent.click(getTreeTitle(node2));
      await userEvent.click(getTreeTitle(node2));

      expect(node2).toHaveFocus();
      expect(node2).not.toBeAriaSelected();
      expect(tabIndexes()).toStrictEqual(["-1", "-1", "-1", "0", "-1"]);
    });

    it("makes the first node the tab stop when the focused node is removed", async () => {
      const tree = createTreeElement({ autoOpen: 0, multiSelect: true });

      await userEvent.tab();
      await userEvent.keyboard("{ArrowDown}");

      tree.removeNode(tree.getNodeByNameMustExist("child1"));

      expect(tabIndexes()).toStrictEqual(["0", "-1", "-1", "-1"]);
    });

    it("moves the focus with moveDown and moveUp", async () => {
      const tree = createTreeElement({ multiSelect: true });

      await userEvent.tab();
      tree.moveDown();

      expect(screen.getByRole("treeitem", { name: "node2" })).toHaveFocus();

      tree.moveUp();

      expect(screen.getByRole("treeitem", { name: "node1" })).toHaveFocus();
      expect(selectedNames(tree)).toStrictEqual([]);
    });
  });
});
