import type { TreeEventName, TreeEvents } from "treeElement/events";
import type { TreeElementOptions } from "treeElement/options";

import { screen, waitFor } from "@testing-library/dom";
import { userEvent } from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import TreeElement from "treeElement";
import { vi } from "vitest";

import exampleData from "../support/exampleData";

describe("events", () => {
  let htmlElement: HTMLElement;
  let treeElement: TreeElement | undefined;

  const createTreeElement = (options: Partial<TreeElementOptions> = {}) => {
    treeElement = new TreeElement({ htmlElement, ...options });

    return treeElement;
  };

  // Listen to a tree event; the listener is called with the values of the event.
  const listenToEvent = <Name extends TreeEventName>(eventName: Name) => {
    const listener = vi.fn<(detail: TreeEvents[Name]) => void>();

    htmlElement.addEventListener(eventName, (e) => {
      // The detail of a generic event name is the union of all details.
      listener(e.detail as TreeEvents[Name]);
    });

    return listener;
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

  describe("tree.click", () => {
    it("fires tree.click", async () => {
      const tree = createTreeElement({ data: exampleData });

      const onClick = listenToEvent("tree.click");

      await userEvent.click(screen.getByRole("treeitem", { name: "node1" }));

      const node1 = tree.getNodeByNameMustExist("node1");

      expect(onClick).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ node: node1 }),
      );
    });

    it("fires tree.click with the original mouse event", async () => {
      createTreeElement({ data: exampleData });

      let originalEvent: MouseEvent | undefined;

      htmlElement.addEventListener("tree.click", (e) => {
        originalEvent = e.detail.originalEvent;
      });

      const treeItem = screen.getByRole("treeitem", { name: "node1" });

      await userEvent.click(treeItem);

      expect(originalEvent).toBeInstanceOf(MouseEvent);
      expect(originalEvent?.type).toBe("click");
      expect(treeItem).toContainElement(originalEvent?.target as HTMLElement);
    });

    it("doesn't select the node when the event is cancelled", async () => {
      const tree = createTreeElement({ data: exampleData });

      htmlElement.addEventListener("tree.click", (e) => {
        e.preventDefault();
      });

      await userEvent.click(screen.getByRole("treeitem", { name: "node1" }));

      expect(tree.getSelectedNode()).toBeFalse();
    });
  });

  describe("tree.contextmenu", () => {
    it("fires tree.contextmenu", async () => {
      const tree = createTreeElement({ data: exampleData });

      const onContextMenu = listenToEvent("tree.contextmenu");

      await userEvent.pointer({
        keys: "[MouseRight]",
        target: screen.getByRole("treeitem", { name: "node1" }),
      });

      const node1 = tree.getNodeByNameMustExist("node1");

      expect(onContextMenu).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ node: node1 }),
      );
    });

    it("fires tree.contextmenu with the original mouse event", async () => {
      createTreeElement({ data: exampleData });

      let originalEvent: MouseEvent | undefined;

      htmlElement.addEventListener("tree.contextmenu", (e) => {
        originalEvent = e.detail.originalEvent;
      });

      const treeItem = screen.getByRole("treeitem", { name: "node1" });

      await userEvent.pointer({ keys: "[MouseRight]", target: treeItem });

      expect(originalEvent).toBeInstanceOf(MouseEvent);
      expect(originalEvent?.type).toBe("contextmenu");
      expect(treeItem).toContainElement(originalEvent?.target as HTMLElement);
    });
  });

  describe("tree.dblclick", () => {
    it("fires tree.dblclick", async () => {
      const tree = createTreeElement({ data: exampleData });

      const onDoubleClick = listenToEvent("tree.dblclick");

      await userEvent.dblClick(
        screen.getByRole("treeitem", { name: "node1" }),
      );

      const node1 = tree.getNodeByNameMustExist("node1");

      expect(onDoubleClick).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ node: node1 }),
      );
    });

    it("fires tree.dblclick with the original mouse event", async () => {
      createTreeElement({ data: exampleData });

      let originalEvent: MouseEvent | undefined;

      htmlElement.addEventListener("tree.dblclick", (e) => {
        originalEvent = e.detail.originalEvent;
      });

      const treeItem = screen.getByRole("treeitem", { name: "node1" });

      await userEvent.dblClick(treeItem);

      expect(originalEvent).toBeInstanceOf(MouseEvent);
      expect(originalEvent?.type).toBe("dblclick");
      expect(treeItem).toContainElement(originalEvent?.target as HTMLElement);
    });
  });

  describe("tree.init", () => {
    it("is called with json data", () => {
      const onInit = listenToEvent("tree.init");

      createTreeElement({ data: exampleData });

      expect(onInit).toHaveBeenCalledExactlyOnceWith(null);
    });

    describe("with data loaded from an url", () => {
      const server = setupServer(
        http.get("/tree/", () => HttpResponse.json(exampleData)),
      );

      beforeEach(() => {
        server.listen();
      });

      afterAll(() => {
        server.close();
      });

      it("is called", async () => {
        const onInit = listenToEvent("tree.init");

        createTreeElement({ dataUrl: "/tree/" });

        await waitFor(() => {
          expect(onInit).toHaveBeenCalledExactlyOnceWith(null);
        });
      });
    });
  });

  describe("tree.set_data", () => {
    it("fires tree.load_data when the tree is initialized with data", () => {
      const onLoadData = listenToEvent("tree.set_data");

      createTreeElement({ data: exampleData });

      expect(onLoadData).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ node: undefined, treeData: exampleData }),
      );
    });

    it("fires tree.load_data with the parent node when data is loaded in a node", () => {
      const tree = createTreeElement({ data: exampleData });

      const onLoadData = listenToEvent("tree.set_data");

      const node1 = tree.getNodeByNameMustExist("node1");
      const childData = [{ id: 200, name: "child4" }];

      tree.loadData(childData, node1);

      expect(onLoadData).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ node: node1, treeData: childData }),
      );
    });
  });

  describe("tree.select", () => {
    it("fires tree.select", async () => {
      const tree = createTreeElement({ data: exampleData });

      const onSelect = listenToEvent("tree.select");

      await userEvent.click(screen.getByRole("treeitem", { name: "node1" }));

      const node1 = tree.getNodeByNameMustExist("node1");

      expect(onSelect).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          deselectedNode: null,
          node: node1,
        }),
      );
    });

    it("does not fire tree.select when the node is deselected", async () => {
      const tree = createTreeElement({ data: exampleData });

      tree.selectNode(tree.getNodeByNameMustExist("node1"));

      const onSelect = listenToEvent("tree.select");

      await userEvent.click(screen.getByRole("treeitem", { name: "node1" }));

      expect(onSelect).not.toHaveBeenCalled();
    });

    it("fires tree.select with the node that was deselected", async () => {
      const tree = createTreeElement({ data: exampleData });

      const node1 = tree.getNodeByNameMustExist("node1");
      tree.selectNode(node1);

      const selections: string[] = [];

      htmlElement.addEventListener("tree.select", (e) => {
        selections.push(
          `${e.detail.node.name} instead of ${e.detail.deselectedNode?.name ?? "-"}`,
        );
      });

      await userEvent.click(screen.getByRole("treeitem", { name: "node2" }));

      expect(selections).toStrictEqual(["node2 instead of node1"]);
    });
  });

  describe("tree.deselect", () => {
    it("fires tree.deselect when the selected node is clicked again", async () => {
      const tree = createTreeElement({ data: exampleData });

      const node1 = tree.getNodeByNameMustExist("node1");
      tree.selectNode(node1);

      const onDeselect = listenToEvent("tree.deselect");

      await userEvent.click(screen.getByRole("treeitem", { name: "node1" }));

      expect(onDeselect).toHaveBeenCalledExactlyOnceWith({ node: node1 });
    });

    it("fires tree.deselect when selectNode toggles the node off", () => {
      const tree = createTreeElement({ data: exampleData });

      const node1 = tree.getNodeByNameMustExist("node1");
      tree.selectNode(node1);

      const onDeselect = listenToEvent("tree.deselect");

      tree.selectNode(node1);

      expect(onDeselect).toHaveBeenCalledExactlyOnceWith({ node: node1 });
    });

    it("does not fire tree.deselect when mustToggle is false", () => {
      const tree = createTreeElement({ data: exampleData });

      const node1 = tree.getNodeByNameMustExist("node1");
      tree.selectNode(node1);

      const onDeselect = listenToEvent("tree.deselect");

      tree.selectNode(node1, { mustToggle: false });

      expect(onDeselect).not.toHaveBeenCalled();
    });

    it("does not fire tree.deselect when another node is selected", async () => {
      const tree = createTreeElement({ data: exampleData });

      tree.selectNode(tree.getNodeByNameMustExist("node1"));

      const onDeselect = listenToEvent("tree.deselect");

      await userEvent.click(screen.getByRole("treeitem", { name: "node2" }));

      expect(onDeselect).not.toHaveBeenCalled();
    });

    it("fires tree.deselect instead of tree.select", async () => {
      const tree = createTreeElement({ data: exampleData });

      tree.selectNode(tree.getNodeByNameMustExist("node1"));

      const names: string[] = [];
      for (const eventName of ["tree.deselect", "tree.select"] as const) {
        htmlElement.addEventListener(eventName, () => {
          names.push(eventName);
        });
      }

      await userEvent.click(screen.getByRole("treeitem", { name: "node1" }));

      expect(names).toStrictEqual(["tree.deselect"]);
    });
  });

  describe("tree.open and tree.close", () => {
    it("fires tree.open when a node is opened", async () => {
      const tree = createTreeElement({ autoOpen: false, data: exampleData });

      const onOpen = listenToEvent("tree.open");

      const node1 = tree.getNodeByNameMustExist("node1");
      await tree.openNode(node1, false);

      expect(onOpen).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ node: node1 }),
      );
    });

    it("fires tree.close when a node is closed", () => {
      const tree = createTreeElement({ autoOpen: true, data: exampleData });

      const onClose = listenToEvent("tree.close");

      const node1 = tree.getNodeByNameMustExist("node1");
      tree.closeNode(node1, false);

      expect(onClose).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ node: node1 }),
      );
    });
  });

  describe("tree.refresh", () => {
    it("fires tree.refresh when the tree is refreshed", () => {
      const tree = createTreeElement({ data: exampleData });

      const onRefresh = listenToEvent("tree.refresh");

      tree.refresh();

      expect(onRefresh).toHaveBeenCalledExactlyOnceWith(null);
    });
  });

  describe("tree.loading_data", () => {
    const server = setupServer(
      http.get("/tree/", () => HttpResponse.json(exampleData)),
    );

    beforeAll(() => {
      server.listen();
    });

    afterAll(() => {
      server.close();
    });

    it("fires tree.loading_data and tree.loaded_data when the data is loading from an url", async () => {
      const onLoading = listenToEvent("tree.loading_data");
      const onLoaded = listenToEvent("tree.loaded_data");

      createTreeElement({ dataUrl: "/tree/" });

      await waitFor(() => {
        expect(onLoading).toHaveBeenCalledExactlyOnceWith(
          expect.objectContaining({
            element: htmlElement,
          }),
        );
      });

      await waitFor(() => {
        expect(onLoaded).toHaveBeenCalledExactlyOnceWith(
          expect.objectContaining({
            element: htmlElement,
          }),
        );
      });
    });

    it("doesn't fire tree.loaded_data when deinit is called while the data is loading", async () => {
      const onLoading = listenToEvent("tree.loading_data");
      const onLoaded = listenToEvent("tree.loaded_data");

      const tree = createTreeElement({ dataUrl: "/tree/" });

      expect(onLoading).toHaveBeenCalledExactlyOnceWith({
        element: htmlElement,
        node: undefined
      });

      tree.deinit();

      // Wait for the pending request to settle.
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(onLoaded).not.toHaveBeenCalled();
    });
  });

  describe("tree.load_failed", () => {
    const server = setupServer();

    beforeAll(() => {
      server.listen();
    });

    afterEach(() => {
      server.resetHandlers();
    });

    afterAll(() => {
      server.close();
    });

    it("fires tree.load_failed with the response when the request returns an error status", async () => {
      server.use(
        http.get("/tree/", () => new HttpResponse("", { status: 500 })),
      );

      const onLoaded = listenToEvent("tree.loaded_data");
      const onLoadFailed = listenToEvent("tree.load_failed");

      createTreeElement({ dataUrl: "/tree/" });

      await waitFor(() => {
        expect(onLoadFailed).toHaveBeenCalledExactlyOnceWith({
          response: expect.objectContaining({ status: 500 }) as Response,
        });
      });

      expect(onLoaded).toHaveBeenCalledExactlyOnceWith({
        element: htmlElement,
        node: undefined,
      });
    });

    it("fires tree.load_failed with the error when the request fails with a network error", async () => {
      server.use(http.get("/tree/", () => HttpResponse.error()));

      const onLoaded = listenToEvent("tree.loaded_data");
      const onLoadFailed = listenToEvent("tree.load_failed");

      createTreeElement({ dataUrl: "/tree/" });

      await waitFor(() => {
        expect(onLoadFailed).toHaveBeenCalledExactlyOnceWith({
          error: expect.objectContaining({
            message: "Failed to fetch",
            name: "TypeError",
          }) as TypeError,
        });
      });

      expect(onLoaded).toHaveBeenCalledExactlyOnceWith({
        element: htmlElement,
        node: undefined,
      });
    });
  });
});
