import type { TreeEvent } from "treeElement/events";
import type { GetScrollLeft, GetTree, OpenNode } from "treeElement/methodTypes";
import type {
  DragMethod,
  OnCanMove,
  OnCanMoveTo,
  OnIsMoveHandle,
} from "treeElement/options";

import { DragAndDropHandler } from "treeElement/dragAndDropHandler";
import { Node } from "treeElement/node";
import NodeElement from "treeElement/nodeElement";
import triggerCustomEvent from "treeElement/triggerCustomEvent";
import { vi } from "vitest";

import defaultClassNames from "../../support/classNames";
import { generateHtmlElementsForTree } from "../../support/testUtil";

interface CreateDragAndDropHandlerParams {
  getTree?: GetTree;
  onCanMove?: OnCanMove;
  onCanMoveTo?: OnCanMoveTo;
  onDragMove?: DragMethod;
  onDragStop?: DragMethod;
  onIsMoveHandle?: OnIsMoveHandle;
  openFolderDelay?: false | number;
  openNode?: OpenNode;
  scrollLeft?: number;
  tree: Node;
}

const createDragAndDropHandler = ({
  getTree,
  onCanMove,
  onCanMoveTo,
  onDragMove,
  onDragStop,
  onIsMoveHandle,
  openFolderDelay = false,
  openNode,
  scrollLeft = 0,
  tree,
}: CreateDragAndDropHandlerParams) => {
  const getScrollLeft = vi.fn<GetScrollLeft>(() => scrollLeft);
  const refreshElements = vi.fn();

  const treeElement = generateHtmlElementsForTree(tree);

  const triggerEvent = vi.fn(
    (eventName: string, values?: Record<string, unknown>) =>
      triggerCustomEvent(treeElement, eventName, values),
  );

  const getNodeElementForNode = vi.fn(
    (node: Node) =>
      new NodeElement({
        classNames: defaultClassNames,
        getScrollLeft,
        node,
        treeElement,
      }),
  );

  const getNodeElement = vi.fn((element: HTMLElement) => {
    let resultNode: Node | null = null;

    tree.iterate((node) => {
      if (node.element === element || node.element === element.parentElement) {
        resultNode = node;
        return false;
      }

      return true;
    });

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (resultNode) {
      return new NodeElement({
        classNames: defaultClassNames,
        getScrollLeft,
        node: resultNode,
        treeElement,
      });
    }
    return null;
  });

  const dragAndDropHandler = new DragAndDropHandler({
    classNames: defaultClassNames,
    getNodeElement,
    getNodeElementForNode,
    getScrollLeft,
    getTree: getTree ?? vi.fn(() => tree),
    onCanMove,
    onCanMoveTo,
    onDragMove,
    onDragStop,
    onIsMoveHandle,
    openFolderDelay: openFolderDelay,
    openNode: openNode ?? vi.fn(),
    refreshElements,
    treeElement: treeElement,
    triggerEvent,
  });

  return { dragAndDropHandler, refreshElements, treeElement, triggerEvent };
};

