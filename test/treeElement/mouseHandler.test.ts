import type { TriggerEvent } from "treeElement/methodTypes";
import type {
  GetMouseDelay,
  GetNode,
  MouseCapture,
  MouseStart,
} from "treeElement/mouseHandler";
import type { PositionInfo } from "treeElement/mouseUtils";

import MouseHandler from "treeElement/mouseHandler";
import { Node } from "treeElement/node";
import { vi } from "vitest";

import defaultClassNames from "../support/classNames";

interface CreateMouseHandlerParams {
  element: HTMLElement;
  getMouseDelay?: GetMouseDelay;
  getNode?: GetNode;
  onClickButton?: (node: Node) => Promise<void>;
  onClickTitle?: (node: Node) => void;
  onMouseCapture?: MouseCapture;
  onMouseDrag?: (positionInfo: PositionInfo) => void;
  onMouseStart?: MouseStart;
  onMouseStop?: (positionInfo: PositionInfo) => void;
  triggerEvent?: TriggerEvent;
  useContextMenu?: boolean;
}

const createMouseHandler = ({
  element,
  getMouseDelay = vi.fn(() => 0),
  getNode = vi.fn(),
  onClickButton = vi.fn(),
  onClickTitle = vi.fn(),
  onMouseCapture = vi.fn(),
  onMouseDrag = vi.fn(),
  onMouseStart = vi.fn(),
  onMouseStop = vi.fn(),
  triggerEvent = vi.fn(),
  useContextMenu = true,
}: CreateMouseHandlerParams) => {
  const mouseHandler = new MouseHandler({
    classNames: defaultClassNames,
    element,
    getMouseDelay,
    getNode,
    onClickButton,
    onClickTitle,
    onMouseCapture,
    onMouseDrag,
    onMouseStart,
    onMouseStop,
    triggerEvent,
    useContextMenu,
  });

  // A drag adds listeners to the document. Remove them after the test, so that
  // the handler of an earlier test can't react to the events of a later one.
  onTestFinished(() => {
    mouseHandler.deinit();
  });

  return mouseHandler;
};

describe("handleClick", () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it("handles a button click", () => {
    const element = document.createElement("div");

    const button = document.createElement("button");
    button.classList.add("tree-element-toggler");
    element.append(button);

    document.body.append(element);

    const node = new Node();

    const getNode = vi.fn((element: HTMLElement) => {
      return element === button ? node : null;
    });

    const onClickButton = vi.fn();

    createMouseHandler({ element, getNode, onClickButton });

    const onBodyClick = vi.fn();
    document.body.addEventListener("click", onBodyClick);
    onTestFinished(() => {
      document.body.removeEventListener("click", onBodyClick);
    });

    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    button.dispatchEvent(event);

    expect(onClickButton).toHaveBeenCalledExactlyOnceWith(node);
    expect(event.defaultPrevented).toBeTrue();
    expect(onBodyClick).not.toHaveBeenCalled();
  });

  it("handles a click with an empty target", () => {
    const element = document.createElement("div");
    const onClickButton = vi.fn();
    createMouseHandler({ element, onClickButton });

    const event = new MouseEvent("click");
    vi.spyOn(event, "target", "get").mockReturnValue(null);

    element.dispatchEvent(event);

    expect(onClickButton).not.toHaveBeenCalled();
  });

  it("calls onClickTitle when a title is clicked", () => {
    const element = document.createElement("div");

    const label = document.createElement("div");
    label.classList.add("tree-element-element");
    element.append(label);

    document.body.append(element);

    const node = new Node();

    const getNode = vi.fn((element: HTMLElement) => {
      return element === label ? node : null;
    });

    const triggerEvent = vi.fn<TriggerEvent>(() => true);
    const onClickTitle = vi.fn();

    createMouseHandler({ element, getNode, onClickTitle, triggerEvent });

    const event = new MouseEvent("click", { bubbles: true });
    label.dispatchEvent(event);

    expect(triggerEvent).toHaveBeenCalledExactlyOnceWith("tree.click", {
      node,
      originalEvent: event,
    });
    expect(onClickTitle).toHaveBeenCalledExactlyOnceWith(node);
  });

  it("doesn't call onClickTitle when the tree.click event is cancelled", () => {
    const element = document.createElement("div");

    const label = document.createElement("div");
    label.classList.add("tree-element-element");
    element.append(label);

    document.body.append(element);

    const node = new Node();

    const getNode = vi.fn((element: HTMLElement) => {
      return element === label ? node : null;
    });

    const triggerEvent = vi.fn<TriggerEvent>(() => false);
    const onClickTitle = vi.fn();

    createMouseHandler({ element, getNode, onClickTitle, triggerEvent });

    const event = new MouseEvent("click", { bubbles: true });
    label.dispatchEvent(event);

    expect(onClickTitle).not.toHaveBeenCalled();
  });
});

