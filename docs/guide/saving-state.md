# Saving state

With `saveState`, the tree remembers which nodes are open and which node is selected, and restores
them the next time the page is loaded:

```js
new TreeElement({
  data,
  htmlElement,
  saveState: true,
});
```

Open a few folders in this tree, select a node, then reload the page — it comes back the way you left
it:

<TreeDemo demo="saveState" />

::: info
This demo stores its state under the key `tree-element-docs-demo`, so it does not collide with anything
else on the page. Clear it with `localStorage.removeItem("tree-element-docs-demo")`.
:::

The state is stored in `localStorage` under the key `tree`. Pass a string to choose the key
yourself — do that when there is more than one tree on the page:

```js
new TreeElement({
  data,
  htmlElement,
  saveState: "my-tree",
});
```

State is keyed on node ids, so nodes need an `id` for this to work.

## What is stored

A json object with the ids of the open nodes and of the selected node:

```json
{ "open_nodes": [1, 3], "selected_node": [4] }
```

## Reading and writing state yourself

`getState` returns the current state, `getStateFromStorage` the stored one, and `setState` applies a
state to the tree:

```js
const state = tree.getState();
// { open_nodes: [1, 3], selected_node: [4] }

tree.setState(state);
```

`getState` reflects the tree as it is now, whether or not `saveState` is enabled. When `saveState`
is enabled, `setState` also saves the state it applied to storage.

## Storing state somewhere else

Override where the state is kept with `onSetStateFromStorage` and `onGetStateFromStorage`. Both work
with the state as a json string:

```js
new TreeElement({
  data,
  htmlElement,
  onGetStateFromStorage: () => sessionStorage.getItem("my-tree"),
  onSetStateFromStorage: (state) => {
    sessionStorage.setItem("my-tree", state);
  },
  saveState: true,
});
```

Use this to keep the state on the server, or to put it in a cookie.

## With loading on demand

Nodes that were open in the saved state but are marked
[`load_on_demand`](./loading-on-demand) are fetched before they are opened, and the id of the node
to select is sent along with the initial request as a `selected_node` query parameter:

```
GET /my-tree/?selected_node=4
```

The server can use it to return the branches needed to reveal that node.

## Opening nodes without saved state

If you only want the first levels open on every page load, use `autoOpen` instead of saving state:

```js
new TreeElement({
  autoOpen: 1, // open the first two levels
  data,
  htmlElement,
});
```

`autoOpen: true` opens all levels, `false` (the default) opens none, and a number opens that many
levels starting at `0`.