describe("DragAndDropHandler", () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe(".mouseCapture", () => {
    it("sets the current item and returns true when a node can be moved", () => {
      const tree = new Node(null, true);
      const node1 = new Node({ name: "node1" });
      tree.addChild(node1);
      const node2 = new Node({ name: "node2" });
      tree.addChild(node2);

      const { dragAndDropHandler } = createDragAndDropHandler({ tree });

      expect(dragAndDropHandler.currentItem).toBeNull();

      const positionInfo = {
        originalEvent: new Event("click"),
        pageX: 10,
        pageY: 10,
        target: node1.element as HTMLElement,
      };

      expect(dragAndDropHandler.mouseCapture(positionInfo)).toBeTrue();
      expect(dragAndDropHandler.currentItem?.node).toBe(node1);
    });

    it("doesn't set the current item and returns false when no node can be moved", () => {
      const tree = new Node(null, true);
      const node1 = new Node({ name: "node1" });
      tree.addChild(node1);
      const node2 = new Node({ name: "node2" });
      tree.addChild(node2);

      const element = document.createElement("div");

      const { dragAndDropHandler } = createDragAndDropHandler({ tree });

      const positionInfo = {
        originalEvent: new Event("click"),
        pageX: 200,
        pageY: 10,
        target: element,
      };

      expect(dragAndDropHandler.mouseCapture(positionInfo)).toBeFalse();
      expect(dragAndDropHandler.currentItem).toBeNull();
    });

    it("captures the node when an element inside a node element is clicked", () => {
      const tree = new Node(null, true);
      const node1 = new Node({ name: "node1" });
      tree.addChild(node1);
      const node2 = new Node({ name: "node2" });
      tree.addChild(node2);

      const { dragAndDropHandler } = createDragAndDropHandler({ tree });

      const element = document.createElement("div");
      (node2.element as HTMLElement).append(element);

      const positionInfo = {
        originalEvent: new Event("click"),
        pageX: 10,
        pageY: 30,
        target: element,
      };

      expect(dragAndDropHandler.mouseCapture(positionInfo)).toBeTrue();
      expect(dragAndDropHandler.currentItem?.node).toBe(node2);
    });

    it("doesn't capture the node and returns null when an input element is clicked", () => {
      const tree = new Node(null, true);
      const node1 = new Node({ name: "node1" });
      tree.addChild(node1);
      const node2 = new Node({ name: "node2" });
      tree.addChild(node2);

      const { dragAndDropHandler } = createDragAndDropHandler({ tree });

      const element = document.createElement("input");
      (node2.element as HTMLElement).append(element);

      const positionInfo = {
        originalEvent: new Event("click"),
        pageX: 10,
        pageY: 30,
        target: element,
      };

      expect(dragAndDropHandler.mouseCapture(positionInfo)).toBeNull();
      expect(dragAndDropHandler.currentItem).toBeNull();
    });

    it("captures the node when onIsMoveHandle returns true", () => {
      const tree = new Node(null, true);
      const node1 = new Node({ name: "node1" });
      tree.addChild(node1);
      const node2 = new Node({ name: "node2" });
      tree.addChild(node2);

      const onIsMoveHandle = vi.fn((el: HTMLElement) => el === node1.element);
      const { dragAndDropHandler } = createDragAndDropHandler({
        onIsMoveHandle,
        tree,
      });

      const positionInfo = {
        originalEvent: new Event("click"),
        pageX: 10,
        pageY: 10,
        target: node1.element as HTMLElement,
      };

      expect(dragAndDropHandler.mouseCapture(positionInfo)).toBeTrue();
      expect(dragAndDropHandler.currentItem?.node).toBe(node1);

      expect(onIsMoveHandle).toHaveBeenCalledExactlyOnceWith(expect.anything());
    });

    it("doesn't capture the node when onIsMoveHandle returns false", () => {
      const tree = new Node(null, true);
      const node1 = new Node({ name: "node1" });
      tree.addChild(node1);
      const node2 = new Node({ name: "node2" });
      tree.addChild(node2);

      const onIsMoveHandle = vi.fn(() => false);
      const { dragAndDropHandler } = createDragAndDropHandler({
        onIsMoveHandle,
        tree,
      });

      const positionInfo = {
        originalEvent: new Event("click"),
        pageX: 10,
        pageY: 10,
        target: node1.element as HTMLElement,
      };

      expect(dragAndDropHandler.mouseCapture(positionInfo)).toBeNull();
      expect(dragAndDropHandler.currentItem).toBeNull();

      expect(onIsMoveHandle).toHaveBeenCalledExactlyOnceWith(expect.anything());
    });

    it("doesn't capture when onCanMove returns false", () => {
      const tree = new Node(null, true);
      const node1 = new Node({ name: "node1" });
      tree.addChild(node1);
      const node2 = new Node({ name: "node2" });
      tree.addChild(node2);

      const onCanMove = vi.fn(() => false);

      const { dragAndDropHandler } = createDragAndDropHandler({
        onCanMove,
        tree,
      });

      const element = document.createElement("div");
      (node2.element as HTMLElement).append(element);

      const positionInfo = {
        originalEvent: new Event("click"),
        pageX: 10,
        pageY: 30,
        target: element,
      };

      expect(dragAndDropHandler.mouseCapture(positionInfo)).toBeFalse();
      expect(dragAndDropHandler.currentItem).toBeNull();

      expect(onCanMove).toHaveBeenCalledExactlyOnceWith(node2);
    });

    it("captures when onCanMove returns true", () => {
      const tree = new Node(null, true);
      const node1 = new Node({ name: "node1" });
      tree.addChild(node1);
      const node2 = new Node({ name: "node2" });
      tree.addChild(node2);

      const onCanMove = vi.fn(() => true);

      const { dragAndDropHandler } = createDragAndDropHandler({
        onCanMove,
        tree,
      });

      const element = document.createElement("div");
      (node2.element as HTMLElement).append(element);

      const positionInfo = {
        originalEvent: new Event("click"),
        pageX: 10,
        pageY: 30,
        target: element,
      };

      expect(dragAndDropHandler.mouseCapture(positionInfo)).toBeTrue();
      expect(dragAndDropHandler.currentItem?.node).toStrictEqual(node2);

      expect(onCanMove).toHaveBeenCalledExactlyOnceWith(node2);
    });
  });

  describe(".mouseStart", () => {
    it("sets dragging to true and returns true", () => {
      const tree = new Node(null, true);
      const node1 = new Node({ name: "node1" });
      tree.addChild(node1);
      const node2 = new Node({ name: "node2" });
      tree.addChild(node2);

      const { dragAndDropHandler } = createDragAndDropHandler({ tree });

      // Set current item
      const positionInfo = {
        originalEvent: new Event("click"),
        pageX: 10,
        pageY: 10,
        target: node1.element as HTMLElement,
      };

      dragAndDropHandler.mouseCapture(positionInfo);

      expect(dragAndDropHandler.currentItem?.node).toBe(node1);
      expect(dragAndDropHandler.isDragging).toBeFalse();

      // mouseStart
      expect(dragAndDropHandler.mouseStart(positionInfo)).toBeTrue();
      expect(dragAndDropHandler.isDragging).toBeTrue();
    });

    it("adds the tree-element-moving css class", () => {
      const tree = new Node(null, true);
      const node1 = new Node({ name: "node1" });
      tree.addChild(node1);
      const node2 = new Node({ name: "node2" });
      tree.addChild(node2);

      const { dragAndDropHandler } = createDragAndDropHandler({ tree });
      // Set current item
      const positionInfo = {
        originalEvent: new Event("click"),
        pageX: 10,
        pageY: 10,
        target: node1.element as HTMLElement,
      };

      dragAndDropHandler.mouseCapture(positionInfo);

      // mouseStart
      dragAndDropHandler.mouseStart(positionInfo);

      expect(node1.element?.classList).toContain("tree-element-moving");
    });

    it("creates a drag element", () => {
      const tree = new Node(null, true);
      const node1 = new Node({ name: "node1" });
      tree.addChild(node1);
      const node2 = new Node({ name: "node2" });
      tree.addChild(node2);

      const { dragAndDropHandler } = createDragAndDropHandler({ tree });

      // Set current item
      const positionInfo = {
        originalEvent: new Event("click"),
        pageX: 10,
        pageY: 10,
        target: node1.element as HTMLElement,
      };

      dragAndDropHandler.mouseCapture(positionInfo);

      // mouseStart
      dragAndDropHandler.mouseStart(positionInfo);

      expect(
        document.querySelector(".tree-element-dragging"),
      ).toBeInTheDocument();
    });

    it("sets dragging to false and returns false when there is no current item", () => {
      const tree = new Node(null, true);
      const node1 = new Node({ name: "node1" });
      tree.addChild(node1);
      const node2 = new Node({ name: "node2" });
      tree.addChild(node2);

      const { dragAndDropHandler } = createDragAndDropHandler({ tree });

      const positionInfo = {
        originalEvent: new Event("click"),
        pageX: 10,
        pageY: 10,
        target: node1.element as HTMLElement,
      };

      expect(dragAndDropHandler.mouseStart(positionInfo)).toBeFalse();
      expect(dragAndDropHandler.isDragging).toBeFalse();
    });
  });

  describe(".mouseStop", () => {
    it("triggers a tree.move event", () => {
      const tree = new Node(null, true);
      const node1 = new Node({ name: "node1" });
      tree.addChild(node1);
      const node2 = new Node({ name: "node2" });
      tree.addChild(node2);

      const { dragAndDropHandler, triggerEvent } = createDragAndDropHandler({
        tree,
      });

      // Capture
      const positionInfo = {
        originalEvent: new Event("click"),
        pageX: 10,
        pageY: 10,
        target: node1.element as HTMLElement,
      };

      dragAndDropHandler.mouseCapture(positionInfo);

      expect(dragAndDropHandler.currentItem?.node).toBe(node1);

      // Start
      expect(dragAndDropHandler.mouseStart(positionInfo)).toBeTrue();
      expect(dragAndDropHandler.isDragging).toBeTrue();

      // Drag
      const dragPositionInfo = {
        originalEvent: new Event("mousemove"),
        pageX: 15,
        pageY: 30,
        target: node2.element as HTMLElement,
      };

      dragAndDropHandler.mouseDrag(dragPositionInfo);

      expect(dragAndDropHandler.hoveredArea?.node).toStrictEqual(node2);

      // Stop
      dragAndDropHandler.mouseStop(dragPositionInfo);

      expect(triggerEvent).toHaveBeenCalledExactlyOnceWith(
        "tree.move",
        expect.objectContaining({
          moveInfo: {
            doMove: expect.any(Function) as unknown,
            movedNode: node1,
            originalEvent: dragPositionInfo.originalEvent,
            position: "inside",
            previousParent: tree,
            targetNode: node2,
          },
        }),
      );
    });

    it("calls tree.moveNode", () => {
      const tree = new Node(null, true);
      const node1 = new Node({ name: "node1" });
      tree.addChild(node1);
      const node2 = new Node({ name: "node2" });
      tree.addChild(node2);

      const mockMoveNode = vi.spyOn(tree, "moveNode");

      const { dragAndDropHandler } = createDragAndDropHandler({
        tree,
      });

      // Capture
      const positionInfo = {
        originalEvent: new Event("click"),
        pageX: 10,
        pageY: 10,
        target: node1.element as HTMLElement,
      };

      dragAndDropHandler.mouseCapture(positionInfo);

      expect(dragAndDropHandler.currentItem?.node).toBe(node1);

      // Start
      expect(dragAndDropHandler.mouseStart(positionInfo)).toBeTrue();
      expect(dragAndDropHandler.isDragging).toBeTrue();

      // Drag
      const dragPositionInfo = {
        originalEvent: new Event("mousemove"),
        pageX: 15,
        pageY: 30,
        target: node2.element as HTMLElement,
      };

      dragAndDropHandler.mouseDrag(dragPositionInfo);

      expect(dragAndDropHandler.hoveredArea?.node).toStrictEqual(node2);

      // Stop
      dragAndDropHandler.mouseStop(dragPositionInfo);

      expect(mockMoveNode).toHaveBeenCalledExactlyOnceWith(
        node1,
        node2,
        "inside",
      );
    });

    it("doesn't call tree.moveNode when the the event is cancelled", () => {
      const tree = new Node(null, true);
      const node1 = new Node({ name: "node1" });
      tree.addChild(node1);
      const node2 = new Node({ name: "node2" });
      tree.addChild(node2);

      const mockMoveNode = vi.spyOn(tree, "moveNode");

      const { dragAndDropHandler, treeElement } = createDragAndDropHandler({
        tree,
      });

      treeElement.addEventListener("tree.move", (e) => {
        e.preventDefault();
      });

      // Capture
      const positionInfo = {
        originalEvent: new Event("click"),
        pageX: 10,
        pageY: 10,
        target: node1.element as HTMLElement,
      };

      dragAndDropHandler.mouseCapture(positionInfo);

      expect(dragAndDropHandler.currentItem?.node).toBe(node1);

      // Start
      expect(dragAndDropHandler.mouseStart(positionInfo)).toBeTrue();
      expect(dragAndDropHandler.isDragging).toBeTrue();

      // Drag
      const dragPositionInfo = {
        originalEvent: new Event("mousemove"),
        pageX: 15,
        pageY: 30,
        target: node2.element as HTMLElement,
      };

      dragAndDropHandler.mouseDrag(dragPositionInfo);

      expect(dragAndDropHandler.hoveredArea?.node).toStrictEqual(node2);

      // Stop
      dragAndDropHandler.mouseStop(dragPositionInfo);

      expect(mockMoveNode).not.toHaveBeenCalled();
    });

    it("calls tree.moveNode when do_move is called later", () => {
      const tree = new Node(null, true);
      const node1 = new Node({ name: "node1" });
      tree.addChild(node1);
      const node2 = new Node({ name: "node2" });
      tree.addChild(node2);

      const mockMoveNode = vi.spyOn(tree, "moveNode");

      const { dragAndDropHandler, treeElement } = createDragAndDropHandler({
        tree,
      });

      const doMoveFunctions: (() => void)[] = [];

      treeElement.addEventListener("tree.move", (e) => {
        e.preventDefault();
        doMoveFunctions.push(
          (e as TreeEvent<"tree.move">).detail.moveInfo.doMove,
        );
      });

      // Capture
      const positionInfo = {
        originalEvent: new Event("click"),
        pageX: 10,
        pageY: 10,
        target: node1.element as HTMLElement,
      };

      dragAndDropHandler.mouseCapture(positionInfo);

      // Start
      dragAndDropHandler.mouseStart(positionInfo);

      // Drag
      const dragPositionInfo = {
        originalEvent: new Event("mousemove"),
        pageX: 15,
        pageY: 30,
        target: node2.element as HTMLElement,
      };

      dragAndDropHandler.mouseDrag(dragPositionInfo);

      // Stop; the move is not applied because the event is cancelled
      dragAndDropHandler.mouseStop(dragPositionInfo);

      expect(mockMoveNode).not.toHaveBeenCalled();
      expect(node1.parent).toBe(tree);

      // Perform the move later
      expect(doMoveFunctions).toHaveLength(1);

      doMoveFunctions[0]?.();

      expect(mockMoveNode).toHaveBeenCalledExactlyOnceWith(
        node1,
        node2,
        "inside",
      );
      expect(node1.parent).toBe(node2);
    });

    it("calls onDragStop when there is no hovered area", () => {
      const tree = new Node(null, true);
      const node1 = new Node({ name: "node1" });
      tree.addChild(node1);
      const node2 = new Node({ name: "node2" });
      tree.addChild(node2);

      const onDragStop = vi.fn();

      const { dragAndDropHandler } = createDragAndDropHandler({
        onDragStop,
        tree,
      });

      // Start dragging
      const positionInfo = {
        originalEvent: new Event("click"),
        pageX: 10,
        pageY: 10,
        target: node1.element as HTMLElement,
      };

      dragAndDropHandler.mouseCapture(positionInfo);

      dragAndDropHandler.mouseStart(positionInfo);

      expect(dragAndDropHandler.isDragging).toBeTrue();

      // Move mouse
      dragAndDropHandler.mouseDrag({
        originalEvent: new Event("mousemove"),
        pageX: 15,
        pageY: 30,
        target: node2.element as HTMLElement,
      });

      // Stop
      const originalEvent = new Event("mousemove");

      dragAndDropHandler.mouseStop({
        originalEvent,
        pageX: 300,
        pageY: 300,
        target: document.body,
      });

      expect(onDragStop).toHaveBeenCalledExactlyOnceWith(node1, originalEvent);
    });
  });

  describe(".mouseDrag", () => {
    it("moves the drag element and returns true", () => {
      const tree = new Node(null, true);
      const node1 = new Node({ name: "node1" });
      tree.addChild(node1);
      const node2 = new Node({ name: "node2" });
      tree.addChild(node2);

      const { dragAndDropHandler } = createDragAndDropHandler({ tree });

      // Start dragging
      const positionInfo = {
        originalEvent: new Event("click"),
        pageX: 10,
        pageY: 10,
        target: node1.element as HTMLElement,
      };

      dragAndDropHandler.mouseCapture(positionInfo);

      dragAndDropHandler.mouseStart(positionInfo);

      expect(dragAndDropHandler.isDragging).toBeTrue();

      // Move mouse
      const dragResult = dragAndDropHandler.mouseDrag({
        originalEvent: new Event("mousemove"),
        pageX: 15,
        pageY: 30,
        target: node2.element as HTMLElement,
      });

      expect(dragResult).toBeTrue();

      const dragElement = document.querySelector(".tree-element-dragging");

      expect(dragElement).toHaveStyle({
        left: "5px",
        position: "absolute",
        top: "20px",
      });
    });

    it("changes the hovered area", () => {
      const tree = new Node(null, true);
      const node1 = new Node({ name: "node1" });
      tree.addChild(node1);
      const node2 = new Node({ name: "node2" });
      tree.addChild(node2);

      const { dragAndDropHandler } = createDragAndDropHandler({ tree });

      // Start dragging
      const positionInfo = {
        originalEvent: new Event("click"),
        pageX: 10,
        pageY: 10,
        target: node1.element as HTMLElement,
      };

      dragAndDropHandler.mouseCapture(positionInfo);

      dragAndDropHandler.mouseStart(positionInfo);

      expect(dragAndDropHandler.isDragging).toBeTrue();
      expect(dragAndDropHandler.hoveredArea).toBeNull();

      // Move mouse
      dragAndDropHandler.mouseDrag({
        originalEvent: new Event("mousemove"),
        pageX: 15,
        pageY: 30,
        target: node2.element as HTMLElement,
      });

      expect(dragAndDropHandler.hoveredArea).toStrictEqual(
        expect.objectContaining({
          bottom: 38,
          node: node2,
          position: "inside",
          top: 20,
        }),
      );
    });

    it("creates a border drop hint", () => {
      const tree = new Node(null, true);
      const node1 = new Node({ name: "node1" });
      tree.addChild(node1);
      const node2 = new Node({ name: "node2" });
      tree.addChild(node2);

      const { dragAndDropHandler } = createDragAndDropHandler({ tree });

      // Start dragging
      const positionInfo = {
        originalEvent: new Event("click"),
        pageX: 10,
        pageY: 10,
        target: node1.element as HTMLElement,
      };

      dragAndDropHandler.mouseCapture(positionInfo);

      dragAndDropHandler.mouseStart(positionInfo);

      expect(dragAndDropHandler.isDragging).toBeTrue();
      expect(dragAndDropHandler.hoveredArea).toBeNull();

      // Move mouse
      dragAndDropHandler.mouseDrag({
        originalEvent: new Event("mousemove"),
        pageX: 15,
        pageY: 30,
        target: node2.element as HTMLElement,
      });

      expect(
        node2.element?.querySelector(".tree-element-border"),
      ).toBeInTheDocument();
    });

    it("returns false when dragging hasn't started", () => {
      const tree = new Node(null, true);
      const node1 = new Node({ name: "node1" });
      tree.addChild(node1);
      const node2 = new Node({ name: "node2" });
      tree.addChild(node2);

      const { dragAndDropHandler } = createDragAndDropHandler({ tree });

      const dragResult = dragAndDropHandler.mouseDrag({
        originalEvent: new Event("mousemove"),
        pageX: 15,
        pageY: 30,
        target: node2.element as HTMLElement,
      });

      expect(dragResult).toBeFalse();
    });

    it("sets area to null when no area is found", () => {
      const tree = new Node(null, true);
      const node1 = new Node({ name: "node1" });
      tree.addChild(node1);
      const node2 = new Node({ name: "node2" });
      tree.addChild(node2);

      const { dragAndDropHandler } = createDragAndDropHandler({
        tree,
      });

      // Start dragging
      const positionInfo = {
        originalEvent: new Event("click"),
        pageX: 10,
        pageY: 30,
        target: node1.element as HTMLElement,
      };

      dragAndDropHandler.mouseCapture(positionInfo);

      dragAndDropHandler.mouseStart(positionInfo);

      dragAndDropHandler.mouseDrag({
        originalEvent: new Event("mousemove"),
        pageX: 15,
        pageY: 200,
        target: document.body,
      });

      expect(dragAndDropHandler.hoveredArea).toBeNull();
    });

    it("calls onDragMove when no area is found and onDragMove is defined", () => {
      const tree = new Node(null, true);
      const node1 = new Node({ name: "node1" });
      tree.addChild(node1);
      const node2 = new Node({ name: "node2" });
      tree.addChild(node2);

      const onDragMove = vi.fn();

      const { dragAndDropHandler } = createDragAndDropHandler({
        onDragMove,
        tree,
      });

      // Start dragging
      const positionInfo = {
        originalEvent: new Event("click"),
        pageX: 10,
        pageY: 30,
        target: node1.element as HTMLElement,
      };

      dragAndDropHandler.mouseCapture(positionInfo);

      dragAndDropHandler.mouseStart(positionInfo);

      expect(dragAndDropHandler.isDragging).toBeTrue();
      expect(dragAndDropHandler.hoveredArea).toBeNull();

      const positionInfoForDragging = {
        originalEvent: new Event("mousemove"),
        pageX: 15,
        pageY: 200,
        target: document.body,
      };

      // Move mouse
      dragAndDropHandler.mouseDrag(positionInfoForDragging);

      expect(onDragMove).toHaveBeenCalledExactlyOnceWith(
        node1,
        positionInfoForDragging.originalEvent,
      );
    });

    it("doesn't create a drop hint when onCanMoveTo returns false", () => {
      const tree = new Node(null, true);
      const node1 = new Node({ name: "node1" });
      tree.addChild(node1);
      const node2 = new Node({ name: "node2" });
      tree.addChild(node2);

      const onCanMoveTo = vi.fn(() => false);

      const { dragAndDropHandler } = createDragAndDropHandler({
        onCanMoveTo,
        tree,
      });

      // Start dragging
      const positionInfo = {
        originalEvent: new Event("click"),
        pageX: 10,
        pageY: 10,
        target: node1.element as HTMLElement,
      };

      dragAndDropHandler.mouseCapture(positionInfo);

      dragAndDropHandler.mouseStart(positionInfo);

      expect(dragAndDropHandler.isDragging).toBeTrue();

      // Move mouse
      dragAndDropHandler.mouseDrag({
        originalEvent: new Event("mousemove"),
        pageX: 15,
        pageY: 30,
        target: node2.element as HTMLElement,
      });

      expect(onCanMoveTo).toHaveBeenCalledExactlyOnceWith(
        node1,
        node2,
        "inside",
      );

      // Still sets hoveredArea to the new node
      expect(dragAndDropHandler.hoveredArea?.node).toStrictEqual(node2);

      expect(node2.element?.querySelector(".tree-element-border")).toBeNull();
    });

    it("opens a closed folder when it is hovered for a certain time", () => {
      vi.useFakeTimers();

      const tree = new Node(null, true);
      const node1 = new Node({ name: "node1" });
      tree.addChild(node1);
      const node2 = new Node({ name: "node2" });
      tree.addChild(node2);
      node2.addChild(new Node({ name: "child" }));

      const openNode = vi.fn(() => {
        return Promise.resolve();
      });

      const { dragAndDropHandler } = createDragAndDropHandler({
        openFolderDelay: 100,
        openNode,
        tree,
      });

      // Start dragging
      const positionInfo = {
        originalEvent: new Event("click"),
        pageX: 10,
        pageY: 10,
        target: node1.element as HTMLElement,
      };

      dragAndDropHandler.mouseCapture(positionInfo);

      dragAndDropHandler.mouseStart(positionInfo);

      expect(dragAndDropHandler.isDragging).toBeTrue();

      // Move mouse to node2
      dragAndDropHandler.mouseDrag({
        originalEvent: new Event("mousemove"),
        pageX: 15,
        pageY: 30,
        target: node2.element as HTMLElement,
      });

      vi.advanceTimersByTime(10);

      expect(openNode).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      expect(openNode).toHaveBeenCalledExactlyOnceWith(node2);
    });

    it("doesn't open a closed folder when it is hovered over but not long enough", () => {
      vi.useFakeTimers();

      const tree = new Node(null, true);
      const node1 = new Node({ name: "node1" });
      tree.addChild(node1);
      const node2 = new Node({ name: "node2" });
      tree.addChild(node2);
      node2.addChild(new Node({ name: "child" }));

      const openNode = vi.fn();

      const { dragAndDropHandler } = createDragAndDropHandler({
        openFolderDelay: 100,
        openNode,
        tree,
      });

      // Start dragging
      const positionInfo = {
        originalEvent: new Event("click"),
        pageX: 10,
        pageY: 10,
        target: node1.element as HTMLElement,
      };

      dragAndDropHandler.mouseCapture(positionInfo);

      dragAndDropHandler.mouseStart(positionInfo);

      expect(dragAndDropHandler.isDragging).toBeTrue();

      // Move mouse to node2
      dragAndDropHandler.mouseDrag({
        originalEvent: new Event("mousemove"),
        pageX: 15,
        pageY: 30,
        target: node2.element as HTMLElement,
      });

      vi.advanceTimersByTime(10);

      // Move mouse outside of the tree
      dragAndDropHandler.mouseDrag({
        originalEvent: new Event("mousemove"),
        pageX: 150,
        pageY: 500,
        target: document.body,
      });

      vi.advanceTimersByTime(100);

      expect(openNode).not.toHaveBeenCalled();
    });
  });

  describe(".refresh", () => {
    it("generates hit areas", () => {
      const tree = new Node(null, true);
      const node1 = new Node({ name: "node1" });
      tree.addChild(node1);
      const node2 = new Node({ name: "node2" });
      tree.addChild(node2);

      const { dragAndDropHandler } = createDragAndDropHandler({ tree });

      // Set current item
      const positionInfo = {
        originalEvent: new Event("click"),
        pageX: 10,
        pageY: 10,
        target: node1.element as HTMLElement,
      };

      dragAndDropHandler.mouseCapture(positionInfo);

      expect(dragAndDropHandler.currentItem?.node).toBe(node1);

      // Call refresh
      dragAndDropHandler.refresh();

      expect(dragAndDropHandler.hitAreas).toMatchObject([
        expect.objectContaining({
          bottom: 38,
          node: node2,
          position: "inside",
          top: 20,
        }),
        expect.objectContaining({
          bottom: 56,
          node: node2,
          position: "after",
          top: 38,
        }),
      ]);
    });

    it("doesn't generates hit areas when the tree is set to null", () => {
      const tree = new Node(null, true);
      const node1 = new Node({ name: "node1" });
      tree.addChild(node1);
      const node2 = new Node({ name: "node2" });
      tree.addChild(node2);

      const getTree = vi.fn(() => null);

      const { dragAndDropHandler } = createDragAndDropHandler({
        getTree,
        tree,
      });

      // Set current item
      const positionInfo = {
        originalEvent: new Event("click"),
        pageX: 10,
        pageY: 10,
        target: node1.element as HTMLElement,
      };

      dragAndDropHandler.mouseCapture(positionInfo);

      expect(dragAndDropHandler.currentItem?.node).toBe(node1);

      // Call refresh
      dragAndDropHandler.refresh();

      expect(dragAndDropHandler.hitAreas).toBeEmpty();
    });
  });
});