describe("handleContextmenu", () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it("handles a context menu event on a node", () => {
    const treeElement = document.createElement("ul");
    treeElement.classList.add("tree-element");
    document.body.append(treeElement);

    const nodeElement = document.createElement("div");
    nodeElement.className = "tree-element-element";
    treeElement.append(nodeElement);

    const node = new Node();

    const getNode = vi.fn((element: HTMLElement) => {
      return element === nodeElement ? node : null;
    });

    const triggerEvent = vi.fn<TriggerEvent>();

    createMouseHandler({ element: nodeElement, getNode, triggerEvent });

    const onBodyContextmenu = vi.fn();
    document.body.addEventListener("contextmenu", onBodyContextmenu);
    onTestFinished(() => {
      document.body.removeEventListener("contextmenu", onBodyContextmenu);
    });

    const event = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
    });
    nodeElement.dispatchEvent(event);

    expect(triggerEvent).toHaveBeenCalledExactlyOnceWith("tree.contextmenu", {
      node,
      originalEvent: event,
    });
    expect(event.defaultPrevented).toBeTrue();
    expect(onBodyContextmenu).not.toHaveBeenCalled();
  });

  it("ignores a context menu event when useContextMenu is false", () => {
    const treeElement = document.createElement("ul");
    treeElement.classList.add("tree-element");
    document.body.append(treeElement);

    const nodeElement = document.createElement("div");
    nodeElement.className = "tree-element-element";
    treeElement.append(nodeElement);

    const triggerEvent = vi.fn<TriggerEvent>();

    createMouseHandler({
      element: nodeElement,
      getNode: () => new Node(),
      triggerEvent,
      useContextMenu: false,
    });

    const event = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
    });
    nodeElement.dispatchEvent(event);

    expect(triggerEvent).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBeFalse();
  });

  it("handles a context menu event that's not on a node", () => {
    const element = document.createElement("div");
    document.body.append(element);

    const getNode = vi.fn(() => null);
    const triggerEvent = vi.fn<TriggerEvent>();

    createMouseHandler({ element, getNode, triggerEvent });

    const event = new MouseEvent("contextmenu", { bubbles: true });
    element.dispatchEvent(event);

    expect(triggerEvent).not.toHaveBeenCalled();
  });

  it("handles a context menu event without a target", () => {
    const element = document.createElement("div");
    document.body.append(element);

    const triggerEvent = vi.fn<TriggerEvent>();

    createMouseHandler({ element, triggerEvent });

    const event = new MouseEvent("contextmenu", { bubbles: true });
    vi.spyOn(event, "target", "get").mockReturnValue(null);

    element.dispatchEvent(event);

    expect(triggerEvent).not.toHaveBeenCalled();
  });
});

describe("handleDblclick", () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it("handles a double click on a label", () => {
    const element = document.createElement("div");

    const label = document.createElement("div");
    label.classList.add("tree-element-element");
    element.append(label);

    document.body.append(element);

    const node = new Node();

    const getNode = vi.fn((element: HTMLElement) => {
      return element === label ? node : null;
    });

    const triggerEvent = vi.fn<TriggerEvent>();

    createMouseHandler({ element, getNode, triggerEvent });

    const event = new MouseEvent("dblclick", { bubbles: true });
    label.dispatchEvent(event);

    expect(triggerEvent).toHaveBeenCalledExactlyOnceWith("tree.dblclick", {
      node,
      originalEvent: event,
    });
  });

  it("handles a double click event without a target", () => {
    const element = document.createElement("div");
    document.body.append(element);

    const triggerEvent = vi.fn<TriggerEvent>();

    createMouseHandler({ element, triggerEvent });

    const event = new MouseEvent("dblclick", { bubbles: true });
    vi.spyOn(event, "target", "get").mockReturnValue(null);

    element.dispatchEvent(event);

    expect(triggerEvent).not.toHaveBeenCalled();
  });
});

