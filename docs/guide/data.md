# Data

## Node data

The `data` option takes an array of node records. A record needs a `name`; everything else is
optional:

```js
const data = [
  { name: "node1", id: 1 },
  { name: "node2", id: 2 },
];
```

Nest children with the `children` key, to any depth:

```js
const data = [
  {
    name: "parent",
    id: 1,
    children: [
      { name: "child1", id: 2 },
      { name: "child2", id: 3, children: [{ name: "grandchild", id: 4 }] },
    ],
  },
];
```

A node can also be a plain string, which is shorthand for `{ name: "..." }`:

```js
const data = ["node1", "node2"];
```

### Reserved keys

| Key              | Type                 | Meaning                                                        |
| ---------------- | -------------------- | -------------------------------------------------------------- |
| `name`           | `string`             | The label that is displayed. `label` also works, as a legacy alias. |
| `id`             | `number \| string`   | Used by `getNodeById`, by [saving state](./saving-state) and by [loading on demand](./loading-on-demand). |
| `children`       | `NodeData[]`         | The child nodes.                                               |
| `load_on_demand` | `boolean`            | Mark the node as a folder whose children are fetched when it is opened. |

Nodes without an `id` render fine, but `getNodeById`, `saveState` and load-on-demand all key off
the id, so give your nodes ids unless you are certain you need none of that.

### Extra properties

Any other key is copied onto the [`Node`](../reference/node) object, so you can attach your own
data and read it back later:

```js
const data = [{ name: "node1", id: 1, color: "green" }];

// later
tree.getNodeById(1).color; // "green"
```

`getNodesByProperty` searches on those properties:

```js
tree.getNodesByProperty("color", "green");
```

## Escaping

Node names are escaped by default, so html in a name is displayed literally rather than being
rendered. Set `autoEscape: false` if you want names to be treated as html:

```js
new TreeElement({
  autoEscape: false,
  data: [{ name: "<b>node1</b>" }],
  htmlElement,
});
```

Only turn this off for data you control — with `autoEscape: false`, node names from a database or
an api become an html injection route.

## Replacing the data

`loadData` replaces the whole tree:

```js
tree.loadData([{ name: "node1" }, { name: "node2" }]);
```

Pass a parent node to replace just that node's children:

```js
tree.loadData([{ name: "child1" }, { name: "child2" }], tree.getNodeById(1));
```

## Loading from a url

`dataUrl` fetches the data instead of taking it inline. The response must be json in the same
format as `data`:

```js
new TreeElement({
  dataUrl: "/my-tree/",
  htmlElement,
});
```

You can also put the url on the element:

```html
<div id="tree1" data-url="/my-tree/"></div>
```

Use `dataFilter` when the server returns the nodes wrapped in something else:

```js ignore
new TreeElement({
  dataFilter: (response) => response.nodes,
  dataUrl: "/my-tree/",
  htmlElement,
});
```

When the request fails, the tree dispatches a [`tree.load_failed`](../reference/events#tree-load-failed)
event. It has the `Response` when the server returned an error status, or the
`error` when the request failed with a network error:

```js
element.addEventListener("tree.load_failed", (e) => {
  if (e.detail.response) {
    console.error("loading the tree failed", e.detail.response.status);
  } else {
    console.error("loading the tree failed", e.detail.error);
  }
});
```

To fetch subtrees lazily instead of the whole tree at once, see
[Loading on demand](./loading-on-demand).

## Reading the data back

`toJson` serializes the current tree, including changes made through the api:

```js
const json = tree.toJson();
```

`Node.getData` gives you the same structure as a javascript array:

```js
tree.getTree().getData();
```
