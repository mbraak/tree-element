# Selection

Clicking a node selects it. The selected node gets the `tree-element-selected` class, and the tree
dispatches [`tree.select`](../reference/events#tree-select). Clicking the selected node deselects it,
which dispatches [`tree.deselect`](../reference/events#tree-deselect).

<TreeDemo demo="basic" events />

Click a node to select it, then use the arrow keys — the event log shows what the tree reports.

Set `selectable: false` to turn selection off entirely:

```js
new TreeElement({
  data,
  htmlElement,
  selectable: false,
});
```

## From code

```js group=selection
const node = tree.getNodeById(1);

tree.selectNode(node);
tree.getSelectedNode(); // the node, or null
```

`selectNode(null)` clears the selection. Selecting a node opens its parents, so the node is
visible.

By default `selectNode` moves focus to the node. Pass `mustSetFocus: false` to leave focus where it
is, and `mustToggle: true` to deselect the node when it is already selected:

```js group=selection
tree.selectNode(node, { mustSetFocus: false });
tree.selectNode(node, { mustToggle: true });
```

## Multiple nodes

`addToSelection` and `removeFromSelection` extend the selection instead of replacing it, and
`getSelectedNodes` returns all of them:

```js
tree.addToSelection(tree.getNodeById(1));
tree.addToSelection(tree.getNodeById(2));

tree.getSelectedNodes(); // [node1, node2]

tree.removeFromSelection(tree.getNodeById(1));
tree.isNodeSelected(tree.getNodeById(2)); // true
```

Clicking still selects a single node — multiple selection is an api feature, so if you want
ctrl-click to add to the selection, wire it up yourself:

```js
element.addEventListener("tree.click", (e) => {
  const { originalEvent, node } = e.detail;

  if (originalEvent.ctrlKey || originalEvent.metaKey) {
    originalEvent.preventDefault(); // stop the default single selection
    if (tree.isNodeSelected(node)) {
      tree.removeFromSelection(node);
    } else {
      tree.addToSelection(node);
    }
  }
});
```

## Vetoing a selection

`onCanSelectNode` is called before a node is selected. Return `false` to refuse:

```js
new TreeElement({
  data,
  htmlElement,
  onCanSelectNode: (node) => node.isFolder(),
});
```

Only the folders in this tree can be selected; clicking a leaf does nothing:

<TreeDemo demo="onlyFoldersSelectable" />

## Keyboard navigation

Keyboard support is on by default (`keyboardSupport: true`) and works when the focus is on the
tree:

| Key          | Action                                                              |
| ------------ | ------------------------------------------------------------------- |
| `ArrowDown`  | Select the next visible node.                                       |
| `ArrowUp`    | Select the previous visible node.                                   |
| `ArrowRight` | Open a closed folder, or move to the first child of an open folder. |
| `ArrowLeft`  | Close an open folder, or move to the parent.                        |

The tree element is focusable through `tabIndex`, which defaults to `0`. Set it to `-1` to keep
the tree out of the tab order, or to another value to place it explicitly.

`moveUp` and `moveDown` do the same as the arrow keys from code:

```js
tree.moveDown();
tree.moveUp();
```

## Scrolling a node into view

`scrollToNode` scrolls the tree — or the scrolling container it lives in — so a node is visible:

```js
tree.scrollToNode(tree.getNodeById(1));
```