describe("touchStart", () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it("handles a touchstart event", () => {
    const element = document.createElement("div");
    document.body.append(element);

    const onMouseCapture = vi.fn<MouseCapture>();

    createMouseHandler({ element, onMouseCapture });

    const touch = {
      pageX: 0,
      pageY: 0,
    };

    const event = new TouchEvent("touchstart", {
      bubbles: true,
      touches: [touch as Touch],
    });
    element.dispatchEvent(event);

    expect(onMouseCapture).toHaveBeenCalledExactlyOnceWith({
      originalEvent: event,
      pageX: 0,
      pageY: 0,
      target: undefined,
    });
  });

  it("handles a touchstart event with multiple touches", () => {
    const element = document.createElement("div");
    document.body.append(element);

    const onMouseCapture = vi.fn<MouseCapture>();

    createMouseHandler({ element, onMouseCapture });

    const touch = {
      pageX: 0,
      pageY: 0,
    } as Touch;

    const event = new TouchEvent("touchstart", {
      bubbles: true,
      touches: [touch, touch],
    });
    element.dispatchEvent(event);

    expect(onMouseCapture).not.toHaveBeenCalled();
  });

  it("handles a touchstart event without touches", () => {
    const element = document.createElement("div");
    document.body.append(element);

    const onMouseCapture = vi.fn<MouseCapture>();

    createMouseHandler({ element, onMouseCapture });

    const event = new TouchEvent("touchstart", {
      bubbles: true,
      touches: [],
    });
    element.dispatchEvent(event);

    expect(onMouseCapture).not.toHaveBeenCalled();
  });
});

describe("touchEnd", () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it("handles a touchend event after a touchstart and a touchmove event", () => {
    const element = document.createElement("div");
    document.body.append(element);

    const onMouseCapture = vi.fn(() => true);
    const onMouseStart = vi.fn(() => true);
    const onMouseStop = vi.fn();

    createMouseHandler({
      element,
      onMouseCapture,
      onMouseStart,
      onMouseStop,
    });

    const touch = {
      pageX: 0,
      pageY: 0,
    };

    const touchStartEvent = new TouchEvent("touchstart", {
      bubbles: true,
      touches: [touch as Touch],
    });
    element.dispatchEvent(touchStartEvent);

    const touchMoveEvent = new TouchEvent("touchmove", {
      bubbles: true,
      touches: [touch as Touch],
    });
    element.dispatchEvent(touchMoveEvent);

    const touchEndEvent = new TouchEvent("touchend", {
      bubbles: true,
      touches: [touch as Touch],
    });
    element.dispatchEvent(touchEndEvent);

    expect(onMouseStop).toHaveBeenCalledExactlyOnceWith({
      originalEvent: touchEndEvent,
      pageX: 0,
      pageY: 0,
    });
  });

  it("handles a touchend with multiple touches", () => {
    const element = document.createElement("div");
    document.body.append(element);

    const onMouseCapture = vi.fn(() => true);
    const onMouseStart = vi.fn(() => true);
    const onMouseStop = vi.fn();

    createMouseHandler({
      element,
      onMouseCapture,
      onMouseStart,
      onMouseStop,
    });

    const touch = {
      pageX: 0,
      pageY: 0,
    } as Touch;

    const touchStartEvent = new TouchEvent("touchstart", {
      bubbles: true,
      touches: [touch],
    });
    element.dispatchEvent(touchStartEvent);

    const touchMoveEvent = new TouchEvent("touchmove", {
      bubbles: true,
      touches: [touch],
    });
    element.dispatchEvent(touchMoveEvent);

    const touchEndEvent = new TouchEvent("touchend", {
      bubbles: true,
      touches: [touch, touch],
    });
    element.dispatchEvent(touchEndEvent);

    expect(onMouseStop).not.toHaveBeenCalled();
  });
});

