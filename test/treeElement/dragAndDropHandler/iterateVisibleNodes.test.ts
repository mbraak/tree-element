import iterateVisibleNodes from "treeElement/dragAndDropHandler/iterateVisibleNodes";
import { Node } from "treeElement/node";
import { vi } from "vitest";

// An element with an offsetParent counts as visible
const visibleElement = () => ({ offsetParent: {} }) as HTMLElement;

const createHandlers = () => ({
  handleAfterOpenFolder: vi.fn(),
  handleClosedFolder: vi.fn(),
  handleFirstNode: vi.fn(),
  handleNode: vi.fn(),
  handleOpenFolder: vi.fn(() => true),
});

describe("iterateVisibleNodes", () => {
  it("doesn't visit the children of a closed folder, even when they still have an element", () => {
    const tree = new Node().loadFromData([
      { children: [{ name: "child" }], name: "folder" },
    ]);
    const folder = tree.getNodeByNameMustExist("folder");
    const child = tree.getNodeByNameMustExist("child");

    // The child was rendered while the folder was open
    folder.element = visibleElement();
    child.element = visibleElement();

    const handlers = createHandlers();
    iterateVisibleNodes(tree, handlers);

    expect(handlers.handleClosedFolder).toHaveBeenCalledExactlyOnceWith(
      folder,
      null,
      folder.element,
    );
    expect(handlers.handleNode).not.toHaveBeenCalled();
  });

  it("calls handleAfterOpenFolder only for an open folder that is visible", () => {
    const tree = new Node().loadFromData([
      {
        children: [{ name: "child" }],
        is_open: true,
        name: "hidden-folder",
      },
      { children: [{ name: "child2" }], is_open: true, name: "folder" },
    ]);
    const folder = tree.getNodeByNameMustExist("folder");

    folder.element = visibleElement();
    tree.getNodeByNameMustExist("child2").element = visibleElement();

    const handlers = createHandlers();
    iterateVisibleNodes(tree, handlers);

    expect(handlers.handleAfterOpenFolder).toHaveBeenCalledExactlyOnceWith(
      folder,
      null,
    );
  });
});
