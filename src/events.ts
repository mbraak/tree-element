import type { Node, NodeData, Position } from "./node";

export interface MoveInfo {
    doMove: () => void;
    movedNode: Node;
    originalEvent: Event;
    position: Position;
    previousParent: Node | null;
    targetNode: Node;
}

// The CustomEvent of a tree event, for example `TreeEvent<"tree.select">`.
export type TreeEvent<Name extends TreeEventName = TreeEventName> = CustomEvent<
    TreeEvents[Name]
>;

export type TreeEventName = keyof TreeEvents;

// The events that the tree dispatches, and the type of their `detail`.
// `undefined` means that the event has no `detail`.
// The events reference in the docs is generated from this interface, so the
// events are ordered chronologically instead of alphabetically.
/* eslint-disable perfectionist/sort-interfaces */
export interface TreeEvents {
    /**
     * Dispatched once, after the tree is rendered for the first time. With
     * `dataUrl` this is after the data has arrived, so it is the moment the
     * api is safe to use:
     *
     * ```js
     * element.addEventListener("tree.init", () => {
     *   tree.selectNode(tree.getNodeByName("node1"));
     * });
     * ```
     *
     * No `detail`.
     *
     * With inline `data`, the tree is rendered inside the constructor, so
     * this event has already fired by the time the constructor returns. Add
     * the listener to the element _before_ creating the tree:
     *
     * ```js
     * const element = document.getElementById("tree1");
     *
     * element.addEventListener("tree.init", () => {
     *   // ...
     * });
     *
     * const tree = new TreeElement({ data, htmlElement: element });
     * ```
     *
     * @group Lifecycle
     */
    "tree.init": undefined;
    /**
     * Dispatched after the tree has been re-rendered. No `detail`.
     *
     * @group Lifecycle
     */
    "tree.refresh": undefined;
    /**
     * Dispatched when a node title is clicked. Call `preventDefault()` to
     * stop the tree from selecting the node:
     *
     * ```js
     * element.addEventListener("tree.click", (e) => {
     *   e.preventDefault();
     *   console.log("clicked", e.detail.node.name, "but not selected");
     * });
     * ```
     *
     * @group Mouse
     */
    "tree.click": {
        node: Node;
        originalEvent: MouseEvent;
    };
    /**
     * Dispatched when a node title is double clicked.
     *
     * @group Mouse
     */
    "tree.dblclick": {
        node: Node;
        originalEvent: MouseEvent;
    };
    /**
     * Dispatched on a right click on a node, unless `useContextMenu` is
     * `false`. The browser's own menu is suppressed.
     *
     * @group Mouse
     */
    "tree.contextmenu": {
        node: Node;
        originalEvent: MouseEvent;
    };
    /**
     * Dispatched when a folder is opened, after the animation.
     *
     * @group Opening and closing
     */
    "tree.open": {
        node: Node;
    };
    /**
     * Dispatched when a folder is closed, after the animation.
     *
     * @group Opening and closing
     */
    "tree.close": {
        node: Node;
    };
    /**
     * Dispatched when a node is selected. A deselection is
     * [`tree.deselect`](#tree-deselect) instead, so `node` is always a node
     * here.
     *
     * ```js
     * element.addEventListener("tree.select", (e) => {
     *   console.log("selected", e.detail.node.name);
     * });
     * ```
     *
     * @group Selection
     */
    "tree.select": {
        /** The node that was selected before, if any. */
        deselectedNode: Node | null;
        /** The node that is now selected. */
        node: Node;
    };
    /**
     * Dispatched when the selected node is deselected, which happens when it
     * is clicked again or passed to `selectNode` again. No `tree.select` is
     * dispatched for it.
     *
     * ```js
     * element.addEventListener("tree.deselect", (e) => {
     *   console.log("deselected", e.detail.node.name);
     * });
     * ```
     *
     * Selecting another node does not dispatch it — that is a `tree.select`
     * with the previous node in `deselectedNode`. It is also not dispatched
     * with `mustToggle: false`, or by `selectNode(null)`,
     * `removeFromSelection`, `removeNode`, `loadData` and restoring a saved
     * state.
     *
     * @group Selection
     */
    "tree.deselect": {
        node: Node;
    };
    /**
     * Dispatched when a node is dropped after a drag.
     *
     * | `detail`                  | Type                              |
     * | ------------------------- | --------------------------------- |
     * | `moveInfo.movedNode`      | `Node`                            |
     * | `moveInfo.targetNode`     | `Node`                            |
     * | `moveInfo.position`       | `"before" \| "after" \| "inside"` |
     * | `moveInfo.previousParent` | `Node \| null`                    |
     * | `moveInfo.originalEvent`  | `Event`                           |
     * | `moveInfo.doMove`         | `() => void`                      |
     *
     * Call `preventDefault()` to keep the tree as it is, and
     * `moveInfo.doMove()` to apply the move later. See
     * [Drag and drop](/guide/drag-and-drop#reacting-to-a-move).
     *
     * @group Drag and drop
     */
    "tree.move": {
        /** @hidden The fields are in the table above. */
        moveInfo: MoveInfo;
    };
    /**
     * Dispatched when data is set on the tree, both from the `data` option
     * and from a url.
     *
     * @group Loading data
     */
    "tree.set_data": {
        /** The node whose children were replaced, if it was a subtree. */
        node?: Node;
        treeData?: NodeData[];
    };
    /**
     * Dispatched when a request starts.
     *
     * @group Loading data
     */
    "tree.loading_data": {
        element: HTMLElement;
        /** The node whose children are loading, if it is a subtree. */
        node?: Node;
    };
    /**
     * Dispatched when a request finishes. It is dispatched when the request
     * fails too; a [`tree.load_failed`](#tree-load-failed) follows it.
     *
     * @group Loading data
     */
    "tree.loaded_data": {
        element: HTMLElement;
        /** The node whose children were loaded, if it was a subtree. */
        node?: Node;
    };
    /**
     * Dispatched when a request returns an error status or fails with a
     * network error, after `tree.loaded_data`:
     *
     * ```js
     * element.addEventListener("tree.load_failed", (e) => {
     *   if (e.detail.response) {
     *     console.error("loading the tree failed", e.detail.response.status);
     *   } else {
     *     console.error("loading the tree failed", e.detail.error);
     *   }
     * });
     * ```
     *
     * @group Loading data
     */
    "tree.load_failed": {
        /** The error thrown by `fetch`, if the request failed with a network error. */
        error?: unknown;
        /** The response, if the request returned an error status. */
        response?: Response;
    };
}
/* eslint-enable perfectionist/sort-interfaces */

type TreeEventMap = {
    [Name in TreeEventName]: TreeEvent<Name>;
};

// Type `addEventListener("tree.select", ...)` on elements, the document and the window.
declare global {
    interface DocumentEventMap extends TreeEventMap { }

    interface HTMLElementEventMap extends TreeEventMap { }

    interface WindowEventMap extends TreeEventMap { }
}