describe("touchMove", () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it("handles a touchmove event without touches", () => {
    const element = document.createElement("div");
    document.body.append(element);

    const onMouseCapture = vi.fn(() => true);
    const onMouseDrag = vi.fn();

    createMouseHandler({
      element,
      onMouseCapture,
      onMouseDrag,
    });

    const touch = {
      pageX: 0,
      pageY: 0,
    } as Touch;

    const touchStartEvent = new TouchEvent("touchstart", {
      bubbles: true,
      touches: [touch],
    });
    element.dispatchEvent(touchStartEvent);

    const touchMoveEvent = new TouchEvent("touchmove", {
      bubbles: true,
      touches: [],
    });
    element.dispatchEvent(touchMoveEvent);

    expect(onMouseDrag).not.toHaveBeenCalled();
  });

  it("handles a touchmove event with multiple touches", () => {
    const element = document.createElement("div");
    document.body.append(element);

    const onMouseCapture = vi.fn(() => true);
    const onMouseDrag = vi.fn();
    const onMouseStart = vi.fn(() => true);

    createMouseHandler({
      element,
      onMouseCapture,
      onMouseDrag,
      onMouseStart,
    });

    const touch = {
      pageX: 0,
      pageY: 0,
    } as Touch;

    const touchStartEvent = new TouchEvent("touchstart", {
      bubbles: true,
      touches: [touch],
    });
    element.dispatchEvent(touchStartEvent);

    const touchMoveEvent = new TouchEvent("touchmove", {
      bubbles: true,
      touches: [touch, touch],
    });
    element.dispatchEvent(touchMoveEvent);

    expect(onMouseDrag).not.toHaveBeenCalled();
  });
});

describe("mouseMove", () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls onMouseStart when the delay is met and there is a mouse move", () => {
    vi.useFakeTimers();

    const treeElement = document.createElement("ul");
    treeElement.classList.add("tree-element");
    document.body.append(treeElement);

    const nodeElement = document.createElement("div");
    nodeElement.className = "tree-element-element";
    treeElement.append(nodeElement);

    const node = new Node();

    const getNode = vi.fn((element: HTMLElement) => {
      return element === nodeElement ? node : null;
    });

    const getMouseDelay = vi.fn(() => 1000);
    const onMouseCapture = vi.fn(() => true);
    const onMouseStart = vi.fn(() => true);

    createMouseHandler({
      element: nodeElement,
      getMouseDelay,
      getNode,
      onMouseCapture,
      onMouseStart,
    });

    nodeElement.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

    nodeElement.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));

    expect(onMouseStart).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1500);

    nodeElement.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));

    expect(onMouseStart).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        target: nodeElement,
      }),
    );
  });

  it("calls onMouseStart when mousedown is triggered twice", () => {
    vi.useFakeTimers();

    const treeElement = document.createElement("ul");
    treeElement.classList.add("tree-element");
    document.body.append(treeElement);

    const nodeElement = document.createElement("div");
    nodeElement.className = "tree-element-element";
    treeElement.append(nodeElement);

    const node = new Node();

    const getNode = vi.fn((element: HTMLElement) => {
      return element === nodeElement ? node : null;
    });

    const getMouseDelay = vi.fn(() => 1000);
    const onMouseCapture = vi.fn(() => true);
    const onMouseStart = vi.fn(() => true);

    createMouseHandler({
      element: nodeElement,
      getMouseDelay,
      getNode,
      onMouseCapture,
      onMouseStart,
    });

    nodeElement.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

    vi.advanceTimersByTime(600);

    nodeElement.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

    vi.advanceTimersByTime(600);

    expect(onMouseStart).not.toHaveBeenCalled();

    nodeElement.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

    vi.advanceTimersByTime(600);

    nodeElement.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));

    expect(onMouseStart).not.toHaveBeenCalled();

    vi.advanceTimersByTime(600);

    nodeElement.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));

    expect(onMouseStart).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        target: nodeElement,
      }),
    );
  });
});

const createDragHandler = ({
  getMouseDelay = () => 0,
  onMouseCapture = vi.fn<MouseCapture>(() => true),
  onMouseStart = vi.fn<MouseStart>(() => true),
}: {
  getMouseDelay?: GetMouseDelay;
  onMouseCapture?: MouseCapture;
  onMouseStart?: MouseStart;
} = {}) => {
  const element = document.createElement("div");
  document.body.append(element);

  const onMouseDrag = vi.fn<(positionInfo: PositionInfo) => void>();
  const onMouseStop = vi.fn<(positionInfo: PositionInfo) => void>();

  const mouseHandler = createMouseHandler({
    element,
    getMouseDelay,
    onMouseCapture,
    onMouseDrag,
    onMouseStart,
    onMouseStop,
  });

  return {
    element,
    mouseHandler,
    onMouseCapture,
    onMouseDrag,
    onMouseStart,
    onMouseStop,
  };
};