/*
The example tree, with the hit areas it has while leaf1 is dragged. The tree
is 100px wide and, with the margin for dropping after the last node, 116px
high.

  leaf1
  closed (closed folder)   inside 20-30, after 30-40
    c1
  open (open folder)       inside 40-60
    o1                     inside 60-67, after 67-74
                           (open) after 74-81
  leaf2                    inside 80-98, after 98-116
*/
const createExampleTree = () => {
  const tree = new Node(null, true);

  tree.loadFromData([
    { name: "leaf1" },
    { children: [{ name: "c1" }], name: "closed" },
    { children: [{ name: "o1" }], is_open: true, name: "open" },
    { name: "leaf2" },
  ]);

  return tree;
};

const startDragging = ({
  nodeName = "leaf1",
  pageX: startX = 10,
  pageY: startY = 10,
  ...params
}: Partial<CreateDragAndDropHandlerParams> & {
  nodeName?: string;
  pageX?: number;
  pageY?: number;
} = {}) => {
  const tree = params.tree ?? createExampleTree();
  const result = createDragAndDropHandler({ ...params, tree });
  const { dragAndDropHandler, treeElement } = result;
  const draggedNode = tree.getNodeByNameMustExist(nodeName);

  const positionInfo = {
    originalEvent: new Event("mousedown"),
    pageX: startX,
    pageY: startY,
    target: draggedNode.element as HTMLElement,
  };

  dragAndDropHandler.mouseCapture(positionInfo);
  dragAndDropHandler.mouseStart(positionInfo);

  const dragTo = (pageX: number, pageY: number) =>
    dragAndDropHandler.mouseDrag({
      originalEvent: new Event("mousemove"),
      pageX,
      pageY,
      target: treeElement,
    });

  const drop = (pageX: number, pageY: number) => {
    dragAndDropHandler.mouseStop({
      originalEvent: new Event("mouseup"),
      pageX,
      pageY,
      target: treeElement,
    });
  };

  return { ...result, draggedNode, dragTo, drop, tree };
};

