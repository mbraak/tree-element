import type {
  CloseNode,
  FocusNode,
  GetActiveNode,
  GetFocusedNode,
  GetSelectedNode,
  GetTree,
  OpenNode,
  SelectNode,
  ToggleNodeInSelection,
  TriggerEvent,
} from "treeElement/methodTypes";

import KeyHandler from "treeElement/keyHandler";
import { Node } from "treeElement/node";
import { vi } from "vitest";

import exampleData from "../support/exampleData";

interface CreateKeyHandlerParams {
  closeNode?: CloseNode;
  focusNode?: FocusNode;
  getActiveNode?: GetActiveNode;
  getFocusedNode?: GetFocusedNode;
  getSelectedNode?: GetSelectedNode;
  getTree?: GetTree;
  keyboardSupport?: boolean;
  multiSelect?: boolean;
  openNode?: OpenNode;
  selectNode?: SelectNode;
  toggleNodeInSelection?: ToggleNodeInSelection;
  triggerEvent?: TriggerEvent;
}

const createKeyHandler = ({
  closeNode = vi.fn(),
  focusNode = vi.fn(),
  getActiveNode = vi.fn(() => null),
  getFocusedNode = vi.fn(() => new Node({ name: "focused" })),
  getSelectedNode = vi.fn(() => null),
  getTree = vi.fn(() => null),
  keyboardSupport = true,
  multiSelect = false,
  openNode = vi.fn(() => Promise.resolve()),
  selectNode = vi.fn(),
  toggleNodeInSelection = vi.fn(),
  triggerEvent = vi.fn(() => true),
}: CreateKeyHandlerParams = {}) =>
  new KeyHandler({
    closeNode,
    focusNode,
    getActiveNode,
    getFocusedNode,
    getSelectedNode,
    getTree,
    keyboardSupport,
    multiSelect,
    openNode,
    selectNode,
    toggleNodeInSelection,
    triggerEvent,
  });

const pressKey = (key: string) => {
  const event = new KeyboardEvent("keydown", { cancelable: true, key });
  document.dispatchEvent(event);

  return event;
};

