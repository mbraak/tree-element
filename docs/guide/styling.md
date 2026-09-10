# Styling

The widget needs `tree_element.css` to look like a tree: it removes the list bullets, indents the
levels, hides closed folders and draws the drag-and-drop hints. Everything else — colors, fonts,
spacing — is meant to be overridden.

The stylesheet is generated from `css/tree_element.postcss` by `pnpm production`.

## Markup

A tree renders as nested lists:

```html
<ul class="tree-element-common tree-element" role="tree">
  <li class="tree-element-common tree-element-folder" role="none">
    <div class="tree-element-element tree-element-common" role="none">
      <a class="tree-element-toggler tree-element-common tree-element-toggler-left">►</a>
      <span
        class="tree-element-title tree-element-common tree-element-title-folder tree-element-title-button-left"
        role="treeitem"
        >parent</span
      >
    </div>
    <ul class="tree-element-common" role="group">
      <li class="tree-element-common" role="none">
        <div class="tree-element-element tree-element-common" role="none">
          <span
            class="tree-element-title tree-element-common tree-element-title-button-left"
            >child</span
          >
        </div>
      </li>
    </ul>
  </li>
</ul>
```

Note that all selectors in the stylesheet are nested under `ul.tree-element`, so your own rules should
be too — or be specific enough to win.

## Class names

| Class                     | Applied to                                                   |
| ------------------------- | ------------------------------------------------------------ |
| `tree-element`               | The root `ul`.                                               |
| `tree-element-common`        | Every element the widget creates.                            |
| `tree-element-element`       | The `div` that wraps a node's toggler and title.             |
| `tree-element-title`         | The `span` with the node name.                               |
| `tree-element-folder`        | An `li` for a node that has children.                        |
| `tree-element-closed`        | A closed folder — on the `li` and on its toggler.            |
| `tree-element-toggler`       | The open/close button.                                       |
| `tree-element-toggler-left`  | The toggler when `buttonLeft` is true (the default).         |
| `tree-element-toggler-right` | The toggler when `buttonLeft` is false.                      |
| `tree-element-title-folder`  | The title of a folder node.                                  |
| `tree-element-selected`      | The `li` of a selected node.                                 |
| `tree-element-loading`       | A node — or the tree — that is fetching data.                |
| `tree-element-rtl`           | The root `ul` when `rtl` is true.                            |
| `tree-element-dnd`           | The root `ul` when `dragAndDrop` is true.                    |
| `tree-element-ghost`         | The drop hint while dragging.                                |
| `tree-element-inside`        | The drop hint for a drop _inside_ a folder.                  |
| `tree-element-moving`        | The node that is being dragged.                              |
| `tree-element-border`        | The border drawn around a folder that is being dropped into. |

## Changing the class names

All classes start with `tree-element`. The `classPrefix` option changes that prefix:

```js
new TreeElement({
  classPrefix: "my-tree",
  data,
  htmlElement,
});
```

The markup from the top of this page then looks like this:

```html
<ul class="my-tree-common my-tree" role="tree">
  <li class="my-tree-common my-tree-folder" role="none">
    <div class="my-tree-element my-tree-common" role="none">
      <a class="my-tree-toggler my-tree-common my-tree-toggler-left">►</a>
      <span
        class="my-tree-title my-tree-common my-tree-title-folder my-tree-title-button-left"
        role="treeitem"
        >parent</span
      >
    </div>
    <ul class="my-tree-common" role="group">
      <li class="my-tree-common" role="none">
        <div class="my-tree-element my-tree-common" role="none">
          <span class="my-tree-title my-tree-common my-tree-title-button-left"
            >child</span
          >
        </div>
      </li>
    </ul>
  </li>
</ul>
```

Two of the classes are not `<prefix>-<something>`, so they have an option of their own:
`treeClassName` for the class of the root `ul` — `classPrefix` by default — and `commonClassName` for
the class that every element gets — `<classPrefix>-common` by default.

```js
new TreeElement({
  commonClassName: "tree-node",
  data,
  htmlElement,
  treeClassName: "tree",
});
```

Note that `tree_element.css` has the default prefix baked in: a tree with another prefix is unstyled
until you provide your own css. Take `css/tree_element.postcss` as the starting point — replacing
`tree-element` in it with your prefix gives you the same stylesheet for your class names.

## Overriding styles

Selection colors, for example:

```css
ul.tree-element li.tree-element-selected > .tree-element-element,
ul.tree-element li.tree-element-selected > .tree-element-element:hover {
  background: #1c4257;
  color: #fff;
  text-shadow: none;
}
```

Indentation:

```css
ul.tree-element ul.tree-element-common {
  margin-left: 24px;
}
```

## Folder icons

The togglers are text by default: `►` for a closed folder and `▼` for an open one. Replace them with
`closedIcon` and `openedIcon`, which take an html string or an element:

```js
new TreeElement({
  closedIcon: "+",
  data,
  htmlElement,
  openedIcon: "−",
});
```

<TreeDemo demo="icons" />

An element works too, which is how you use an svg or an icon font:

```js
const icon = document.createElement("i");
icon.className = "fa fa-folder";

new TreeElement({
  closedIcon: icon,
  data,
  htmlElement,
});
```

Put the toggler after the title instead of before it with `buttonLeft: false`:

<TreeDemo demo="buttonRight" />

## Right to left

`rtl: true` mirrors the tree — the indentation, the togglers and the drag-and-drop hints all move to
the other side — and flips the default closed icon to `◀`:

```js
new TreeElement({
  data,
  htmlElement,
  rtl: true,
});
```

<TreeDemo demo="rtl" />

You can also set it on the element:

```html
<div id="tree1" data-rtl="true"></div>
```

The mirroring comes from the `tree-element-rtl` class that the option adds to the root `ul`, so it is
all in `tree_element.css`: if you replace the stylesheet, carry those rules over.

## Customizing the markup

`onCreateLi` is called for every node, with the node, its `li` element and whether it is selected.
Use it to add your own content:

```js
new TreeElement({
  data,
  htmlElement,
  onCreateLi: (node, li, isSelected) => {
    const title = li.querySelector(".tree-element-title");

    if (node.count) {
      const badge = document.createElement("span");
      badge.className = "count";
      badge.textContent = String(node.count);
      title.after(badge);
    }
  },
});
```

Keep in mind that the `li` is rebuilt whenever the node is refreshed, so `onCreateLi` has to be able
to run again — build the markup from the node data rather than mutating what is already there.

## Empty folders

A node with `children: []` is rendered as a leaf. Set `showEmptyFolder: true` to render it as a
folder that can be opened and closed:

```js
new TreeElement({
  data: [
    { name: "empty folder", id: 1, children: [] },
    { name: "leaf", id: 2 },
  ],
  htmlElement,
  showEmptyFolder: true,
});
```

<TreeDemo demo="showEmptyFolder" />

## Animation

Opening and closing folders slides by default. Turn it off with `slide: false`, or change the speed
with `animationSpeed`, which takes `"fast"`, `"slow"` or a number of milliseconds:

```js
new TreeElement({
  animationSpeed: 200,
  data,
  htmlElement,
});
```

This tree has `slide: false`, so folders open and close instantly:

<TreeDemo demo="withoutSlide" />