const getDropHints = () =>
  document.querySelectorAll(".tree-element-border, .tree-element-ghost");

describe("DragAndDropHandler with the example tree", () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("finding the hovered area", () => {
    it.each([
      { nodeName: "closed", pageX: 50, pageY: 20, position: "inside" },
      { nodeName: "leaf2", pageX: 50, pageY: 100, position: "after" },
      { nodeName: "open", pageX: 0, pageY: 50, position: "inside" },
      { nodeName: "open", pageX: 100, pageY: 50, position: "inside" },
      { nodeName: "leaf2", pageX: 50, pageY: 116, position: "after" },
    ])(
      "finds $nodeName $position at ($pageX, $pageY)",
      ({ nodeName, pageX, pageY, position }) => {
        const { dragAndDropHandler, dragTo, tree } = startDragging();

        dragTo(pageX, pageY);

        expect(dragAndDropHandler.hoveredArea).toMatchObject({
          node: tree.getNodeByNameMustExist(nodeName),
          position,
        });
      },
    );

    it.each([
      { pageX: -1, pageY: 50 },
      { pageX: 101, pageY: 50 },
      { pageX: 50, pageY: -1 },
      { pageX: 50, pageY: 117 },
    ])(
      "finds nothing outside the tree at ($pageX, $pageY)",
      ({ pageX, pageY }) => {
        const { dragAndDropHandler, dragTo } = startDragging();

        dragTo(pageX, pageY);

        expect(dragAndDropHandler.hoveredArea).toBeNull();
      },
    );

    it("finds the area at the top edge of the tree", () => {
      // While leaf1 is dragged no area starts at the top, so drag leaf2
      const { dragAndDropHandler, dragTo, tree } = startDragging({
        nodeName: "leaf2",
        pageY: 90,
      });

      dragTo(50, 0);

      expect(dragAndDropHandler.hoveredArea).toMatchObject({
        node: tree.getNodeByNameMustExist("leaf1"),
      });
    });

    it("moves the bounds of the tree with the horizontal scroll", () => {
      const { dragAndDropHandler, dragTo } = startDragging({ scrollLeft: 50 });

      dragTo(20, 50);

      expect(dragAndDropHandler.hoveredArea).toBeNull();

      dragTo(120, 50);

      expect(dragAndDropHandler.hoveredArea).toMatchObject({
        position: "inside",
      });
    });
  });

  describe("starting a drag", () => {
    it("keeps the drag element at the same offset from the mouse", () => {
      // o1 is at 10, 60, so the mouse is 5px right of and below its corner
      const { dragTo } = startDragging({
        nodeName: "o1",
        pageX: 15,
        pageY: 65,
      });

      dragTo(50, 90);

      expect(document.querySelector(".tree-element-dragging")).toHaveStyle({
        left: "45px",
        top: "85px",
      });
    });

    it("escapes the node name in the drag element by default", () => {
      const tree = new Node(null, true);
      tree.loadFromData([{ name: "<b>leaf1</b>" }, { name: "leaf2" }]);

      startDragging({ nodeName: "<b>leaf1</b>", tree });

      const dragElement = document.querySelector(".tree-element-dragging");

      expect(dragElement).toHaveTextContent("<b>leaf1</b>");
    });
  });

  describe("opening a folder while dragging", () => {
    it("opens a closed folder that stays hovered, also when the mouse moves within it", () => {
      vi.useFakeTimers();
      const openNode = vi.fn(() => Promise.resolve());
      const { dragTo, tree } = startDragging({
        openFolderDelay: 100,
        openNode,
      });

      dragTo(50, 22);
      vi.advanceTimersByTime(60);
      dragTo(50, 28);
      vi.advanceTimersByTime(50);

      expect(openNode).toHaveBeenCalledExactlyOnceWith(
        tree.getNodeByNameMustExist("closed"),
      );
    });

    it("doesn't open a closed folder when the mouse moves on to an open folder", () => {
      vi.useFakeTimers();
      const openNode = vi.fn(() => Promise.resolve());
      const { dragTo } = startDragging({ openFolderDelay: 100, openNode });

      dragTo(50, 25);
      vi.advanceTimersByTime(50);
      dragTo(50, 50);
      vi.advanceTimersByTime(100);

      expect(openNode).not.toHaveBeenCalled();
    });

    it("opens only the last of two hovered closed folders", () => {
      vi.useFakeTimers();
      const tree = new Node(null, true);
      tree.loadFromData([
        { name: "leaf1" },
        { children: [{ name: "a1" }], name: "closedA" },
        { children: [{ name: "b1" }], name: "closedB" },
      ]);
      const openNode = vi.fn(() => Promise.resolve());
      const { dragAndDropHandler, dragTo } = startDragging({
        openFolderDelay: 100,
        openNode,
        tree,
      });

      dragTo(50, 25);
      vi.advanceTimersByTime(50);
      dragTo(50, 45);

      expect(dragAndDropHandler.hoveredArea).toMatchObject({
        node: tree.getNodeByNameMustExist("closedB"),
        position: "inside",
      });

      vi.advanceTimersByTime(200);

      expect(openNode).toHaveBeenCalledExactlyOnceWith(
        tree.getNodeByNameMustExist("closedB"),
      );
    });

    it("doesn't open a folder for the area after a closed folder, an open folder or a leaf", () => {
      vi.useFakeTimers();
      const openNode = vi.fn(() => Promise.resolve());
      const { dragTo } = startDragging({ openFolderDelay: 100, openNode });

      dragTo(50, 35);
      vi.advanceTimersByTime(200);
      dragTo(50, 50);
      vi.advanceTimersByTime(200);
      dragTo(50, 90);
      vi.advanceTimersByTime(200);

      expect(openNode).not.toHaveBeenCalled();
    });

    it("updates the hit areas and the drop hint after the folder is opened", async () => {
      vi.useFakeTimers();
      const tree = createExampleTree();
      const closed = tree.getNodeByNameMustExist("closed");

      // Like the tree, render the folder again after opening it
      const openNode = vi.fn((node: Node) => {
        node.is_open = true;
        document.body.replaceChildren();
        generateHtmlElementsForTree(tree);
        return Promise.resolve();
      });

      const { dragAndDropHandler, dragTo } = startDragging({
        openFolderDelay: 100,
        openNode,
        tree,
      });

      dragTo(50, 25);
      await vi.advanceTimersByTimeAsync(100);

      expect(openNode).toHaveBeenCalledExactlyOnceWith(closed);
      expect(
        dragAndDropHandler.hitAreas.map((area) => area.node.name),
      ).toContain("c1");
      expect(
        (closed.element as HTMLElement).querySelector(
          ".tree-element-border, .tree-element-ghost",
        ),
      ).not.toBeNull();
    });
  });

  describe("drop hints", () => {
    it("replaces the drop hint when another area is hovered", () => {
      const { dragTo } = startDragging();

      dragTo(50, 25);

      expect(getDropHints()).toHaveLength(1);

      dragTo(50, 50);

      expect(getDropHints()).toHaveLength(1);
    });

    it("removes the drop hint when the mouse leaves the tree", () => {
      const { dragTo } = startDragging();

      dragTo(50, 25);
      dragTo(-10, 50);

      expect(getDropHints()).toBeEmpty();
    });
  });

  describe("dropping", () => {
    it("cleans up after the drop", () => {
      const { dragAndDropHandler, draggedNode, dragTo, drop, treeElement } =
        startDragging();

      // Cancel the move, so the tree is not re-rendered
      treeElement.addEventListener("tree.move", (e) => {
        e.preventDefault();
      });

      dragTo(50, 25);
      drop(50, 25);

      expect(document.querySelector(".tree-element-dragging")).toBeNull();
      expect(getDropHints()).toBeEmpty();
      expect(dragAndDropHandler.hitAreas).toBeEmpty();
      expect(dragAndDropHandler.currentItem).toBeNull();
      expect(draggedNode.element).not.toHaveClass("tree-element-moving");
    });

    it("opens the folder that a node is dropped into and renders the tree again", () => {
      const { dragTo, drop, refreshElements, tree, treeElement } =
        startDragging();
      const closed = tree.getNodeByNameMustExist("closed");

      dragTo(50, 25);
      drop(50, 25);

      expect(closed.is_open).toBeTrue();
      expect(treeElement).toBeEmptyDOMElement();
      expect(refreshElements).toHaveBeenCalledExactlyOnceWith(null);
    });

    it("doesn't open a folder that a node is dropped after", () => {
      const { dragTo, drop, tree } = startDragging();

      dragTo(50, 35);
      drop(50, 35);

      expect(tree.getNodeByNameMustExist("closed").is_open).not.toBeTrue();
    });
  });

  describe("refresh", () => {
    it("clears the hit areas when there is no current item", () => {
      const { dragAndDropHandler } = startDragging();

      dragAndDropHandler.currentItem = null;
      dragAndDropHandler.refresh();

      expect(dragAndDropHandler.hitAreas).toBeEmpty();
    });

    it("marks the element of the dragged node as moving after it is rendered again", () => {
      const { dragAndDropHandler, draggedNode } = startDragging();

      const newElement = document.createElement("li");
      draggedNode.element = newElement;
      dragAndDropHandler.refresh();

      expect(newElement).toHaveClass("tree-element-moving");
    });

    it("doesn't mark the node as moving before the drag has started", () => {
      const tree = createExampleTree();
      const { dragAndDropHandler } = createDragAndDropHandler({ tree });
      const leaf1 = tree.getNodeByNameMustExist("leaf1");

      dragAndDropHandler.mouseCapture({
        originalEvent: new Event("mousedown"),
        pageX: 10,
        pageY: 10,
        target: leaf1.element as HTMLElement,
      });
      dragAndDropHandler.refresh();

      expect(leaf1.element).not.toHaveClass("tree-element-moving");
    });
  });

  it.each(["select", "textarea"])(
    "doesn't capture the node when a %s element is clicked",
    (tagName) => {
      const tree = createExampleTree();
      const { dragAndDropHandler } = createDragAndDropHandler({ tree });
      const element = document.createElement(tagName);
      (tree.getNodeByNameMustExist("leaf1").element as HTMLElement).append(
        element,
      );

      expect(
        dragAndDropHandler.mouseCapture({
          originalEvent: new Event("mousedown"),
          pageX: 10,
          pageY: 10,
          target: element,
        }),
      ).toBeNull();
    },
  );
});
