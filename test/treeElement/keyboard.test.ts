import type { TreeElementOptions } from "treeElement/options";

import { userEvent } from "@testing-library/user-event";
import TreeElement from "treeElement";

import exampleData from "../support/exampleData";

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
    document.body.innerHTML = "";

    htmlElement = document.createElement("div");
    document.body.append(htmlElement);
  });

  afterEach(() => {
    treeElement?.deinit();
    treeElement = undefined;

    document.body.innerHTML = "";
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
});