const dispatchMouseEvent = (
  element: HTMLElement,
  type: string,
  init: MouseEventInit = {},
) => {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  element.dispatchEvent(event);
  return event;
};

const withEvent = (event: Event): unknown =>
  expect.objectContaining({ originalEvent: event });

describe("dragging", () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("prevents the default of a mousedown that is captured", () => {
    const { element } = createDragHandler();

    const mouseDown = dispatchMouseEvent(element, "mousedown");

    expect(mouseDown.defaultPrevented).toBeTrue();
  });

  it("starts the drag on the first mousemove", () => {
    const { element, onMouseDrag, onMouseStart } = createDragHandler();

    const mouseDown = dispatchMouseEvent(element, "mousedown");
    const move = dispatchMouseEvent(element, "mousemove");

    expect(onMouseStart).toHaveBeenCalledExactlyOnceWith(withEvent(mouseDown));
    expect(onMouseDrag).toHaveBeenCalledExactlyOnceWith(withEvent(move));
    expect(move.defaultPrevented).toBeTrue();
  });

  it("keeps dragging on the following mousemove events", () => {
    const { element, onMouseDrag, onMouseStart } = createDragHandler();

    const mouseDown = dispatchMouseEvent(element, "mousedown");
    dispatchMouseEvent(element, "mousemove");
    const move = dispatchMouseEvent(element, "mousemove");

    expect(onMouseStart).toHaveBeenCalledExactlyOnceWith(withEvent(mouseDown));
    expect(onMouseDrag).toHaveBeenCalledTimes(2);
    expect(onMouseDrag).toHaveBeenLastCalledWith(withEvent(move));
    expect(move.defaultPrevented).toBeTrue();
  });

  it("stops the drag on mouseup", () => {
    const { element, onMouseDrag, onMouseStop } = createDragHandler();

    dispatchMouseEvent(element, "mousedown");
    const move = dispatchMouseEvent(element, "mousemove");
    const mouseUp = dispatchMouseEvent(element, "mouseup");

    // The move and up listeners are removed after the drag
    dispatchMouseEvent(element, "mousemove");
    dispatchMouseEvent(element, "mouseup");

    // A new mousedown doesn't stop the finished drag again
    dispatchMouseEvent(element, "mousedown");

    expect(onMouseDrag).toHaveBeenCalledExactlyOnceWith(withEvent(move));
    expect(onMouseStop).toHaveBeenCalledExactlyOnceWith(withEvent(mouseUp));
  });

  it("doesn't call onMouseStop for a mouseup without a drag", () => {
    const { element, onMouseStop } = createDragHandler();

    dispatchMouseEvent(element, "mousedown");
    dispatchMouseEvent(element, "mouseup");

    expect(onMouseStop).not.toHaveBeenCalled();
  });

  it("ignores a mousedown that onMouseCapture doesn't capture", () => {
    const { element, onMouseStart } = createDragHandler({
      onMouseCapture: () => false,
    });

    const mouseDown = dispatchMouseEvent(element, "mousedown");
    dispatchMouseEvent(element, "mousemove");

    expect(mouseDown.defaultPrevented).toBeFalse();
    expect(onMouseStart).not.toHaveBeenCalled();
  });

  it("ignores a mousedown with another button than the left one", () => {
    const { element, onMouseCapture } = createDragHandler();

    const mouseDown = dispatchMouseEvent(element, "mousedown", { button: 2 });

    expect(onMouseCapture).not.toHaveBeenCalled();
    expect(mouseDown.defaultPrevented).toBeFalse();
  });

  it("gives up the drag when onMouseStart refuses it", () => {
    const { element, onMouseDrag, onMouseStart } = createDragHandler({
      onMouseStart: vi.fn(() => false),
    });

    const mouseDown = dispatchMouseEvent(element, "mousedown");
    const move = dispatchMouseEvent(element, "mousemove");

    expect(onMouseDrag).not.toHaveBeenCalled();
    expect(move.defaultPrevented).toBeFalse();

    // The move listener is removed, so there is no second attempt
    dispatchMouseEvent(element, "mousemove");

    expect(onMouseStart).toHaveBeenCalledExactlyOnceWith(withEvent(mouseDown));
  });

  it("stops a drag whose mouseup was missed on the next mousedown", () => {
    const { element, onMouseStop } = createDragHandler();

    dispatchMouseEvent(element, "mousedown");
    dispatchMouseEvent(element, "mousemove");
    const secondMouseDown = dispatchMouseEvent(element, "mousedown");

    expect(onMouseStop).toHaveBeenCalledExactlyOnceWith(
      withEvent(secondMouseDown),
    );
  });

  it("restarts the mouse delay on a new mousedown", () => {
    vi.useFakeTimers();

    const { element, onMouseStart } = createDragHandler({
      getMouseDelay: () => 1000,
    });

    dispatchMouseEvent(element, "mousedown");
    vi.advanceTimersByTime(600);
    dispatchMouseEvent(element, "mouseup");

    vi.advanceTimersByTime(100);
    const secondMouseDown = dispatchMouseEvent(element, "mousedown");

    // The timer of the first mousedown would have ended here
    vi.advanceTimersByTime(400);
    dispatchMouseEvent(element, "mousemove");

    expect(onMouseStart).not.toHaveBeenCalled();

    vi.advanceTimersByTime(600);
    dispatchMouseEvent(element, "mousemove");

    expect(onMouseStart).toHaveBeenCalledExactlyOnceWith(
      withEvent(secondMouseDown),
    );
  });

  it("drags with touch events and prevents scrolling", () => {
    const { element, onMouseDrag, onMouseStop } = createDragHandler();
    const touch = { pageX: 0, pageY: 0 } as Touch;

    element.dispatchEvent(
      new TouchEvent("touchstart", { bubbles: true, touches: [touch] }),
    );

    const move = new TouchEvent("touchmove", {
      bubbles: true,
      cancelable: true,
      touches: [touch],
    });
    element.dispatchEvent(move);

    const end = new TouchEvent("touchend", { bubbles: true, touches: [touch] });
    element.dispatchEvent(end);

    expect(onMouseDrag).toHaveBeenCalledExactlyOnceWith(withEvent(move));
    expect(move.defaultPrevented).toBeTrue();
    expect(onMouseStop).toHaveBeenCalledExactlyOnceWith(withEvent(end));
  });
});

