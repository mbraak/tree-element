# Changelog

All notable changes to tree-element are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows
[Semantic Versioning](https://semver.org/).

## Unreleased

### Added

- The keys `Home` and `End` select the first and the last visible node.
- The key `Enter` dispatches the new event `tree.activate`, for example to open
  the edit page of the node.
- The options `ariaLabel` and `ariaLabelledBy` give the tree an accessible name.
- The colors in `tree_element.css` are css custom properties, such as
  `--tree-element-title-color`, so you can change them or add a dark theme. See
  [Styling](https://mbraak.github.io/tree-element/guide/styling#colors).

### Fixed

- The tree can be reached with the tab key when no node is selected.
- Do not set `aria-label` for tree nodes. Rely on the node text instead.
- Screen readers no longer read the open/close toggler. It has
  `aria-hidden="true"`; `aria-expanded` on the node already has the state.

### Changed

- The toggler and the rows are at least 24px high, and the toggler is at least
  24px wide: the WCAG 2.5.8 minimum for click targets. This makes the tree a
  bit taller. The toggler no longer has a margin; the space around its icon
  separates it from the title.
- The toggler is a `span` instead of an `a` without `href`. Update css that
  selects `a.tree-element-toggler`.
- When the user prefers reduced motion (`prefers-reduced-motion: reduce`),
  folders open and close without animation, unless `animationSpeed` is set.
- The method `selectNode` keeps an already selected node selected, as
  documented.
- The methods `closeNode` and `toggle` return a promise that is resolved when
  the folder is closed or opened, like `openNode`. Await it when you need to
  know the animation has finished.

## 0.2.0 - 2026-09-16

### Fixed

- The options `closedIcon` and `openedIcon` render a string as html instead of
  as text.

### Changed

- Make rendering faster by using templates.
- The children of a closed folder are rendered when the folder is opened,
  instead of when the tree is rendered. `onCreateLi` is called for a node when
  it is rendered.
- The method `getSelectedNode` returns null instead of false.
- The method `setState` saves the state to storage when `saveState` is enabled.

## 0.1.1 - 2026-09-06

### Changed

- `tree.load_failed` is also dispatched when a request fails with a network error.

## 0.1.0 - 2026-09-04

First release.

### Added

- Tree widget in plain javascript, with no runtime dependencies
- Load data from a javascript array or from a url, with load on demand per node
- Drag and drop, with autoscroll and hooks to allow or veto a move
- Keyboard navigation
- Save the open and selected nodes to local storage
- Right-to-left support
- Typed events and options, with type declarations in the package