describe("KeyHandler", () => {
  let tree: Node;

  beforeEach(() => {
    tree = new Node().loadFromData(exampleData);
  });

  describe("constructor", () => {
    it("handles keydown events when keyboardSupport is true", () => {
      const node1 = tree.getNodeByNameMustExist("node1");
      const selectNode = vi.fn();

      const keyHandler = createKeyHandler({
        getSelectedNode: () => node1,
        selectNode,
      });

      pressKey("ArrowDown");

      expect(selectNode).toHaveBeenCalledWith(
        tree.getNodeByNameMustExist("node2"),
      );

      keyHandler.deinit();
    });

    it("ignores keydown events when keyboardSupport is false", () => {
      const node1 = tree.getNodeByNameMustExist("node1");
      const selectNode = vi.fn();

      const keyHandler = createKeyHandler({
        getSelectedNode: () => node1,
        keyboardSupport: false,
        selectNode,
      });

      pressKey("ArrowDown");

      expect(selectNode).not.toHaveBeenCalled();

      keyHandler.deinit();
    });
  });

  describe("with multiSelect", () => {
    it("focuses the next node instead of selecting it", () => {
      const node1 = tree.getNodeByNameMustExist("node1");
      const focusNode = vi.fn();
      const selectNode = vi.fn();

      const keyHandler = createKeyHandler({
        focusNode,
        getActiveNode: () => node1,
        getFocusedNode: () => node1,
        multiSelect: true,
        selectNode,
      });

      pressKey("ArrowDown");

      expect(focusNode).toHaveBeenCalledExactlyOnceWith(
        tree.getNodeByNameMustExist("node2"),
      );
      expect(selectNode).not.toHaveBeenCalled();

      keyHandler.deinit();
    });

    it("toggles the focused node with Space", () => {
      const node1 = tree.getNodeByNameMustExist("node1");
      const toggleNodeInSelection = vi.fn();

      const keyHandler = createKeyHandler({
        getActiveNode: () => node1,
        getFocusedNode: () => node1,
        multiSelect: true,
        toggleNodeInSelection,
      });

      const event = pressKey(" ");

      expect(toggleNodeInSelection).toHaveBeenCalledExactlyOnceWith(node1);
      expect(event.defaultPrevented).toBeTrue();

      keyHandler.deinit();
    });
  });

  describe("deinit", () => {
    it("stops handling keydown events", () => {
      const node1 = tree.getNodeByNameMustExist("node1");
      const selectNode = vi.fn();

      const keyHandler = createKeyHandler({
        getSelectedNode: () => node1,
        selectNode,
      });

      keyHandler.deinit();
      pressKey("ArrowDown");

      expect(selectNode).not.toHaveBeenCalled();
    });

    it("can be called when keyboardSupport is false", () => {
      const keyHandler = createKeyHandler({ keyboardSupport: false });

      expect(() => {
        keyHandler.deinit();
      }).not.toThrow();
    });
  });

  describe("moveDown", () => {
    it("selects the next visible node and returns true", () => {
      const node1 = tree.getNodeByNameMustExist("node1");
      const selectNode = vi.fn();

      const keyHandler = createKeyHandler({
        getSelectedNode: () => node1,
        selectNode,
      });

      expect(keyHandler.moveDown()).toBeTrue();
      expect(selectNode).toHaveBeenCalledWith(
        tree.getNodeByNameMustExist("node2"),
      );

      keyHandler.deinit();
    });

    it("selects the first child when the selected node is open", () => {
      const node1 = tree.getNodeByNameMustExist("node1");
      node1.is_open = true;
      const selectNode = vi.fn();

      const keyHandler = createKeyHandler({
        getSelectedNode: () => node1,
        selectNode,
      });

      expect(keyHandler.moveDown()).toBeTrue();
      expect(selectNode).toHaveBeenCalledWith(
        tree.getNodeByNameMustExist("child1"),
      );

      keyHandler.deinit();
    });

    it("returns false when the last node is selected", () => {
      const node2 = tree.getNodeByNameMustExist("node2");
      const selectNode = vi.fn();

      const keyHandler = createKeyHandler({
        getSelectedNode: () => node2,
        selectNode,
      });

      expect(keyHandler.moveDown()).toBeFalse();
      expect(selectNode).not.toHaveBeenCalled();

      keyHandler.deinit();
    });

    it("returns false when no node is selected", () => {
      const selectNode = vi.fn();

      const keyHandler = createKeyHandler({ selectNode });

      expect(keyHandler.moveDown()).toBeFalse();
      expect(selectNode).not.toHaveBeenCalled();

      keyHandler.deinit();
    });
  });

  describe("moveUp", () => {
    it("selects the previous visible node and returns true", () => {
      const node2 = tree.getNodeByNameMustExist("node2");
      const selectNode = vi.fn();

      const keyHandler = createKeyHandler({
        getSelectedNode: () => node2,
        selectNode,
      });

      expect(keyHandler.moveUp()).toBeTrue();
      expect(selectNode).toHaveBeenCalledWith(
        tree.getNodeByNameMustExist("node1"),
      );

      keyHandler.deinit();
    });

    it("selects the last child of an open previous sibling", () => {
      const node1 = tree.getNodeByNameMustExist("node1");
      node1.is_open = true;
      const node2 = tree.getNodeByNameMustExist("node2");
      const selectNode = vi.fn();

      const keyHandler = createKeyHandler({
        getSelectedNode: () => node2,
        selectNode,
      });

      expect(keyHandler.moveUp()).toBeTrue();
      expect(selectNode).toHaveBeenCalledWith(
        tree.getNodeByNameMustExist("child2"),
      );

      keyHandler.deinit();
    });

    it("returns false when the first node is selected", () => {
      const node1 = tree.getNodeByNameMustExist("node1");
      const selectNode = vi.fn();

      const keyHandler = createKeyHandler({
        getSelectedNode: () => node1,
        selectNode,
      });

      expect(keyHandler.moveUp()).toBeFalse();
      expect(selectNode).not.toHaveBeenCalled();

      keyHandler.deinit();
    });

    it("returns false when no node is selected", () => {
      const selectNode = vi.fn();

      const keyHandler = createKeyHandler({ selectNode });

      expect(keyHandler.moveUp()).toBeFalse();
      expect(selectNode).not.toHaveBeenCalled();

      keyHandler.deinit();
    });
  });

  describe("keydown handling", () => {
    it("does nothing when the tree does not have focus", () => {
      const node1 = tree.getNodeByNameMustExist("node1");
      const selectNode = vi.fn();

      const keyHandler = createKeyHandler({
        getFocusedNode: () => null,
        getSelectedNode: () => node1,
        selectNode,
      });

      const event = pressKey("ArrowDown");

      expect(selectNode).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBeFalse();

      keyHandler.deinit();
    });

    it.each([" ", "ArrowDown", "ArrowRight"])(
      "selects the focused node with %j when no node is selected",
      (key) => {
        const node1 = tree.getNodeByNameMustExist("node1");
        const selectNode = vi.fn();

        const keyHandler = createKeyHandler({
          getFocusedNode: () => node1,
          selectNode,
        });

        const event = pressKey(key);

        expect(selectNode).toHaveBeenCalledWith(node1);
        expect(event.defaultPrevented).toBeTrue();

        keyHandler.deinit();
      },
    );

    it.each(["ArrowLeft", "ArrowUp"])(
      "ignores %j when no node is selected",
      (key) => {
        const selectNode = vi.fn();

        const keyHandler = createKeyHandler({ selectNode });

        const event = pressKey(key);

        expect(selectNode).not.toHaveBeenCalled();
        expect(event.defaultPrevented).toBeFalse();

        keyHandler.deinit();
      },
    );

    it("ignores keys that it does not handle", () => {
      const node1 = tree.getNodeByNameMustExist("node1");
      const selectNode = vi.fn();

      const keyHandler = createKeyHandler({
        getSelectedNode: () => node1,
        selectNode,
      });

      const event = pressKey("Tab");

      expect(selectNode).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBeFalse();

      keyHandler.deinit();
    });

    it("prevents the default when a key is handled", () => {
      const node1 = tree.getNodeByNameMustExist("node1");

      const keyHandler = createKeyHandler({
        getSelectedNode: () => node1,
      });

      const event = pressKey("ArrowDown");

      expect(event.defaultPrevented).toBeTrue();

      keyHandler.deinit();
    });

    it("does not prevent the default when a key is not handled", () => {
      const node1 = tree.getNodeByNameMustExist("node1");

      const keyHandler = createKeyHandler({
        getSelectedNode: () => node1,
      });

      const event = pressKey("ArrowUp");

      expect(event.defaultPrevented).toBeFalse();

      keyHandler.deinit();
    });

    describe("ArrowUp", () => {
      it("selects the previous node", () => {
        const node2 = tree.getNodeByNameMustExist("node2");
        const selectNode = vi.fn();

        const keyHandler = createKeyHandler({
          getSelectedNode: () => node2,
          selectNode,
        });

        pressKey("ArrowUp");

        expect(selectNode).toHaveBeenCalledWith(
          tree.getNodeByNameMustExist("node1"),
        );

        keyHandler.deinit();
      });
    });

    describe("ArrowLeft", () => {
      it("closes an open folder", () => {
        const node1 = tree.getNodeByNameMustExist("node1");
        node1.is_open = true;
        const closeNode = vi.fn();
        const selectNode = vi.fn();

        const keyHandler = createKeyHandler({
          closeNode,
          getSelectedNode: () => node1,
          selectNode,
        });

        const event = pressKey("ArrowLeft");

        expect(closeNode).toHaveBeenCalledWith(node1);
        expect(selectNode).not.toHaveBeenCalled();
        expect(event.defaultPrevented).toBeTrue();

        keyHandler.deinit();
      });

      it("selects the parent of a closed folder", () => {
        const node3 = tree.getNodeByNameMustExist("node3");
        const closeNode = vi.fn();
        const selectNode = vi.fn();

        const keyHandler = createKeyHandler({
          closeNode,
          getSelectedNode: () => node3,
          selectNode,
        });

        pressKey("ArrowLeft");

        expect(closeNode).not.toHaveBeenCalled();
        expect(selectNode).toHaveBeenCalledWith(
          tree.getNodeByNameMustExist("node2"),
        );

        keyHandler.deinit();
      });

      it("selects the parent of a leaf node", () => {
        const child1 = tree.getNodeByNameMustExist("child1");
        const selectNode = vi.fn();

        const keyHandler = createKeyHandler({
          getSelectedNode: () => child1,
          selectNode,
        });

        pressKey("ArrowLeft");

        expect(selectNode).toHaveBeenCalledWith(
          tree.getNodeByNameMustExist("node1"),
        );

        keyHandler.deinit();
      });

      it("does nothing for a top-level leaf node", () => {
        const leaf = new Node()
          .loadFromData(["leaf"])
          .getNodeByNameMustExist("leaf");
        const selectNode = vi.fn();

        const keyHandler = createKeyHandler({
          getSelectedNode: () => leaf,
          selectNode,
        });

        const event = pressKey("ArrowLeft");

        expect(selectNode).not.toHaveBeenCalled();
        expect(event.defaultPrevented).toBeFalse();

        keyHandler.deinit();
      });
    });

    describe("ArrowRight", () => {
      it("opens a closed folder", () => {
        const node1 = tree.getNodeByNameMustExist("node1");
        const openNode = vi.fn(() => Promise.resolve());
        const selectNode = vi.fn();

        const keyHandler = createKeyHandler({
          getSelectedNode: () => node1,
          openNode,
          selectNode,
        });

        const event = pressKey("ArrowRight");

        expect(openNode).toHaveBeenCalledWith(node1);
        expect(selectNode).not.toHaveBeenCalled();
        expect(event.defaultPrevented).toBeTrue();

        keyHandler.deinit();
      });

      it("selects the first child of an open folder", () => {
        const node1 = tree.getNodeByNameMustExist("node1");
        node1.is_open = true;
        const openNode = vi.fn(() => Promise.resolve());
        const selectNode = vi.fn();

        const keyHandler = createKeyHandler({
          getSelectedNode: () => node1,
          openNode,
          selectNode,
        });

        pressKey("ArrowRight");

        expect(openNode).not.toHaveBeenCalled();
        expect(selectNode).toHaveBeenCalledWith(
          tree.getNodeByNameMustExist("child1"),
        );

        keyHandler.deinit();
      });

      it("does nothing for a leaf node", () => {
        const child1 = tree.getNodeByNameMustExist("child1");
        const openNode = vi.fn(() => Promise.resolve());
        const selectNode = vi.fn();

        const keyHandler = createKeyHandler({
          getSelectedNode: () => child1,
          openNode,
          selectNode,
        });

        const event = pressKey("ArrowRight");

        expect(openNode).not.toHaveBeenCalled();
        expect(selectNode).not.toHaveBeenCalled();
        expect(event.defaultPrevented).toBeFalse();

        keyHandler.deinit();
      });
    });

    describe("Home", () => {
      it("selects the first node", () => {
        const child1 = tree.getNodeByNameMustExist("child1");
        const selectNode = vi.fn();

        const keyHandler = createKeyHandler({
          getSelectedNode: () => child1,
          getTree: () => tree,
          selectNode,
        });

        const event = pressKey("Home");

        expect(selectNode).toHaveBeenCalledWith(
          tree.getNodeByNameMustExist("node1"),
        );
        expect(event.defaultPrevented).toBeTrue();

        keyHandler.deinit();
      });

      it("selects the first node when no node is selected", () => {
        const selectNode = vi.fn();

        const keyHandler = createKeyHandler({
          getTree: () => tree,
          selectNode,
        });

        pressKey("Home");

        expect(selectNode).toHaveBeenCalledWith(
          tree.getNodeByNameMustExist("node1"),
        );

        keyHandler.deinit();
      });

      it("does nothing for an empty tree", () => {
        const selectNode = vi.fn();

        const keyHandler = createKeyHandler({
          getTree: () => new Node(),
          selectNode,
        });

        const event = pressKey("Home");

        expect(selectNode).not.toHaveBeenCalled();
        expect(event.defaultPrevented).toBeFalse();

        keyHandler.deinit();
      });
    });

    describe("End", () => {
      it("selects the last visible node", () => {
        const node1 = tree.getNodeByNameMustExist("node1");
        const selectNode = vi.fn();

        const keyHandler = createKeyHandler({
          getSelectedNode: () => node1,
          getTree: () => tree,
          selectNode,
        });

        const event = pressKey("End");

        expect(selectNode).toHaveBeenCalledWith(
          tree.getNodeByNameMustExist("node2"),
        );
        expect(event.defaultPrevented).toBeTrue();

        keyHandler.deinit();
      });

      it("selects the last child of an open folder", () => {
        const node1 = tree.getNodeByNameMustExist("node1");
        tree.getNodeByNameMustExist("node2").is_open = true;
        const selectNode = vi.fn();

        const keyHandler = createKeyHandler({
          getSelectedNode: () => node1,
          getTree: () => tree,
          selectNode,
        });

        pressKey("End");

        expect(selectNode).toHaveBeenCalledWith(
          tree.getNodeByNameMustExist("node3"),
        );

        keyHandler.deinit();
      });

      it("does nothing for an empty tree", () => {
        const selectNode = vi.fn();

        const keyHandler = createKeyHandler({
          getTree: () => new Node(),
          selectNode,
        });

        const event = pressKey("End");

        expect(selectNode).not.toHaveBeenCalled();
        expect(event.defaultPrevented).toBeFalse();

        keyHandler.deinit();
      });
    });

    describe("Enter", () => {
      it("triggers tree.activate for the selected node", () => {
        const node1 = tree.getNodeByNameMustExist("node1");
        const triggerEvent = vi.fn(() => true);

        const keyHandler = createKeyHandler({
          getSelectedNode: () => node1,
          triggerEvent,
        });

        const event = pressKey("Enter");

        expect(triggerEvent).toHaveBeenCalledExactlyOnceWith("tree.activate", {
          node: node1,
          originalEvent: event,
        });
        expect(event.defaultPrevented).toBeTrue();

        keyHandler.deinit();
      });

      it("triggers tree.activate for the focused node when no node is selected", () => {
        const node2 = tree.getNodeByNameMustExist("node2");
        const selectNode = vi.fn();
        const triggerEvent = vi.fn(() => true);

        const keyHandler = createKeyHandler({
          getFocusedNode: () => node2,
          selectNode,
          triggerEvent,
        });

        const event = pressKey("Enter");

        expect(triggerEvent).toHaveBeenCalledExactlyOnceWith("tree.activate", {
          node: node2,
          originalEvent: event,
        });
        expect(selectNode).not.toHaveBeenCalled();

        keyHandler.deinit();
      });
    });
  });

  describe("setKeyboardSupport", () => {
    it("handles keydown events after it is turned on", () => {
      const node1 = tree.getNodeByNameMustExist("node1");
      const selectNode = vi.fn();

      const keyHandler = createKeyHandler({
        getSelectedNode: () => node1,
        keyboardSupport: false,
        selectNode,
      });

      keyHandler.setKeyboardSupport(true);
      pressKey("ArrowDown");

      expect(selectNode).toHaveBeenCalledWith(
        tree.getNodeByNameMustExist("node2"),
      );

      keyHandler.deinit();
    });

    it("ignores keydown events after it is turned off", () => {
      const node1 = tree.getNodeByNameMustExist("node1");
      const selectNode = vi.fn();

      const keyHandler = createKeyHandler({
        getSelectedNode: () => node1,
        selectNode,
      });

      keyHandler.setKeyboardSupport(false);
      pressKey("ArrowDown");

      expect(selectNode).not.toHaveBeenCalled();

      keyHandler.deinit();
    });

    it("adds the listener only once when it is turned on twice", () => {
      const addEventListener = vi.spyOn(document, "addEventListener");
      const keyHandler = createKeyHandler({ keyboardSupport: false });

      keyHandler.setKeyboardSupport(true);
      keyHandler.setKeyboardSupport(true);

      expect(addEventListener).toHaveBeenCalledExactlyOnceWith(
        "keydown",
        expect.any(Function),
      );

      addEventListener.mockRestore();
      keyHandler.deinit();
    });
  });
});
