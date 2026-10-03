import type { TreeElementOptions } from "treeElement/options";

import { screen, waitFor } from "@testing-library/dom";
import { userEvent } from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import TreeElement from "treeElement";

import { getTreeButton } from "../support/queries";

describe("load on demand", () => {
  const server = setupServer();

  let htmlElement: HTMLElement;
  let treeElement: TreeElement | undefined;

  const initialData = [
    {
      id: 1,
      load_on_demand: true,
      name: "parent-node",
    },
  ];

  const createTreeElement = (options: Partial<TreeElementOptions> = {}) => {
    treeElement = new TreeElement({
      data: initialData,
      dataUrl: "/tree/",
      htmlElement,
      saveState: true,
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

  beforeEach(() => {
    server.use(
      http.get("/tree/", ({ request }) => {
        const url = new URL(request.url);
        const parentId = url.searchParams.get("node");

        return parentId === "1"
          ? HttpResponse.json([{ id: 2, name: "loaded-on-demand" }])
          : new HttpResponse(null, { status: 400 });
      }),
    );
  });

  afterEach(() => {
    server.resetHandlers();

    treeElement?.deinit();
    treeElement = undefined;

    document.body.replaceChildren();
    localStorage.clear();
  });

  afterAll(() => {
    server.close();
  });

  it("creates a parent node without children", () => {
    createTreeElement({ autoOpen: false });

    expect(htmlElement).toHaveTreeStructure([
      expect.objectContaining({
        children: [],
        name: "parent-node",
        open: false,
      }),
    ]);
  });

  describe("when the node is opened", () => {
    it("loads the subtree", async () => {
      createTreeElement({ autoOpen: false });

      const treeItem = screen.getByRole("treeitem", { name: "parent-node" });
      const button = getTreeButton(treeItem);
      await userEvent.click(button);

      await waitFor(() => {
        expect(htmlElement).toHaveTreeStructure([
          expect.objectContaining({
            children: [
              expect.objectContaining({
                name: "loaded-on-demand",
              }),
            ],
            name: "parent-node",
            open: true,
          }),
        ]);
      });

      await screen.findByRole("treeitem", { name: "loaded-on-demand" });
    });

    it("keeps the node selected when the node is selected", async () => {
      const tree = createTreeElement({ autoOpen: false });

      const node = tree.getNodeByNameMustExist("parent-node");
      tree.selectNode(node);

      const treeItem = screen.getByRole("treeitem", { name: "parent-node" });

      expect(treeItem).toBeAriaSelected();
      expect(treeItem).toHaveFocus();

      const button = getTreeButton(treeItem);
      await userEvent.click(button);

      await screen.findByRole("treeitem", { name: "loaded-on-demand" });

      expect(treeItem).toBeAriaSelected();
    });

    it("doesn't select the node when the node is not selected", async () => {
      createTreeElement({ autoOpen: false });

      const treeItem = screen.getByRole("treeitem", { name: "parent-node" });

      expect(treeItem).not.toBeAriaSelected();

      const button = getTreeButton(treeItem);
      await userEvent.click(button);

      await screen.findByRole("treeitem", { name: "loaded-on-demand" });

      expect(treeItem).not.toBeAriaSelected();
    });

    it("keeps the node selected and not focused when the node is selected and doesn't have the focus", async () => {
      const tree = createTreeElement({ autoOpen: false });

      const node = tree.getNodeByNameMustExist("parent-node");
      tree.selectNode(node);
      (document.activeElement as HTMLElement).blur(); // eslint-disable-line testing-library/no-node-access

      const treeItem = screen.getByRole("treeitem", { name: "parent-node" });

      expect(treeItem).toBeAriaSelected();
      expect(treeItem).not.toHaveFocus();

      const button = getTreeButton(treeItem);
      await userEvent.click(button);

      await screen.findByRole("treeitem", { name: "loaded-on-demand" });

      expect(treeItem).toBeAriaSelected();
      expect(treeItem).not.toHaveFocus();
    });
  });

  it("loads the node on demand with autoOpen true", async () => {
    createTreeElement({ autoOpen: true });

    await screen.findByRole("treeitem", { name: "loaded-on-demand" });

    await waitFor(() => {
      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({
          children: [
            expect.objectContaining({
              name: "loaded-on-demand",
            }),
          ],
          name: "parent-node",
          open: true,
        }),
      ]);
    });
  });

  it("opens the node and loads its children on demand with a saved state with an opened node", async () => {
    localStorage.setItem("tree", '{"open_nodes":[1],"selected_node":[]}');

    createTreeElement({ autoOpen: false });

    await screen.findByRole("treeitem", { name: "loaded-on-demand" });

    await waitFor(() => {
      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({
          children: [
            expect.objectContaining({
              name: "loaded-on-demand",
            }),
          ],
          name: "parent-node",
          open: true,
        }),
      ]);
    });
  });

  it("opens the node with openNode and loads its children on demand", async () => {
    const tree = createTreeElement({ autoOpen: false });

    const node = tree.getNodeByNameMustExist("parent-node");
    await tree.openNode(node, false);

    await screen.findByRole("treeitem", { name: "loaded-on-demand" });

    await waitFor(() => {
      expect(htmlElement).toHaveTreeStructure([
        expect.objectContaining({
          children: [
            expect.objectContaining({
              name: "loaded-on-demand",
            }),
          ],
          name: "parent-node",
          open: true,
        }),
      ]);
    });
  });
});
