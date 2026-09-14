# Drag and drop

Set `dragAndDrop: true` to let the user move nodes with the mouse or by touch:

```js
new TreeElement({
  data,
  dragAndDrop: true,
  htmlElement,
});
```

Drag a node in this tree — onto a folder, or between two nodes:

<TreeDemo demo="dragAndDrop" events />

While dragging, a ghost element shows where the node will land: a line between two nodes for a
`before` or `after` drop, and a highlight on the folder for an `inside` drop. Dragging over a closed
folder opens it after `openFolderDelay` milliseconds (500 by default; `false` disables it).

Dragging starts after `startDndDelay` milliseconds (300 by default), so a plain click still selects
instead of starting a drag.

## Restricting moves

`onCanMove` decides whether a node may be dragged at all:

```js
new TreeElement({
  dragAndDrop: true,
  htmlElement,
  onCanMove: (node) => node.name !== "locked",
});
```

`onCanMoveTo` decides whether a specific drop is allowed. It gets the dragged node, the node it is
dropped on and the position (`"before"`, `"after"` or `"inside"`):

```js
new TreeElement({
  dragAndDrop: true,
  htmlElement,
  onCanMoveTo: (movedNode, targetNode, position) => {
    // only allow dropping into folders, never between nodes
    return position === "inside" && targetNode.isFolder();
  },
});
```

In this tree, that `onCanMoveTo` is in effect: a node can only be dropped _into_ a folder, and the
line between two nodes never appears.

<TreeDemo demo="dragIntoFoldersOnly" />

A move that both hooks allow is applied by the tree itself.

## Reacting to a move

The `tree.move` event fires when a node is dropped. Its `moveInfo` describes the move:

```js
element.addEventListener("tree.move", (e) => {
  const info = e.detail.moveInfo;

  console.log("moved", info.movedNode.name);
  console.log("relative to", info.targetNode.name, "at", info.position);
  console.log("out of", info.previousParent.name);
});
```

This is the place to tell the server:

```js
element.addEventListener("tree.move", (e) => {
  const info = e.detail.moveInfo;

  void fetch("/move-node/", {
    body: JSON.stringify({
      node: info.movedNode.id,
      position: info.position,
      target: info.targetNode.id,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
});
```

Call `preventDefault()` to stop the tree from applying the move, and `moveInfo.doMove()` to apply
it later — for instance after the server has confirmed it:

```js
element.addEventListener("tree.move", (e) => {
  const info = e.detail.moveInfo;

  e.preventDefault();

  void fetch("/move-node/", { method: "POST" /* ... */ }).then((response) => {
    if (response.ok) {
      info.doMove();
    }
  });
});
```

## Drag handles

By default the whole node title is a drag handle. `onIsMoveHandle` narrows that to specific
elements:

```js
new TreeElement({
  dragAndDrop: true,
  htmlElement,
  onIsMoveHandle: (element) => element.classList.contains("drag-handle"),
});
```

Combine it with `onCreateLi` to render the handle:

```js
new TreeElement({
  dragAndDrop: true,
  htmlElement,
  onCreateLi: (node, li) => {
    const handle = document.createElement("span");
    handle.className = "drag-handle";
    handle.textContent = "☰";
    li.querySelector(".tree-element-element")?.prepend(handle);
  },
  onIsMoveHandle: (element) => element.classList.contains("drag-handle"),
});
```

## Following the drag

`onDragMove` is called while a node is being dragged, `onDragStop` when the drag ends. Both get the
node and the underlying event:

```js
new TreeElement({
  dragAndDrop: true,
  htmlElement,
  onDragMove: (node, event) => {
    console.log("dragging", node.name, event);
  },
  onDragStop: (node) => {
    console.log("stopped dragging", node.name);
  },
});
```

`isDragging()` tells you whether a drag is in progress:

```js
if (tree.isDragging()) {
  // ...
}
```

## Moving nodes from code

`moveNode` does the same as a drop, without any user interaction:

```js
tree.moveNode(tree.getNodeById(2), tree.getNodeById(1), "inside");
```

## After changing the layout

Hit areas are computed when a drag starts. If you change the tree's size or position mid-drag, call
`refreshHitAreas()`:

```js
tree.refreshHitAreas();
```

## Leaving drag and drop out

Drag and drop is a sizable part of the library. If you don't use it, import the tree from
`tree-element/core` instead of `tree-element`. It is the same class with the same api and types,
but without the drag and drop code, so your bundle gets smaller:

```js fixture=standalone
import TreeElement from "tree-element/core";
import "tree-element/tree_element.css";

const tree = new TreeElement({
  data: [{ name: "node1", id: 1 }],
  htmlElement: document.getElementById("tree"),
});
```

On this tree the `dragAndDrop` option has no effect, `isDragging()` is always false and
`refreshHitAreas()` does nothing. `moveNode` still works: it doesn't depend on drag and drop.

Without a bundler, load `tree_element.core.js` instead of `tree_element.js`. It defines the same
global `TreeElement`.
