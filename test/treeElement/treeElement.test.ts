import type { NodeData } from "treeElement/node";
import type { TreeElementOptions } from "treeElement/options";

import { screen } from "@testing-library/dom";
import { userEvent } from "@testing-library/user-event";
import { mockElementBoundingClientRect } from "jsdom-testing-mocks";
import { delay, http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import TreeElement from "treeElement";
import { DragAndDropHandler } from "treeElement/dragAndDropHandler";
import { vi } from "vitest";

import exampleData from "../support/exampleData";
import { getTreeTitle } from "../support/queries";

/*
Behavior of TreeElement itself that the tests of the separate methods and
options don't cover: saving the state, the tab stop and the focus, tree.init,
auto-opening, and the animations when parents are opened.

exampleData:
  node1 (123)
    child1 (125)
    child2 (126)
  node2 (124)
    node3 (127)
      child3 (128)
*/

const server = setupServer();

const getTreeItem = (name: string) => screen.getByRole("treeitem", { name });

describe("TreeElement", () => {
  let htmlElement: HTMLElement;
  let treeElement: TreeElement | undefined;

  const createTreeElement = (options: Partial<TreeElementOptions> = {}) => {
    treeElement = new TreeElement({
      data: exampleData,
      htmlElement,
      ...options,
    });

    return treeElement;
  };

  beforeAll(() => {
    server.listen();
  });

  beforeEach(() => {
    document.body.replaceChildren();

    htmlElement = document.createElement("div");
    document.body.append(htmlElement);
  });

  afterEach(() => {
    server.resetHandlers();

    treeElement?.deinit();
    treeElement = undefined;

    document.body.replaceChildren();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterAll(() => {
    server.close();
  });

  describe("saving the state", () => {
    const createTreeWithStateSpy = (
      options: Partial<TreeElementOptions> = {},
    ) => {
      const onSetStateFromStorage = vi.fn<(state: string) => void>();
      const tree = createTreeElement({
        onSetStateFromStorage,
        saveState: true,
        ...options,
      });
      onSetStateFromStorage.mockClear();

      return { onSetStateFromStorage, tree };
    };

    it("saves the state after addToSelection", () => {
      const { onSetStateFromStorage, tree } = createTreeWithStateSpy();

      tree.addToSelection(tree.getNodeByNameMustExist("node2"));

      expect(onSetStateFromStorage).toHaveBeenLastCalledWith(
        JSON.stringify({ open_nodes: [], selected_node: [124] }),
      );
    });

    it("saves the state after removeFromSelection", () => {
      const { onSetStateFromStorage, tree } = createTreeWithStateSpy();
      const node2 = tree.getNodeByNameMustExist("node2");
      tree.addToSelection(node2);

      tree.removeFromSelection(node2);

      expect(onSetStateFromStorage).toHaveBeenLastCalledWith(
        JSON.stringify({ open_nodes: [], selected_node: [] }),
      );
    });

    it("saves the state after selectNode(null)", () => {
      const { onSetStateFromStorage, tree } = createTreeWithStateSpy();
      tree.selectNode(tree.getNodeByNameMustExist("node2"));

      tree.selectNode(null);

      expect(onSetStateFromStorage).toHaveBeenLastCalledWith(
        JSON.stringify({ open_nodes: [], selected_node: [] }),
      );
    });

    it("saves the state after closeNode", async () => {
      const { onSetStateFromStorage, tree } = createTreeWithStateSpy({
        autoOpen: 0,
      });

      await tree.closeNode(tree.getNodeByNameMustExist("node1"), false);

      expect(onSetStateFromStorage).toHaveBeenLastCalledWith(
        JSON.stringify({ open_nodes: [124], selected_node: [] }),
      );
    });

    it("does nothing when a node that is not a folder is opened or closed", async () => {
      const { onSetStateFromStorage, tree } = createTreeWithStateSpy({
        autoOpen: true,
      });
      const onClose = vi.fn();
      htmlElement.addEventListener("tree.close", onClose);
      const child1 = tree.getNodeByNameMustExist("child1");

      await tree.openNode(child1, false);
      await tree.closeNode(child1, false);

      expect(onSetStateFromStorage).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("the tab stop", () => {
    it("keeps the first node reachable with Tab when it is selected", () => {
      const tree = createTreeElement();

      tree.selectNode(tree.getNodeByNameMustExist("node1"));

      expect(getTreeItem("node1")).toHaveAttribute("tabindex", "0");
    });

    it("moves from the first node to a node that is added to the selection", () => {
      const tree = createTreeElement();

      tree.addToSelection(tree.getNodeByNameMustExist("node2"));

      expect(getTreeItem("node1")).toHaveAttribute("tabindex", "-1");
      expect(getTreeItem("node2")).toHaveAttribute("tabindex", "0");
    });

    describe("with multiSelect", () => {
      it("moves to the node that gets the focus", () => {
        createTreeElement({ multiSelect: true });

        getTreeItem("node2").focus();

        expect(getTreeItem("node1")).toHaveAttribute("tabindex", "-1");
        expect(getTreeItem("node2")).toHaveAttribute("tabindex", "0");
      });

      it("stays on the last focused node when something else in the tree gets the focus", () => {
        createTreeElement({ multiSelect: true });
        getTreeItem("node2").focus();

        const button = document.createElement("button");
        htmlElement.append(button);
        button.focus();

        expect(getTreeItem("node1")).toHaveAttribute("tabindex", "-1");
        expect(getTreeItem("node2")).toHaveAttribute("tabindex", "0");
      });

      it("follows the focus after multiSelect is turned on with setOption", () => {
        const tree = createTreeElement();
        tree.setOption("multiSelect", true);

        getTreeItem("node2").focus();

        expect(getTreeItem("node2")).toHaveAttribute("tabindex", "0");
      });

      it("moves the focus to a clicked node, also when the click doesn't focus it", () => {
        createTreeElement({ multiSelect: true });

        // A click that doesn't move the focus by itself, like in Safari
        getTreeTitle(getTreeItem("node2")).dispatchEvent(
          new MouseEvent("click", { bubbles: true }),
        );

        expect(getTreeItem("node2")).toHaveFocus();
      });
    });
  });

  describe("the focus when nodes are rendered again", () => {
    it("doesn't take the focus when the selected node is rendered again while the tree is not focused", () => {
      const tree = createTreeElement();
      const node1 = tree.getNodeByNameMustExist("node1");
      tree.selectNode(node1, { mustSetFocus: false });

      const button = document.createElement("button");
      document.body.append(button);
      button.focus();

      tree.updateNode(node1, "renamed");

      expect(button).toHaveFocus();
    });

    it("doesn't move the focus when a node outside the selected subtree is rendered again", () => {
      const tree = createTreeElement({ autoOpen: true });
      tree.selectNode(tree.getNodeByNameMustExist("child1"));
      getTreeItem("node3").focus();

      tree.updateNode(tree.getNodeByNameMustExist("child2"), "renamed");

      expect(getTreeItem("node3")).toHaveFocus();
    });
  });

  describe("deinit", () => {
    it("removes the keyboard listener from the document", () => {
      const tree = createTreeElement();
      const removeEventListener = vi.spyOn(document, "removeEventListener");

      tree.deinit();

      expect(removeEventListener).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function),
      );
    });
  });

  describe("tree.init", () => {
    it("is dispatched during the construction, and only once", () => {
      const onInit = vi.fn();
      htmlElement.addEventListener("tree.init", onInit);

      const tree = createTreeElement({ autoOpen: true });

      expect(onInit).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ type: "tree.init" }),
      );

      tree.loadData(exampleData);

      expect(onInit).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ type: "tree.init" }),
      );
    });
  });

  describe("loadData", () => {
    it("clears the selection of the previous data", () => {
      const tree = createTreeElement();
      tree.selectNode(tree.getNodeByNameMustExist("node1"));

      tree.loadData(exampleData);

      expect(tree.getSelectedNodes()).toBeEmpty();
    });

    it("recomputes the drop targets during a drag", async () => {
      const tree = createTreeElement({ dragAndDrop: true, startDndDelay: 0 });
      const refresh = vi.spyOn(DragAndDropHandler.prototype, "refresh");
      const user = userEvent.setup();
      const treeItem = getTreeItem("node1");

      await user.pointer([
        { keys: "[MouseLeft>]", target: treeItem },
        { coords: { x: 5, y: 5 }, target: treeItem },
      ]);
      refresh.mockClear();

      tree.loadData(exampleData, tree.getNodeByNameMustExist("node2"));

      expect(refresh).toHaveBeenCalledExactlyOnceWith();

      await user.pointer({ keys: "[/MouseLeft]", target: treeItem });
    });
  });

  describe("refreshHitAreas", () => {
    it("recomputes the drop targets", () => {
      const tree = createTreeElement({ dragAndDrop: true });
      const refresh = vi.spyOn(DragAndDropHandler.prototype, "refresh");

      tree.refreshHitAreas();

      expect(refresh).toHaveBeenCalledExactlyOnceWith();
    });
  });

  describe("dragAndDrop false", () => {
    it("doesn't prevent the default of a mousedown, so text can be selected", () => {
      createTreeElement();

      const event = new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
      });
      getTreeTitle(getTreeItem("node1")).dispatchEvent(event);

      expect(event.defaultPrevented).toBeFalse();
    });
  });

  describe("adding a sibling to the root node", () => {
    it.each(["addNodeAfter", "addNodeBefore"] as const)(
      "%s returns null and doesn't render the tree",
      (method) => {
        const tree = createTreeElement();
        const onRefresh = vi.fn();
        htmlElement.addEventListener("tree.refresh", onRefresh);

        expect(tree[method]({ name: "new" }, tree.getTree())).toBeNull();
        expect(onRefresh).not.toHaveBeenCalled();
      },
    );
  });

  describe("opening the parents of a node", () => {
    it("opens the parents without animation when a node is opened without animation", async () => {
      const tree = createTreeElement({ autoOpen: false });
      const animate = vi.spyOn(HTMLElement.prototype, "animate");

      await tree.openNode(tree.getNodeByNameMustExist("node3"), false);

      expect(tree.getNodeByNameMustExist("node2").is_open).toBeTrue();
      expect(animate).not.toHaveBeenCalled();
    });

    it("opens the parents of an empty folder", async () => {
      const tree = createTreeElement({
        autoOpen: false,
        data: [{ children: [{ children: [], name: "empty" }], name: "parent" }],
      });

      await tree.openNode(tree.getNodeByNameMustExist("empty"), false);

      expect(tree.getNodeByNameMustExist("parent").is_open).toBeTrue();
      expect(screen.getByRole("treeitem", { name: "empty" })).toBeVisible();
    });

    it("opens the parents without animation when a node is added to the selection", () => {
      const tree = createTreeElement({ autoOpen: false });
      const animate = vi.spyOn(HTMLElement.prototype, "animate");

      tree.addToSelection(tree.getNodeByNameMustExist("child1"));

      expect(tree.getNodeByNameMustExist("node1").is_open).toBeTrue();
      expect(animate).not.toHaveBeenCalled();
    });
  });

  describe("scrollToNode", () => {
    it("scrolls the container to the node", () => {
      htmlElement.style.overflowY = "auto";
      const tree = createTreeElement();

      mockElementBoundingClientRect(htmlElement, { height: 100, y: 50 });
      mockElementBoundingClientRect(getTreeItem("node2"), {
        height: 20,
        y: 130,
      });

      tree.scrollToNode(tree.getNodeByNameMustExist("node2"));

      expect(htmlElement.scrollTop).toBe(80);
    });
  });

  describe("autoOpen", () => {
    const deepData: NodeData[] = [
      {
        children: [
          {
            children: [{ children: [{ name: "d" }], name: "c" }],
            name: "b",
          },
        ],
        name: "a",
      },
    ];

    it("opens the folders at all levels with autoOpen true, and no leaves", () => {
      const tree = createTreeElement({ autoOpen: true, data: deepData });

      expect(tree.getNodeByNameMustExist("c").is_open).toBeTrue();
      expect(tree.getNodeByNameMustExist("d").is_open).not.toBeTrue();
    });

    describe("with folders that are loaded on demand", () => {
      const requests: string[] = [];

      beforeEach(() => {
        requests.length = 0;

        server.use(
          http.get("/tree/", async ({ request }) => {
            const nodeId = new URL(request.url).searchParams.get("node");
            requests.push(nodeId ?? "");

            if (nodeId === "1") {
              return HttpResponse.json([
                {
                  children: [
                    {
                      children: [{ id: 4, name: "leaf" }],
                      id: 3,
                      name: "grandchild",
                    },
                  ],
                  id: 2,
                  name: "child",
                },
              ]);
            }

            // Respond later, so the first folder is loaded before this one
            await delay(50);
            return HttpResponse.json([{ id: 6, name: "other-child" }]);
          }),
        );
      });

      const onDemandData: NodeData[] = [
        { id: 1, load_on_demand: true, name: "folder" },
        { id: 5, load_on_demand: true, name: "other-folder" },
      ];

      it("loads and opens them, and opens their children, without animation", async () => {
        const animate = vi.spyOn(HTMLElement.prototype, "animate");
        const tree = createTreeElement({
          autoOpen: true,
          data: onDemandData,
          dataUrl: "/tree/",
        });

        await screen.findByRole("treeitem", { name: "leaf" });
        await screen.findByRole("treeitem", { name: "other-child" });

        expect(tree.getNodeByNameMustExist("grandchild").is_open).toBeTrue();
        expect(animate).not.toHaveBeenCalled();
      });

      it("loads each folder only once", async () => {
        createTreeElement({
          autoOpen: true,
          data: onDemandData,
          dataUrl: "/tree/",
        });

        await screen.findByRole("treeitem", { name: "other-child" });

        expect(requests).toIncludeSameMembers(["1", "5"]);
      });

      it("opens the folders up to the autoOpen level", async () => {
        const tree = createTreeElement({
          autoOpen: 1,
          data: onDemandData,
          dataUrl: "/tree/",
        });

        // other-folder is loaded last, after the children of folder are opened
        await screen.findByRole("treeitem", { name: "other-child" });

        expect(tree.getNodeByNameMustExist("child").is_open).toBeTrue();
        expect(
          tree.getNodeByNameMustExist("grandchild").is_open,
        ).not.toBeTrue();
      });
    });
  });

  describe("the data url", () => {
    it("asks for the node that the saved state selects", async () => {
      const requestUrls: string[] = [];
      server.use(
        http.get("/tree/", ({ request }) => {
          requestUrls.push(request.url);
          return HttpResponse.json(exampleData);
        }),
      );
      localStorage.setItem("tree", '{"selected_node":[126]}');

      createTreeElement({
        data: undefined,
        dataUrl: "/tree/",
        saveState: true,
      });

      await screen.findByRole("treeitem", { name: "node1" });

      expect(
        new URL(requestUrls[0] ?? "").searchParams.get("selected_node"),
      ).toBe("126");
    });
  });
});