describe("deinit", () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it("removes the event listeners", () => {
    const treeElement = document.createElement("ul");
    treeElement.classList.add("tree-element");
    document.body.append(treeElement);

    const nodeElement = document.createElement("div");
    nodeElement.className = "tree-element-element";
    treeElement.append(nodeElement);

    const onMouseCapture = vi.fn(() => true);
    const triggerEvent = vi.fn<TriggerEvent>(() => true);

    const mouseHandler = createMouseHandler({
      element: nodeElement,
      getNode: () => new Node(),
      onMouseCapture,
      triggerEvent,
    });

    mouseHandler.deinit();

    dispatchMouseEvent(nodeElement, "click");
    dispatchMouseEvent(nodeElement, "dblclick");
    dispatchMouseEvent(nodeElement, "contextmenu");
    dispatchMouseEvent(nodeElement, "mousedown");
    nodeElement.dispatchEvent(
      new TouchEvent("touchstart", {
        bubbles: true,
        touches: [{ pageX: 0, pageY: 0 } as Touch],
      }),
    );

    expect(triggerEvent).not.toHaveBeenCalled();
    expect(onMouseCapture).not.toHaveBeenCalled();
  });

  it("removes the listeners of a drag in progress", () => {
    const { element, mouseHandler, onMouseDrag, onMouseStop } =
      createDragHandler();

    dispatchMouseEvent(element, "mousedown");
    const move = dispatchMouseEvent(element, "mousemove");

    mouseHandler.deinit();

    dispatchMouseEvent(element, "mousemove");
    dispatchMouseEvent(element, "mouseup");

    expect(onMouseDrag).toHaveBeenCalledExactlyOnceWith(withEvent(move));
    expect(onMouseStop).not.toHaveBeenCalled();
  });
});
