import type { Node } from "treeElement/node";
import type { TreeElementOptions } from "treeElement/options";

import { screen } from "@testing-library/dom";
import { userEvent } from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import TreeElement from "treeElement";
import __version__ from "treeElement/version";

import exampleData from "../support/exampleData";
import { getTreeListElement } from "../support/queries";

const server = setupServer();

describe("methods", () => {
  let htmlElement: HTMLElement;
  let treeElement: TreeElement | undefined;

  const createTreeElement = (options: Partial<TreeElementOptions> = {}) => {
    treeElement = new TreeElement({ htmlElement, ...options });

    return treeElement;
  };

  beforeAll(() => {
    server.listen();
  });

  beforeEach(() => {
    document.body.innerHTML = "";

    htmlElement = document.createElement("div");
    document.body.append(htmlElement);
  });

  afterEach(() => {
    server.resetHandlers();

    treeElement?.deinit();
    treeElement = undefined;

    document.body.innerHTML = "";
    localStorage.clear();
  });

  afterAll(() => {
    server.close();
  });

  describe("addNodeAfter", () => {
    it("adds the node", () => {
      const tree = createTreeElement({
        autoOpen: true,
        data: exampleData,
      });

      const node = tree.getNodeByNameMustExist("node1");
      tree.addNodeAfter("added-node", node);

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({ name: "node1" }),
        expect.objectContaining({ name: "added-node" }),
        expect.objectContaining({ name: "node2" }),
      ]);
    });

    it("returns null when the existing node has no parent", () => {
      const tree = createTreeElement({
        autoOpen: true,
        data: exampleData,
      });

      expect(tree.addNodeAfter("added-node", tree.getTree())).toBeNull();
    });
  });

  describe("addNodeBefore", () => {
    it("adds the node", () => {
      const tree = createTreeElement({
        autoOpen: true,
        data: exampleData,
      });

      const node = tree.getNodeByNameMustExist("node1");
      tree.addNodeBefore("added-node", node);

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({ name: "added-node" }),
        expect.objectContaining({ name: "node1" }),
        expect.objectContaining({ name: "node2" }),
      ]);
    });

    it("returns null when the existing node has no parent", () => {
      const tree = createTreeElement({
        autoOpen: true,
        data: exampleData,
      });

      expect(tree.addNodeBefore("added-node", tree.getTree())).toBeNull();
    });
  });

  describe("addParentNode", () => {
    it("adds the parent node", () => {
      const tree = createTreeElement({
        autoOpen: true,
        data: exampleData,
      });

      const child1 = tree.getNodeByNameMustExist("child1");
      tree.addParentNode("new-parent-node", child1);

      // The new parent is closed, so its children are not rendered yet
      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({
          children: [
            expect.objectContaining({
              children: [],
              name: "new-parent-node",
              open: false,
            }),
          ],
          name: "node1",
        }),
        expect.objectContaining({ name: "node2" }),
      ]);
    });

    it("renders the children when the new parent node is opened", async () => {
      const tree = createTreeElement({
        autoOpen: true,
        data: exampleData,
      });

      const child1 = tree.getNodeByNameMustExist("child1");
      const newParent = tree.addParentNode("new-parent-node", child1);
      await tree.openNode(newParent as Node, false);

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({
          children: [
            expect.objectContaining({
              children: [
                expect.objectContaining({ name: "child1" }),
                expect.objectContaining({ name: "child2" }),
              ],
              name: "new-parent-node",
              open: true,
            }),
          ],
          name: "node1",
        }),
        expect.objectContaining({ name: "node2" }),
      ]);
    });

    it("returns null when the existing node has no parent", () => {
      const tree = createTreeElement({
        autoOpen: true,
        data: exampleData,
      });

      expect(tree.addParentNode("new-parent-node", tree.getTree())).toBeNull();
    });
  });

  describe("addToSelection", () => {
    it("selects the nodes", () => {
      const tree = createTreeElement({
        autoOpen: true,
        data: exampleData,
      });

      const child1 = tree.getNodeByNameMustExist("child1");
      const child2 = tree.getNodeByNameMustExist("child2");
      tree.addToSelection(child1);
      tree.addToSelection(child2);

      expect(tree.getSelectedNodes()).toStrictEqual(
        expect.arrayContaining([child1, child2]),
      );
    });

    it("renders the nodes correctly", () => {
      const tree = createTreeElement({
        autoOpen: true,
        data: exampleData,
      });

      const child1 = tree.getNodeByNameMustExist("child1");
      const child2 = tree.getNodeByNameMustExist("child2");
      tree.addToSelection(child1);
      tree.addToSelection(child2);

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({
          children: [
            expect.objectContaining({
              name: "child1",
              selected: true,
            }),
            expect.objectContaining({
              name: "child2",
              selected: true,
            }),
          ],
          name: "node1",
          selected: false,
        }),
        expect.objectContaining({
          children: [
            expect.objectContaining({
              name: "node3",
              selected: false,
            }),
          ],
          name: "node2",
          selected: false,
        }),
      ]);
    });

    it("opens the parent node when it's closed", () => {
      const tree = createTreeElement({
        autoOpen: false,
        data: exampleData,
      });

      const child1 = tree.getNodeByNameMustExist("child1");
      const node1 = tree.getNodeByNameMustExist("node1");

      expect(node1.is_open).toBeFalsy();

      tree.addToSelection(child1);

      expect(node1.is_open).toBeTrue();
    });
  });

  describe("appendNode", () => {
    it("appends the node to the root node", () => {
      const tree = createTreeElement({
        autoOpen: true,
        data: exampleData,
      });

      tree.appendNode("appended-node", tree.getTree());

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({ name: "node1" }),
        expect.objectContaining({ name: "node2" }),
        expect.objectContaining({ name: "appended-node" }),
      ]);
    });

    it("appends the node to a parent node", () => {
      const tree = createTreeElement({
        autoOpen: true,
        data: exampleData,
      });

      const parent = tree.getNodeByNameMustExist("node1");
      tree.appendNode("appended-node", parent);

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({
          children: [
            expect.objectContaining({ name: "child1" }),
            expect.objectContaining({ name: "child2" }),
            expect.objectContaining({ name: "appended-node" }),
          ],
          name: "node1",
        }),
        expect.objectContaining({ name: "node2" }),
      ]);
    });

    it("appends the node to the tree using an object", () => {
      const tree = createTreeElement({
        autoOpen: true,
        data: exampleData,
      });

      tree.appendNode(
        {
          color: "green",
          id: 99,
          name: "appended-using-object",
        },
        tree.getTree(),
      );

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({ name: "node1" }),
        expect.objectContaining({ name: "node2" }),
        expect.objectContaining({ name: "appended-using-object" }),
      ]);
    });

    it("sets the properties of the object", () => {
      const tree = createTreeElement({
        autoOpen: true,
        data: exampleData,
      });

      const nodeData = {
        color: "green",
        id: 99,
        name: "appended-using-object",
      };
      tree.appendNode(nodeData, tree.getTree());

      expect(tree.getNodeById(99)).toMatchObject(nodeData);
    });
  });

  describe("closeNode", () => {
    it("closes the node", () => {
      const tree = createTreeElement({
        autoOpen: true,
        data: exampleData,
      });

      const node1 = tree.getNodeByNameMustExist("node1");
      tree.closeNode(node1, false);

      const treeItem = screen.getByRole("treeitem", { name: "node1" });

      expect(treeItem).not.toBeAriaExpanded();
    });

    it("doesn't close a node without children", () => {
      const tree = createTreeElement({
        autoOpen: true,
        data: exampleData,
      });

      const child1 = tree.getNodeByNameMustExist("child1");
      tree.closeNode(child1, false);

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({
          children: [
            expect.objectContaining({ name: "child1" }),
            expect.objectContaining({ name: "child2" }),
          ],
          name: "node1",
          open: true,
        }),
        expect.objectContaining({
          children: [
            expect.objectContaining({
              children: [
                expect.objectContaining({ name: "child3" }),
              ],
              name: "node3",
            }),
          ],
          name: "node2",
          open: true,
        }),
      ]);
    });
  });

  describe("deinit", () => {
    it("clears the tree element", () => {
      const tree = createTreeElement({ data: exampleData });

      tree.deinit();

      expect(htmlElement).toBeEmptyDOMElement();
    });
  });

  describe("getNode", () => {
    it("returns the node for an element of the node", () => {
      const tree = createTreeElement({ data: exampleData });

      const titleElement = screen.getByText("node1", {
        selector: ".tree-element-title",
      });

      expect(tree.getNode(titleElement)).toStrictEqual(
        expect.objectContaining({ name: "node1" }),
      );
    });

    it("returns null when the element is not part of the tree", () => {
      const tree = createTreeElement({ data: exampleData });

      expect(tree.getNode(document.createElement("span"))).toBeNull();
    });
  });

  describe("getNodeByCallback", () => {
    it("returns the node", () => {
      const tree = createTreeElement({ data: exampleData });

      const callback = (node: Node) => node.name.startsWith("chi");

      expect(tree.getNodeByCallback(callback)).toMatchObject({
        name: "child1",
      });
    });
  });

  describe("getNodeById", () => {
    it("returns the node", () => {
      const tree = createTreeElement({ data: exampleData });

      expect(tree.getNodeById(127)).toMatchObject({ name: "node3" });
    });

    it("doesn't return the node with a string parameter", () => {
      const tree = createTreeElement({ data: exampleData });

      expect(tree.getNodeById("127")).toBeNull();
    });

    it("returns null when the node doesn't exist", () => {
      const tree = createTreeElement({ data: exampleData });

      expect(tree.getNodeById(99999)).toBeNull();
    });

    it("returns the node with a string parameter when the data has string ids", () => {
      const tree = createTreeElement({
        data: [{ id: "123", name: "node1" }],
      });

      expect(tree.getNodeById("123")).toMatchObject({ name: "node1" });
    });

    it("doesn't return the node with a number parameter when the data has string ids", () => {
      const tree = createTreeElement({
        data: [{ id: "123", name: "node1" }],
      });

      expect(tree.getNodeById(123)).toBeNull();
    });

    it("returns null when the node doesn't exist and the data has string ids", () => {
      const tree = createTreeElement({
        data: [{ id: "123", name: "node1" }],
      });

      expect(tree.getNodeById("abc")).toBeNull();
    });
  });

  describe("getNodeByName", () => {
    it("returns the node", () => {
      const tree = createTreeElement({ data: exampleData });

      expect(tree.getNodeByName("child1")).toMatchObject({ id: 125 });
    });

    it("returns null when the node doesn't exist", () => {
      const tree = createTreeElement({ data: exampleData });

      expect(tree.getNodeByName("non-existing")).toBeNull();
    });
  });

  describe("getNodeByNameMustExist", () => {
    it("returns the node", () => {
      const tree = createTreeElement({ data: exampleData });

      expect(tree.getNodeByNameMustExist("child1")).toMatchObject({
        id: 125,
      });
    });

    it("throws an error when the node doesn't exist", () => {
      const tree = createTreeElement({ data: exampleData });

      expect(() => tree.getNodeByNameMustExist("non-existing")).toThrow(
        "Node with name non-existing not found",
      );
    });
  });

  describe("getNodesByProperty", () => {
    it("gets nodes by property", () => {
      const tree = createTreeElement({ data: exampleData });

      const node1 = tree.getNodeByNameMustExist("node1");

      expect(tree.getNodesByProperty("intProperty", 1)).toStrictEqual([
        node1,
      ]);
    });
  });

  describe("getSelectedNode", () => {
    it("returns false when no node is selected and nodes have ids", () => {
      const tree = createTreeElement({ data: exampleData });

      expect(tree.getSelectedNode()).toBeFalse();
    });

    it("returns the selected node when nodes have ids", () => {
      const tree = createTreeElement({ data: exampleData });

      const node = tree.getNodeByNameMustExist("node1");
      tree.selectNode(node);

      expect(tree.getSelectedNode()).toBe(node);
    });

    it("returns false when no node is selected and nodes don't have ids", () => {
      const tree = createTreeElement({
        data: ["without-id1", "without-id2"],
      });

      expect(tree.getSelectedNode()).toBeFalse();
    });

    it("returns the selected node when nodes don't have ids", () => {
      const tree = createTreeElement({
        data: ["without-id1", "without-id2"],
      });

      const node = tree.getNodeByNameMustExist("without-id1");
      tree.selectNode(node);

      expect(tree.getSelectedNode()).toBe(node);
    });
  });

  describe("getSelectedNodes", () => {
    it("returns an empty array when no node is selected", () => {
      const tree = createTreeElement({ data: exampleData });

      expect(tree.getSelectedNodes()).toHaveLength(0);
    });

    it("returns the selected nodes when nodes are selected", () => {
      const tree = createTreeElement({ data: exampleData });

      const child1 = tree.getNodeByNameMustExist("child1");
      const child2 = tree.getNodeByNameMustExist("child2");
      tree.addToSelection(child1);
      tree.addToSelection(child2);

      expect(tree.getSelectedNodes()).toStrictEqual(
        expect.arrayContaining([child1, child2]),
      );
    });
  });

  describe("getState", () => {
    it("returns the state", async () => {
      const tree = createTreeElement({ data: exampleData });

      const node1 = tree.getNodeByNameMustExist("node1");
      await tree.openNode(node1, false);

      expect(tree.getState()).toStrictEqual({
        open_nodes: [123],
        selected_node: [],
      });
    });
  });

  describe("getStateFromStorage", () => {
    it("returns the state", async () => {
      const tree = createTreeElement({
        data: exampleData,
        saveState: true,
      });

      const node1 = tree.getNodeByNameMustExist("node1");
      await tree.openNode(node1, false);

      expect(tree.getStateFromStorage()).toStrictEqual({
        open_nodes: [123],
        selected_node: [],
      });
    });
  });

  describe("getTree", () => {
    it("returns the tree", () => {
      const tree = createTreeElement({ data: exampleData });

      expect(tree.getTree()).toMatchObject({
        children: [
          expect.objectContaining({ name: "node1" }),
          expect.objectContaining({ name: "node2" }),
        ],
      });
    });
  });

  describe("getVersion", () => {
    it("returns the version", () => {
      const tree = createTreeElement();

      expect(tree.getVersion()).toBe(__version__);
    });
  });

  describe("isDragging", () => {
    it("returns false when no node is being dragged", () => {
      const tree = createTreeElement({
        data: exampleData,
        dragAndDrop: true,
      });

      expect(tree.isDragging()).toBeFalse();
    });

    it("returns true while a node is being dragged", async () => {
      const tree = createTreeElement({
        data: exampleData,
        dragAndDrop: true,
        startDndDelay: 0,
      });

      const user = userEvent.setup();
      const treeItem = screen.getByRole("treeitem", { name: "node1" });

      await user.pointer([
        { keys: "[MouseLeft>]", target: treeItem },
        { coords: { x: 5, y: 5 }, target: treeItem },
      ]);

      expect(tree.isDragging()).toBeTrue();

      await user.pointer({ keys: "[/MouseLeft]", target: treeItem });
    });

    it("returns false after the drag has finished", async () => {
      const tree = createTreeElement({
        data: exampleData,
        dragAndDrop: true,
        startDndDelay: 0,
      });

      const user = userEvent.setup();
      const treeItem = screen.getByRole("treeitem", { name: "node1" });

      await user.pointer([
        { keys: "[MouseLeft>]", target: treeItem },
        { coords: { x: 5, y: 5 }, target: treeItem },
        { keys: "[/MouseLeft]", target: treeItem },
      ]);

      expect(tree.isDragging()).toBeFalse();
    });

    it("returns false when dragAndDrop is false", async () => {
      const tree = createTreeElement({
        data: exampleData,
        dragAndDrop: false,
        startDndDelay: 0,
      });

      const user = userEvent.setup();
      const treeItem = screen.getByRole("treeitem", { name: "node1" });

      await user.pointer([
        { keys: "[MouseLeft>]", target: treeItem },
        { coords: { x: 5, y: 5 }, target: treeItem },
      ]);

      expect(tree.isDragging()).toBeFalse();

      await user.pointer({ keys: "[/MouseLeft]", target: treeItem });
    });
  });

  describe("isNodeSelected", () => {
    it("returns true when the node is selected", () => {
      const tree = createTreeElement({ data: exampleData });

      const node1 = tree.getNodeByNameMustExist("node1");
      tree.selectNode(node1);

      expect(tree.isNodeSelected(node1)).toBeTrue();
    });

    it("returns false when the node is not selected", () => {
      const tree = createTreeElement({ data: exampleData });

      const node1 = tree.getNodeByNameMustExist("node1");

      expect(tree.isNodeSelected(node1)).toBeFalse();
    });
  });

  describe("loadData", () => {
    it("replaces the whole tree when the node parameter is empty", () => {
      const tree = createTreeElement({ data: ["initial1"] });

      tree.loadData(exampleData);

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({ children: [], name: "node1", open: false }),
        expect.objectContaining({ children: [], name: "node2", open: false }),
      ]);
    });

    it("loads the data under the node with a node parameter", async () => {
      const tree = createTreeElement({ data: ["initial1"] });

      const initial1 = tree.getNodeByNameMustExist("initial1");
      tree.loadData(exampleData, initial1);

      // The node is closed, so the new children are not rendered yet
      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({
          children: [],
          name: "initial1",
          open: false,
        }),
      ]);

      await tree.openNode(initial1, false);

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({
          children: [
            expect.objectContaining({ children: [], name: "node1" }),
            expect.objectContaining({ children: [], name: "node2" }),
          ],
          name: "initial1",
          open: true,
        }),
      ]);
    });

    it("does nothing when the data parameter is null", () => {
      const tree = createTreeElement({ data: ["initial1"] });

      tree.loadData(null);

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({ name: "initial1" }),
      ]);
    });

    it("deselects the node with a node parameter which has a selected child", () => {
      const tree = createTreeElement({ data: exampleData });

      tree.selectNode(tree.getNodeByNameMustExist("child1"));

      tree.loadData(
        ["new-child1"],
        tree.getNodeByNameMustExist("node1"),
      );

      expect(tree.getSelectedNode()).toBeFalse();
    });

    it("deselects the node when the selected node doesn't have an id", () => {
      const tree = createTreeElement({
        data: [
          { children: ["child1", "child2"], name: "node1" },
          "node2",
        ],
      });

      tree.selectNode(tree.getNodeByNameMustExist("child1"));

      tree.loadData(
        ["new-child1"],
        tree.getNodeByNameMustExist("node1"),
      );

      expect(tree.getSelectedNode()).toBeFalse();
    });

    it("keeps the drag and drop state when a node is being dragged", async () => {
      const tree = createTreeElement({
        data: exampleData,
        dragAndDrop: true,
        startDndDelay: 0,
      });

      const user = userEvent.setup();
      const treeItem = screen.getByRole("treeitem", { name: "node1" });

      await user.pointer([
        { keys: "[MouseLeft>]", target: treeItem },
        { coords: { x: 5, y: 5 }, target: treeItem },
      ]);

      expect(tree.isDragging()).toBeTrue();

      tree.loadData(["new-child1"], tree.getNodeByNameMustExist("node2"));

      expect(tree.isDragging()).toBeTrue();
      expect(
        getTreeListElement(screen.getByRole("treeitem", { name: "node1" })),
      ).toHaveClass("tree-element-moving");

      await user.pointer({ keys: "[/MouseLeft]", target: treeItem });
    });

    it("doesn't deselect the node when the selected child is under another node", () => {
      const tree = createTreeElement({
        data: [
          { children: ["child1", "child2"], name: "node1" },
          "node2",
        ],
      });

      tree.selectNode(tree.getNodeByNameMustExist("child1"));

      tree.loadData(
        ["new-child1"],
        tree.getNodeByNameMustExist("node2"),
      );

      expect(tree.getSelectedNode()).toMatchObject({ name: "child1" });
    });
  });

  describe("loadDataFromUrl", () => {
    it("loads the tree with a url parameter", async () => {
      server.use(
        http.get("/tree/", () => HttpResponse.json(exampleData)),
      );

      const tree = createTreeElement({ data: [] });

      await tree.loadDataFromUrl("/tree/");
      await screen.findByText("node1");

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({ name: "node1" }),
        expect.objectContaining({ name: "node2" }),
      ]);
    });

    it("loads a subtree with a parent node", async () => {
      server.use(
        http.get("/tree/", () => HttpResponse.json(["new1", "new2"])),
      );

      const tree = createTreeElement({ data: ["initial1", "initial2"] });

      const parentNode = tree.getNodeByNameMustExist("initial1");
      await tree.loadDataFromUrl("/tree/", parentNode);
      await tree.openNode(parentNode, false);
      await screen.findByText("new1");

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({
          children: [
            expect.objectContaining({ name: "new1" }),
            expect.objectContaining({ name: "new2" }),
          ],
          name: "initial1",
        }),
        expect.objectContaining({ name: "initial2" }),
      ]);
    });

    it("loads the data from dataUrl without a url parameter", async () => {
      server.use(
        http.get("/tree/", () => HttpResponse.json(exampleData)),
      );

      const tree = createTreeElement({ data: [] });

      tree.setOption("dataUrl", "/tree/");
      await tree.loadDataFromUrl();
      await screen.findByText("node1");

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({ name: "node1" }),
        expect.objectContaining({ name: "node2" }),
      ]);
    });

    it("reloads the data from the server", async () => {
      server.use(
        http.get("/tree2/", () => HttpResponse.json(exampleData)),
      );

      const tree = createTreeElement({ dataUrl: "/tree2/" });
      await screen.findByText("node1");

      const node1 = tree.getNodeByNameMustExist("node1");
      tree.removeNode(node1);

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({ name: "node2" }),
      ]);

      await tree.loadDataFromUrl();
      await screen.findByText("node1");

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({ name: "node1" }),
        expect.objectContaining({ name: "node2" }),
      ]);
    });

    it("returns a promise that resolves when the data is loaded", async () => {
      server.use(
        http.get("/tree2/", () => HttpResponse.json(exampleData)),
      );

      const tree = createTreeElement({ dataUrl: "/tree2/" });
      await screen.findByText("node1");

      const node1 = tree.getNodeByNameMustExist("node1");
      tree.removeNode(node1);

      await tree.loadDataFromUrl();

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({ name: "node1" }),
        expect.objectContaining({ name: "node2" }),
      ]);
    });

    it("doesn't load the data when there is no url", async () => {
      const tree = createTreeElement({ data: exampleData });

      await expect(tree.loadDataFromUrl()).resolves.toBeUndefined();

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({ name: "node1" }),
        expect.objectContaining({ name: "node2" }),
      ]);
    });
  });

  describe("moveDown", () => {
    it("selects the next node", () => {
      const tree = createTreeElement({ data: exampleData });

      const node1 = tree.getNodeByNameMustExist("node1");
      tree.selectNode(node1);

      tree.moveDown();

      expect(tree.getSelectedNode()).toMatchObject({ name: "node2" });
    });

    it("does nothing when no node is selected", () => {
      const tree = createTreeElement({ data: exampleData });

      tree.moveDown();

      expect(tree.getSelectedNode()).toBeFalse();
    });
  });

  describe("moveNode", () => {
    it("moves node", () => {
      const tree = createTreeElement({
        autoOpen: true,
        data: exampleData,
      });

      const child1 = tree.getNodeByNameMustExist("child1");
      const node2 = tree.getNodeByNameMustExist("node2");
      tree.moveNode(child1, node2, "after");

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({
          children: [expect.objectContaining({ name: "child2" })],
          name: "node1",
        }),
        expect.objectContaining({ name: "node2" }),
        expect.objectContaining({ name: "child1" }),
      ]);
    });
  });

  describe("moveUp", () => {
    it("selects the previous node", () => {
      const tree = createTreeElement({ data: exampleData });

      const node2 = tree.getNodeByNameMustExist("node2");
      tree.selectNode(node2);

      tree.moveUp();

      expect(tree.getSelectedNode()).toMatchObject({ name: "node1" });
    });

    it("does nothing when no node is selected", () => {
      const tree = createTreeElement({ data: exampleData });

      tree.moveUp();

      expect(tree.getSelectedNode()).toBeFalse();
    });
  });

  describe("openNode", () => {
    it("opens the node", async () => {
      const tree = createTreeElement({
        autoOpen: false,
        data: exampleData,
      });

      const node1 = tree.getNodeByNameMustExist("node1");
      await tree.openNode(node1, false);

      const treeItem = screen.getByRole("treeitem", { name: "node1" });

      expect(treeItem).toBeAriaExpanded();
    });

    // eslint-disable-next-line vitest/expect-expect
    it("handles an empty folder", async () => {
      const tree = createTreeElement({
        autoOpen: false,
        data: exampleData,
      });

      const child1 = tree.getNodeByNameMustExist("child1");
      child1.isEmptyFolder = true;

      await tree.openNode(child1, false);
    });

    it("slides when the slide parameter is omitted and the slide option is true", async () => {
      const tree = createTreeElement({
        animationSpeed: 0,
        autoOpen: false,
        data: exampleData,
        slide: true,
      });

      const animate = vi.spyOn(HTMLElement.prototype, "animate");

      const node1 = tree.getNodeByNameMustExist("node1");
      await tree.openNode(node1);

      expect(animate).toHaveBeenCalledExactlyOnceWith(expect.any(Array), {
        duration: 0,
      });
      expect(screen.getByRole("treeitem", { name: "node1" })).toBeAriaExpanded();

      animate.mockRestore();
    });

    it("doesn't slide when the slide parameter is omitted and the slide option is false", async () => {
      const tree = createTreeElement({
        autoOpen: false,
        data: exampleData,
        slide: false,
      });

      const animate = vi.spyOn(HTMLElement.prototype, "animate");

      const node1 = tree.getNodeByNameMustExist("node1");
      await tree.openNode(node1);

      expect(animate).not.toHaveBeenCalled();
      expect(screen.getByRole("treeitem", { name: "node1" })).toBeAriaExpanded();

      animate.mockRestore();
    });

    it("overrides the slide option when the slide parameter is false", async () => {
      const tree = createTreeElement({
        autoOpen: false,
        data: exampleData,
        slide: true,
      });

      const animate = vi.spyOn(HTMLElement.prototype, "animate");

      const node1 = tree.getNodeByNameMustExist("node1");
      await tree.openNode(node1, false);

      expect(animate).not.toHaveBeenCalled();
      expect(screen.getByRole("treeitem", { name: "node1" })).toBeAriaExpanded();

      animate.mockRestore();
    });
  });

  describe("prependNode", () => {
    it("prepends the node to the root node", () => {
      const tree = createTreeElement({ data: exampleData });

      tree.prependNode("prepended-node", tree.getTree());

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({ name: "prepended-node" }),
        expect.objectContaining({ name: "node1" }),
        expect.objectContaining({ name: "node2" }),
      ]);
    });

    it("prepends the node to the parent with a parent node", () => {
      const tree = createTreeElement({
        autoOpen: true,
        data: exampleData,
      });

      const parent = tree.getNodeByNameMustExist("node1");
      tree.prependNode("prepended-node", parent);

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({
          children: [
            expect.objectContaining({ name: "prepended-node" }),
            expect.objectContaining({ name: "child1" }),
            expect.objectContaining({ name: "child2" }),
          ],
          name: "node1",
        }),
        expect.objectContaining({ name: "node2" }),
      ]);
    });
  });

  describe("refresh", () => {
    it("rerenders the tree", () => {
      const tree = createTreeElement({ data: exampleData });

      tree.getNodeByNameMustExist("node1").name = "node1a";

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({ name: "node1" }),
        expect.objectContaining({ name: "node2" }),
      ]);

      tree.refresh();

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({ name: "node1a" }),
        expect.objectContaining({ name: "node2" }),
      ]);
    });

    it("keeps the selected node selected", () => {
      const tree = createTreeElement({ data: exampleData });

      const node1 = tree.getNodeByNameMustExist("node1");
      tree.selectNode(node1);

      tree.refresh();

      const treeItem = screen.getByRole("treeitem", { name: "node1" });

      expect(treeItem).toBeAriaSelected();
    });
  });

  describe("removeFromSelection", () => {
    it("deselects a node", () => {
      const tree = createTreeElement({ data: exampleData });

      const child1 = tree.getNodeByNameMustExist("child1");
      const child2 = tree.getNodeByNameMustExist("child2");
      tree.addToSelection(child1);
      tree.addToSelection(child2);

      expect(tree.isNodeSelected(child1)).toBeTrue();
      expect(tree.isNodeSelected(child2)).toBeTrue();

      tree.removeFromSelection(child2);

      expect(tree.isNodeSelected(child1)).toBeTrue();
      expect(tree.isNodeSelected(child2)).toBeFalse();
    });
  });

  describe("removeNode", () => {
    it("removes the node with a child node", () => {
      const tree = createTreeElement({ data: exampleData });

      const node = tree.getNodeByNameMustExist("child1");
      tree.removeNode(node);

      expect(tree.getNodeByName("child1")).toBeNull();
      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({ name: "node1" }),
        expect.objectContaining({ name: "node2" }),
      ]);
    });

    it("removes the element of a child node in an open folder", () => {
      const tree = createTreeElement({ autoOpen: true, data: exampleData });

      const node = tree.getNodeByNameMustExist("child1");
      tree.removeNode(node);

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({
          children: [expect.objectContaining({ name: "child2" })],
          name: "node1",
        }),
        expect.objectContaining({
          children: [expect.objectContaining({ name: "node3" })],
          name: "node2",
        }),
      ]);
    });

    it("removes and deselects the node when the child node is selected", () => {
      const tree = createTreeElement({ data: exampleData });

      const node = tree.getNodeByNameMustExist("child1");
      tree.selectNode(node);

      tree.removeNode(node);

      expect(tree.getSelectedNode()).toBeFalse();
    });

    it("removes the node with a parent node and its children", () => {
      const tree = createTreeElement({ data: exampleData });

      const node = tree.getNodeByNameMustExist("node1");
      tree.removeNode(node);

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({ name: "node2" }),
      ]);
    });

    it("removes the node and deselects the child when a child node is selected", () => {
      const tree = createTreeElement({ data: exampleData });

      const node = tree.getNodeByNameMustExist("node1");
      const child1 = tree.getNodeByNameMustExist("child1");
      tree.selectNode(child1);

      tree.removeNode(node);

      expect(tree.getSelectedNode()).toBeFalse();
    });
  });

  describe("scrollToNode", () => {
    it("handles a node without an element", () => {
      const tree = createTreeElement({ data: exampleData });

      const node = tree.getNodeByNameMustExist("child1");
      node.element = undefined;

      expect(() => {
        tree.scrollToNode(node);
      }).not.toThrow();
    });
  });

  describe("selectNode", () => {
    it("selects the node and deselects the previous node when another node is selected", () => {
      const tree = createTreeElement({
        data: exampleData,
        selectable: true,
      });

      const node1 = tree.getNodeByNameMustExist("node1");
      const node2 = tree.getNodeByNameMustExist("node2");
      tree.selectNode(node2);
      tree.selectNode(node1);

      const treeItem1 = screen.getByRole("treeitem", { name: "node1" });
      const treeItem2 = screen.getByRole("treeitem", { name: "node2" });

      expect(treeItem1).toBeAriaSelected();
      expect(treeItem2).not.toBeAriaSelected();
    });

    it("selects the node when the node is not selected", () => {
      const tree = createTreeElement({
        data: exampleData,
        selectable: true,
      });

      const node1 = tree.getNodeByNameMustExist("node1");
      tree.selectNode(node1);

      const treeItem = screen.getByRole("treeitem", { name: "node1" });

      expect(treeItem).toBeAriaSelected();
    });

    it("deselects the node when the node is selected twice", () => {
      const tree = createTreeElement({
        data: exampleData,
        selectable: true,
      });

      const node1 = tree.getNodeByNameMustExist("node1");
      tree.selectNode(node1);
      tree.selectNode(node1);

      const treeItem = screen.getByRole("treeitem", { name: "node1" });

      expect(treeItem).not.toBeAriaSelected();
    });

    it("keeps the node selected when the node is selected twice and mustToggle is false", () => {
      const tree = createTreeElement({
        data: exampleData,
        selectable: true,
      });

      const node1 = tree.getNodeByNameMustExist("node1");
      tree.selectNode(node1);
      tree.selectNode(node1, { mustToggle: false });

      expect(tree.getSelectedNode()).toBe(node1);
    });

    it("deselects the current node with a null parameter", () => {
      const tree = createTreeElement({
        data: exampleData,
        selectable: true,
      });

      const node1 = tree.getNodeByNameMustExist("node1");
      tree.selectNode(node1);

      tree.selectNode(null);

      expect(tree.getSelectedNode()).toBeFalse();
    });

    it("doesn't select the node when the selectable option is false", () => {
      const tree = createTreeElement({
        data: exampleData,
        selectable: false,
      });

      tree.selectNode(tree.getNodeByNameMustExist("node1"));

      expect(tree.getSelectedNode()).toBeFalse();
    });

    it("doesn't select the node when onCanSelectNode returns false", () => {
      const tree = createTreeElement({
        data: exampleData,
        onCanSelectNode: () => false,
        selectable: true,
      });

      tree.selectNode(tree.getNodeByNameMustExist("node1"));

      expect(tree.getSelectedNode()).toBeFalse();
    });

    it("opens the parent node when it's closed", () => {
      const tree = createTreeElement({
        data: exampleData,
        selectable: true,
      });

      const node1 = tree.getNodeByNameMustExist("node1");

      expect(node1.is_open).toBeFalsy();

      const child1 = tree.getNodeByNameMustExist("child1");
      tree.selectNode(child1);

      expect(node1.is_open).toBeTrue();
    });
  });

  describe("setOption", () => {
    it("sets an option", async () => {
      const tree = createTreeElement({
        animationSpeed: 0,
        data: exampleData,
        selectable: false,
      });

      tree.setOption("selectable", true);
      await userEvent.click(
        screen.getByRole("treeitem", { name: "node1" }),
      );

      expect(tree.getSelectedNode()).toMatchObject({ name: "node1" });
    });
  });

  describe("setState", () => {
    it("sets the state", () => {
      const tree = createTreeElement({
        autoOpen: false,
        data: exampleData,
        selectable: true,
      });

      tree.setState({
        open_nodes: [123],
        selected_node: [123],
      });

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
  });

  describe("toggle", () => {
    it("opens the node when the node is closed", () => {
      const tree = createTreeElement({
        autoOpen: false,
        data: exampleData,
      });

      const node1 = tree.getNodeByNameMustExist("node1");
      tree.toggle(node1, false);

      const treeItem = screen.getByRole("treeitem", { name: "node1" });

      expect(treeItem).toBeAriaExpanded();
    });

    it("closes the node when the node is open", () => {
      const tree = createTreeElement({
        autoOpen: true,
        data: exampleData,
      });

      const node1 = tree.getNodeByNameMustExist("node1");
      tree.toggle(node1, false);

      const treeItem = screen.getByRole("treeitem", { name: "node1" });

      expect(treeItem).not.toBeAriaExpanded();
    });
  });

  describe("toJson", () => {
    it("returns nodes as json", () => {
      const tree = createTreeElement({ data: exampleData });

      expect(tree.toJson()).toBe(
        '[{"id":123,"name":"node1","intProperty":1,"strProperty":"1","children":[{"id":125,"name":"child1","intProperty":2},{"id":126,"name":"child2"}]},{"id":124,"name":"node2","intProperty":3,"strProperty":"3","children":[{"id":127,"name":"node3","children":[{"id":128,"name":"child3"}]}]}]',
      );
    });

    it("returns an empty array for an empty tree", () => {
      const tree = createTreeElement({ data: [] });

      expect(tree.toJson()).toBe("[]");
    });
  });

  describe("updateNode", () => {
    it("updates the name with a string", () => {
      const tree = createTreeElement({
        autoOpen: true,
        data: exampleData,
      });

      const node = tree.getNodeByNameMustExist("node1");
      tree.updateNode(node, "updated-node");

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({ name: "updated-node" }),
        expect.objectContaining({ name: "node2" }),
      ]);
    });

    it("updates the name with an object containing a name", () => {
      const tree = createTreeElement({
        autoOpen: true,
        data: exampleData,
      });

      const node = tree.getNodeByNameMustExist("node1");
      tree.updateNode(node, { name: "updated-node" });

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({ name: "updated-node" }),
        expect.objectContaining({ name: "node2" }),
      ]);
    });

    it("updates the id with an object containing an id", () => {
      const tree = createTreeElement({
        autoOpen: true,
        data: exampleData,
      });

      const node = tree.getNodeByNameMustExist("node1");
      const nodeData = { id: 999 };
      tree.updateNode(node, nodeData);

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({ name: "node1" }),
        expect.objectContaining({ name: "node2" }),
      ]);
      expect(tree.getNodeById(999)).toMatchObject(nodeData);
      expect(tree.getNodeById(123)).toBeNull();
    });

    it("updates the node with an object containing a property", () => {
      const tree = createTreeElement({
        autoOpen: true,
        data: exampleData,
      });

      const node = tree.getNodeByNameMustExist("node1");
      tree.updateNode(node, { color: "green" });

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({ name: "node1" }),
        expect.objectContaining({ name: "node2" }),
      ]);
      expect(tree.getNodeById(123)).toMatchObject({
        color: "green",
        name: "node1",
      });
    });

    it("adds the child node when adding a child to a child node", async () => {
      const tree = createTreeElement({
        autoOpen: true,
        data: exampleData,
      });

      const node = tree.getNodeByNameMustExist("child1");
      tree.updateNode(node, { children: ["new-child"] });
      await tree.openNode(node, false);

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({
          children: [
            expect.objectContaining({
              children: [
                expect.objectContaining({ name: "new-child" }),
              ],
              name: "child1",
            }),
            expect.objectContaining({ name: "child2" }),
          ],
          name: "node1",
        }),
        expect.objectContaining({ name: "node2" }),
      ]);
    });

    it("removes the children when removing the children", () => {
      const tree = createTreeElement({
        autoOpen: true,
        data: exampleData,
      });

      const node = tree.getNodeByNameMustExist("node1");
      tree.updateNode(node, { children: [] });

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({
          name: "node1",
          nodeType: "child",
        }),
        expect.objectContaining({
          name: "node2",
          nodeType: "folder",
        }),
      ]);
    });

    it("keeps the node selected when the node was selected", () => {
      const tree = createTreeElement({
        autoOpen: true,
        data: exampleData,
      });

      const node = tree.getNodeByNameMustExist("node1");
      tree.selectNode(node);

      tree.updateNode(node, { name: "node1_changed" });

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({ name: "node1_changed" }),
        expect.objectContaining({ name: "node2" }),
      ]);

      expect(tree.getSelectedNode()).toStrictEqual(node);
    });

    it("keeps the focus on the node when the node was selected", () => {
      const tree = createTreeElement({
        autoOpen: true,
        data: exampleData,
      });

      const node = tree.getNodeByNameMustExist("node1");
      tree.selectNode(node);
      tree.updateNode(node, { name: "node1_changed" });

      const treeItem = screen.getByRole("treeitem", {
        name: "node1_changed",
      });

      expect(treeItem).toHaveFocus();
    });

    it("leaves the node unchanged with empty data", () => {
      const tree = createTreeElement({
        autoOpen: true,
        data: exampleData,
      });

      const node = tree.getNodeByNameMustExist("node1");
      tree.updateNode(node, "");

      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({ name: "node1" }),
        expect.objectContaining({ name: "node2" }),
      ]);
    });
  });
});
