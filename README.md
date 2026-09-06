# Html-tree

Tree widget in plain javascript. No jQuery, no framework, no runtime dependencies.

- Loads data from a javascript array or from a url
- Drag and drop, with autoscroll
- Keyboard support
- Saves the open and selected nodes to local storage
- Right-to-left support
- Written in Typescript, ships with type declarations

Full documentation: https://mbraak.github.io/tree-element/

## Install

```sh
npm install tree-element
```

Or use the bundle directly with a script tag; it exposes a global `TreeElement`:

```html
<link rel="stylesheet" href="tree_element.css" />
<script src="tree_element.js"></script>
```

## Usage

```js fixture=standalone
import TreeElement from "tree-element";
import "tree-element/tree_element.css";

const tree = new TreeElement({
  htmlElement: document.getElementById("tree"),
  data: [
    {
      name: "Saurischia",
      id: 1,
      children: [
        { name: "Herrerasaurians", id: 2 },
        { name: "Theropods", id: 3 },
      ],
    },
  ],
  autoOpen: 0,
  dragAndDrop: true,
});
```

`htmlElement` is required. Every other key is an option.

Nodes are plain objects. `name` is displayed, `children` nests, and `id` is
optional but needed for `getNodeById` and for saving state. Any other key you
set is kept on the node and can be read back with `getNodesByProperty`.

### Loading from a url

```js
new TreeElement({
  htmlElement: document.getElementById("tree"),
  dataUrl: "/nodes/",
});
```

The url can also be set with a `data-url` attribute on the element. Pass a
function to compute it per node, which is how load-on-demand works: set
`load_on_demand: true` on a node and its children are fetched when it opens.

```js
new TreeElement({
  htmlElement: document.getElementById("tree"),
  dataUrl: (node) => (node ? `/nodes/?node=${node.id}` : "/nodes/"),
});
```

## Options

| Option            | Default              | Description                                                                       |
| ----------------- | -------------------- | --------------------------------------------------------------------------------- |
| `animationSpeed`  | `"fast"`             | `"fast"`, `"slow"`, or a number of milliseconds                                   |
| `autoEscape`      | `true`               | Escape node names. Set to `false` to render html in a name                        |
| `autoOpen`        | `false`              | `true` opens everything, a number opens that many levels (`0` is the first level) |
| `buttonLeft`      | `true`               | Put the open/close button left of the title                                       |
| `classPrefix`     | `"tree-element"`        | The prefix of all css classes                                                     |
| `closedIcon`      | `►` (`◄` in rtl)     | Html string or element                                                            |
| `commonClassName` | `"tree-element-common"` | The class that every element gets                                                 |
| `data`            |                      | The nodes to display                                                              |
| `dataFilter`      |                      | Transforms the response of `dataUrl` into node data                               |
| `dataUrl`         | `data-url` attribute | Url, or a function returning a url                                                |
| `dragAndDrop`     | `false`              | Enable drag and drop                                                              |
| `keyboardSupport` | `true`               | Navigate with the arrow keys                                                      |
| `nodeClass`       | `Node`               | Subclass of `Node` to use for nodes                                               |
| `openFolderDelay` | `500`                | Milliseconds before a folder opens while dragging over it. `false` disables it    |
| `openedIcon`      | `▼`                  | Html string or element                                                            |
| `rtl`             | `data-rtl` attribute | Right-to-left rendering                                                           |
| `saveState`       | `false`              | `true`, or a string to use as the storage key                                     |
| `selectable`      | `true`               | Allow selecting nodes                                                             |
| `showEmptyFolder` | `false`              | Show the open/close button for nodes without children                             |
| `slide`           | `true`               | Animate opening and closing                                                       |
| `startDndDelay`   | `300`                | Milliseconds to hold before a drag starts                                         |
| `tabIndex`        | `0`                  | Tab index of the tree element                                                     |
| `treeClassName`   | `"tree-element"`        | The class of the root `ul`                                                        |
| `useContextMenu`  | `true`               | Fire `tree.contextmenu` on right click                                            |

### Callbacks

| Option                  | Signature                                 | Description                                                               |
| ----------------------- | ----------------------------------------- | ------------------------------------------------------------------------- |
| `onCanMove`             | `(node) => boolean`                       | May this node be dragged?                                                 |
| `onCanMoveTo`           | `(node, targetNode, position) => boolean` | May it be dropped here? `position` is `"before"`, `"after"` or `"inside"` |
| `onCanSelectNode`       | `(node) => boolean`                       | May this node be selected?                                                |
| `onCreateLi`            | `(node, li, isSelected) => void`          | Customise the `li` element of a node                                      |
| `onDragMove`            | `(node, event) => void`                   | Called while dragging                                                     |
| `onDragStop`            | `(node, event) => void`                   | Called when a drag ends                                                   |
| `onGetStateFromStorage` | `() => string`                            | Read saved state yourself                                                 |
| `onSetStateFromStorage` | `(data) => void`                          | Write saved state yourself                                                |
| `onIsMoveHandle`        | `(element) => boolean`                    | Is this element a drag handle?                                            |

