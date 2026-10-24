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

Set `multiSelect: true` to let the user select more than one node. A click adds a node to the
selection, or removes it when it is already selected; the other selected nodes stay selected.

```js
new TreeElement({
  data,
  htmlElement,
  multiSelect: true,
});
```

Set `multiSelect` in the constructor; changing it later with `setOption` is not supported.

A click dispatches [`tree.select`](../reference/events#tree-select) or
[`tree.deselect`](../reference/events#tree-deselect) for the clicked node, with `deselectedNode`
set to `null`. `onCanSelectNode` is respected. The tree gets `aria-multiselectable="true"`, so
screen readers announce it as a multiselect tree.

With the keyboard, the arrow keys, `Home` and `End` move the focus without changing the selection,
and `Space` adds the focused node to the selection or removes it. See
[Keyboard navigation](#keyboard-navigation).

From code, `addToSelection` and `removeFromSelection` extend the selection instead of replacing
it, and `getSelectedNodes` returns all of them. These work with or without `multiSelect`:

```js
tree.addToSelection(tree.getNodeById(1));
tree.addToSelection(tree.getNodeById(2));

tree.getSelectedNodes(); // [node1, node2]

tree.removeFromSelection(tree.getNodeById(1));
tree.isNodeSelected(tree.getNodeById(2)); // true
```

`getSelectedNode` returns the first selected node.

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
| `Home`       | Select the first node.                                              |
| `End`        | Select the last visible node.                                       |
| `Enter`      | Dispatch [`tree.activate`](/reference/events#tree-activate).        |

The selected node is focusable through `tabIndex`, which defaults to `0`. When no node is selected,
the first node is focusable instead, so keyboard users can always reach the tree. `ArrowDown`,
`ArrowRight` or `Space` on that node selects it, and `Enter` activates it. The other nodes get `tabindex="-1"`. Set `tabIndex`
to `-1` to keep the tree out of the tab order, or to another value to place it explicitly.

### With `multiSelect`

With `multiSelect: true` the keys move the focus instead of the selection, so the user can move to
other nodes without losing the selected ones:

| Key          | Action                                                                            |
| ------------ | --------------------------------------------------------------------------------- |
| `ArrowDown`  | Focus the next visible node.                                                      |
| `ArrowUp`    | Focus the previous visible node.                                                  |
| `ArrowRight` | Open a closed folder, or focus the first child of an open folder.                 |
| `ArrowLeft`  | Close an open folder, or focus the parent.                                        |
| `Home`       | Focus the first node.                                                             |
| `End`        | Focus the last visible node.                                                      |
| `Space`      | Add the focused node to the selection, or remove it.                              |
| `Enter`      | Dispatch [`tree.activate`](/reference/events#tree-activate) for the focused node. |

The tree has one tab stop: the node that had the focus last, whether it is selected or not. Before
the tree is focused, that is the first node.

`moveUp` and `moveDown` do the same as the arrow keys from code, so with `multiSelect` they move
the focus:

```js
tree.moveDown();
tree.moveUp();
```

## Scrolling a node into view

`scrollToNode` scrolls the tree — or the scrolling container it lives in — so a node is visible:

```js
tree.scrollToNode(tree.getNodeById(1));
```
