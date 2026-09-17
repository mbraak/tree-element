import { screen, waitFor } from "@testing-library/dom";
import { userEvent } from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import fs from "node:fs/promises";
import path from "node:path";
import TreeElement from "treeElement";

import type { DemoNodeData } from "../../docs/.vitepress/theme/exampleData";

import { demos, getDemoOptions } from "../../docs/.vitepress/theme/demos";
import defaultClassNames from "../support/classNames";
import { getTreeButton } from "../support/queries";

// The demos run inside vitepress; here they run in a plain test, so withBase
// becomes the identity.
vi.mock(import("vitepress"), () => ({
  withBase: (url: string) => url,
}));

/* Every demo that the documentation embeds through <TreeDemo demo="...">,
 * instantiated against the real widget. When an option or method that the
 * docs rely on is renamed, these tests fail instead of the docs breaking
 * silently.
 */
describe("docs demos", () => {
  const server = setupServer();

  const fixturesDirectory = path.join(
    import.meta.dirname,
    "../../docs/public/demo",
  );

  let htmlElement: HTMLElement;
  let treeElement: TreeElement | undefined;

  const createTree = (demo: string): TreeElement => {
    treeElement = new TreeElement({
      htmlElement,
      ...getDemoOptions(demo),
    });

    return treeElement;
  };

  beforeAll(() => {
    server.listen();
  });

  beforeEach(() => {
    // The loadOnDemand demo fetches the static json files under docs/public/demo/.
    server.use(
      http.get("/demo/:file", async ({ params }) => {
        const file = path.basename(params.file as string);
        const data = await fs.readFile(
          path.join(fixturesDirectory, file),
          "utf8",
        );

        return HttpResponse.json(JSON.parse(data) as DemoNodeData[]);
      }),
    );

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

  it.each(Object.keys(demos))("renders the %s demo", async (demo) => {
    createTree(demo);

    await waitFor(() => {
      expect(screen.getAllByRole("treeitem").length).toBeGreaterThan(0);
    });
  });

  it("opens the first level and keeps deeper folders closed in the basic demo", () => {
    createTree("basic");

    expect(
      screen.getByRole("treeitem", { name: "Saurischia" }),
    ).toBeAriaExpanded();
    expect(
      screen.getByRole("treeitem", { name: "Theropods" }),
    ).not.toBeAriaExpanded();
  });

  it("puts the toggler button on the right in the buttonRight demo", () => {
    createTree("buttonRight");

    const treeItem = screen.getByRole("treeitem", {
      name: "Thyreophorans",
    });

    expect(getTreeButton(treeItem)).toHaveClass(defaultClassNames.togglerRight);
  });

  it("enables drag and drop in the dragAndDrop demo", () => {
    createTree("dragAndDrop");

    expect(screen.getByRole("tree")).toHaveClass(defaultClassNames.dnd);
  });

  it("enables drag and drop in the dragIntoFoldersOnly demo", () => {
    createTree("dragIntoFoldersOnly");

    expect(screen.getByRole("tree")).toHaveClass(defaultClassNames.dnd);
  });

  it("uses the custom icons in the icons demo", async () => {
    createTree("icons");

    const treeItem = screen.getByRole("treeitem", {
      name: "Thyreophorans",
    });
    const button = getTreeButton(treeItem);

    expect(button).toHaveTextContent("−");

    await userEvent.click(button);

    await waitFor(() => {
      expect(getTreeButton(treeItem)).toHaveTextContent("+");
    });
  });

  it("fetches subtrees from the fixture files in the loadOnDemand demo", async () => {
    createTree("loadOnDemand");

    const treeItem = await screen.findByRole("treeitem", {
      name: "Saurischia",
    });
    await userEvent.click(getTreeButton(treeItem));

    const theropods = await screen.findByRole("treeitem", {
      name: "Theropods",
    });

    expect(theropods).toBeInTheDocument();
  });

  it("only allows selecting folders in the onlyFoldersSelectable demo", async () => {
    createTree("onlyFoldersSelectable");

    const leaf = screen.getByRole("treeitem", { name: "Ceratopsians" });
    await userEvent.click(leaf);

    expect(leaf).not.toBeAriaSelected();

    const folder = screen.getByRole("treeitem", {
      name: "Thyreophorans",
    });
    await userEvent.click(folder);

    expect(folder).toBeAriaSelected();
  });

  it("mirrors the tree in the rtl demo", () => {
    createTree("rtl");

    expect(screen.getByRole("tree")).toHaveClass(defaultClassNames.rtl);
  });

  it("saves the state under its own key in the saveState demo", () => {
    const tree = createTree("saveState");

    tree.selectNode(tree.getNodeByNameMustExist("Saurischia"));

    expect(localStorage.getItem("tree-element-docs-demo")).toContain(
      '"selected_node":[1]',
    );
  });

  it("renders a node with an empty children array as a folder in the showEmptyFolder demo", () => {
    createTree("showEmptyFolder");

    expect(htmlElement).toHaveTreeStructure([
      {
        children: [],
        name: "empty folder",
        nodeType: "folder",
        open: false,
        selected: false,
      },
      { name: "leaf", nodeType: "child", selected: false },
    ]);
  });

  it("throws for an unknown demo name", () => {
    expect(() => getDemoOptions("no-such-demo")).toThrow(
      'Unknown demo "no-such-demo"',
    );
  });
});