## Events

Events are `CustomEvent`s dispatched on the tree element. They bubble, and the
payload is on `event.detail`.

```js
element.addEventListener("tree.select", (e) => {
  console.log(e.detail.node);
});
```

| Event               | `detail`                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| `tree.init`         |                                                                                                    |
| `tree.click`        | `node`, `originalEvent`                                                                            |
| `tree.dblclick`     | `node`, `originalEvent`                                                                            |
| `tree.contextmenu`  | `node`, `originalEvent`                                                                            |
| `tree.select`       | `node`, `deselectedNode`                                                                           |
| `tree.deselect`     | `node`                                                                                             |
| `tree.open`         | `node`                                                                                             |
| `tree.close`        | `node`                                                                                             |
| `tree.move`         | `moveInfo` with `movedNode`, `targetNode`, `position`, `previousParent`, `doMove`, `originalEvent` |
| `tree.refresh`      |                                                                                                    |
| `tree.set_data`     | `treeData`, `node`                                                                                 |
| `tree.loading_data` | `node`, `element`                                                                                  |
| `tree.loaded_data`  | `node`, `element`                                                                                  |
| `tree.load_failed`  | `response`                                                                                         |

`tree.click` and `tree.move` act on `event.preventDefault()`: it stops the node
from being selected, and stops the move. For `tree.move`, call
`e.detail.moveInfo.doMove()` later to perform the move yourself. The other
events are dispatched as cancelable, but nothing acts on it.

## Methods

Nodes are `Node` instances. Get one with `getNodeById`, `getNodeByName`,
`getNodeByCallback`, `getNodesByProperty` or `getNode` (from a dom element).

**Data**: `loadData(data, parentNode?)`, `loadDataFromUrl(url?, parentNode?)`, `toJson()`, `refresh()`

**Nodes**: `appendNode(data, parentNode)`, `prependNode(data, parentNode)`, `addNodeAfter(data, node)`, `addNodeBefore(data, node)`, `addParentNode(data, node)`, `updateNode(node, data)`, `removeNode(node)`, `moveNode(node, targetNode, position)`

**Opening**: `openNode(node, slide?)`, `closeNode(node, slide?)`, `toggle(node, slide?)`

**Selection**: `selectNode(node, options?)`, `getSelectedNode()`, `getSelectedNodes()`, `isNodeSelected(node)`, `addToSelection(node, mustSetFocus?)`, `removeFromSelection(node)`, `moveUp()`, `moveDown()`

**State**: `getState()`, `setState(state)`, `getStateFromStorage()`

**Other**: `scrollToNode(node)`, `isDragging()`, `refreshHitAreas()`, `setOption(name, value)`, `getTree()`, `getVersion()`, `deinit()`

## Typescript

The public types are exported from the package entry point:

```ts fixture=standalone
import TreeElement from "tree-element";
import type {
  TreeElementOptions,
  Node,
  NodeData,
  NodeId,
  SavedState,
} from "tree-element";

const options: Partial<TreeElementOptions> = { dragAndDrop: true };
const data: NodeData[] = [{ name: "root", id: 1 }];
```

`Node` is exported as a type only, so it cannot be used with `instanceof`.

## Entry points

|                           |                                                              |
| ------------------------- | ------------------------------------------------------------ |
| `import "tree-element"`      | `lib/index.js`, unbundled es modules                         |
| `require`, script tag     | `tree_element.js`, minified iife exposing the global `TreeElement` |
| `tree-element/tree_element.css` | The stylesheet                                               |

`tree_element.debug.js` is the same bundle without minification.

The es modules in `lib` are minified by your own bundler. Private members are
prefixed with `_`, so add the same terser setting the bundled build uses to get
the same size:

```js ignore
terser({ mangle: { properties: { regex: /^_/ } } });
```

## Development

```sh
pnpm install
pnpm devserver     # http://localhost:8080
pnpm production    # build the bundles, lib and the css
pnpm docs-check    # type-check the code snippets in the docs
pnpm ci            # lint, typecheck, check the docs and test
```

`pnpm test` runs the vitest unit tests and the playwright browser tests.

### Releasing

Describe the changes under "Unreleased" in `CHANGELOG.md` as you go. To release,
make sure `master` is pushed and CI is green, then run:

```sh
pnpm release patch    # or minor, major, or an explicit version
```

This bumps the version, moves the unreleased changes in the changelog to the new
version, commits, tags `v<version>` and pushes. The
[Release workflow](.github/workflows/release.yml) then runs the checks, publishes
to npm with provenance and creates the GitHub release.

## License

Apache-2.0. See [LICENSE](LICENSE).
