import type { AnimationSpeed } from "./animation";
import type { Node, NodeData } from "./node";

export type DataFilter = (data: unknown) => NodeData[];

export type DataUrl = DataUrlFunction | string;

export type DragMethod = (node: Node, event: Event | Touch) => void;

export type IconElement = HTMLElement | string;

export type OnCanMove = ((node: Node) => boolean) | undefined;

export type OnCanMoveTo = (
  node: Node,
  targetNode: Node,
  positionName: string,
) => boolean;

export type OnCanSelectNode = (node: Node) => boolean;

export type OnCreateLi = (
  node: Node,
  el: HTMLElement,
  isSelected: boolean,
) => void;

export type OnGetStateFromStorage = (() => string) | undefined;

export type OnIsMoveHandle = (el: HTMLElement) => boolean;

export type OnSetStateFromStorage = ((data: string) => void) | undefined;

export interface TreeElementOptions {
  /**
   * The duration of the slide animation: `"fast"` is 200ms, `"slow"` is
   * 600ms, a number is milliseconds.
   *
   * @defaultValue `"fast"`
   * @group Appearance
   */
  animationSpeed: AnimationSpeed;
  /**
   * Escape node names. With `false`, names are inserted as html — only do
   * that for data you control.
   *
   * @defaultValue `true`
   * @group Data
   */
  autoEscape: boolean;
  /**
   * Which levels are open initially: `false` none, `true` all, a number that
   * many levels starting at `0` (so `0` opens the top level, `1` the first
   * two levels).
   *
   * @defaultValue `false`
   * @group Appearance
   */
  autoOpen: boolean | number;
  /**
   * Put the open/close button before the node title. With `false` it goes
   * after it.
   *
   * @defaultValue `true`
   * @group Appearance
   */
  buttonLeft: boolean;
  /**
   * The prefix of the css classes the widget puts on the elements it
   * creates: with `"my-tree"` a title gets `my-tree-title` instead of
   * `tree-element-title`. The bundled stylesheet uses the default prefix, so
   * change it only if you bring your own css. See
   * [Styling](/guide/styling#changing-the-class-names).
   *
   * @defaultValue `"tree-element"`
   * @group Appearance
   */
  classPrefix: string;
  /**
   * The icon of a closed folder. A string is inserted as html; an element is
   * cloned for every node.
   *
   * Type: `HTMLElement | string`
   *
   * @defaultValue `"&#x25ba;"` (`►`), or `"&#x25c0;"` (`◀`) when `rtl` is
   * true.
   * @group Appearance
   */
  closedIcon?: IconElement;
  /**
   * The class that every element of the widget gets.
   *
   * @defaultValue `"<classPrefix>-common"`
   * @group Appearance
   */
  commonClassName?: string;
  /**
   * The nodes of the tree. See [Data](/guide/data) for the format.
   *
   * @group Data
   */
  data?: NodeData[];
  /**
   * Transforms a response from `dataUrl` into node data. Use it when the
   * server wraps the nodes in another object.
   *
   * Type: `(data: unknown) => NodeData[]`
   *
   * @group Data
   */
  dataFilter?: DataFilter;
  /**
   * A url to fetch the data from, or a function that returns one. The
   * function is called with the node that is being loaded, and without an
   * argument for the initial load. See
   * [Loading on demand](/guide/loading-on-demand).
   *
   * Type: `string | ((node?: Node) => string)`
   *
   * @defaultValue The element's `data-url` attribute.
   * @group Data
   */
  dataUrl?: DataUrl;
  /**
   * Let the user move nodes by dragging them.
   *
   * @defaultValue `false`
   * @group Drag and drop
   */
  dragAndDrop: boolean;
  /**
   * Handle the arrow keys when the focus is on the tree. See
   * [Selection](/guide/selection#keyboard-navigation).
   *
   * @defaultValue `true`
   * @group Selection
   */
  keyboardSupport: boolean;
  /**
   * The class used to create nodes. Subclass [`Node`](/reference/node) to
   * add your own methods. The `Node` class is not exposed on the global
   * `TreeElement`, so this option needs the `lib` build.
   *
   * @example
   * ```js
   * import TreeElement from "tree-element/lib/index.js";
   * import { Node } from "tree-element/lib/node.js";
   *
   * class MyNode extends Node {
   *   fullName() {
   *     return this.getParent()
   *       ? `${this.getParent().name}/${this.name}`
   *       : this.name;
   *   }
   * }
   *
   * new TreeElement({ data, htmlElement, nodeClass: MyNode });
   * ```
   *
   * @defaultValue `Node`
   * @group Advanced
   */
  nodeClass: typeof Node;
  /**
   * Called before a drag starts. Return `false` to keep the node in place.
   *
   * Type: `(node: Node) => boolean`
   *
   * @group Drag and drop
   */
  onCanMove?: OnCanMove;
  /**
   * Called for a possible drop. `position` is `"before"`, `"after"` or
   * `"inside"`. Return `false` to refuse the drop.
   *
   * Type: `(movedNode: Node, targetNode: Node, position: string) => boolean`
   *
   * @group Drag and drop
   */
  onCanMoveTo?: OnCanMoveTo;
  /**
   * Called before a node is selected. Return `false` to refuse.
   *
   * Type: `(node: Node) => boolean`
   *
   * @group Selection
   */
  onCanSelectNode?: OnCanSelectNode;
  /**
   * Called after the `li` of a node is created, so you can add to it. See
   * [Styling](/guide/styling#customizing-the-markup).
   *
   * Type: `(node: Node, li: HTMLElement, isSelected: boolean) => void`
   *
   * @group Appearance
   */
  onCreateLi?: OnCreateLi;
  /**
   * Called while a node is being dragged.
   *
   * Type: `(node: Node, event: Event | Touch) => void`
   *
   * @group Drag and drop
   */
  onDragMove?: DragMethod;
  /**
   * Called when a drag ends.
   *
   * Type: `(node: Node, event: Event | Touch) => void`
   *
   * @group Drag and drop
   */
  onDragStop?: DragMethod;
  /**
   * Read the saved state, as a json string, from somewhere other than
   * `localStorage`.
   *
   * Type: `() => string`
   *
   * @group State
   */
  onGetStateFromStorage?: OnGetStateFromStorage;
  /**
   * Decides whether an element inside a node starts a drag. Without it, the
   * whole node is a handle.
   *
   * Type: `(element: HTMLElement) => boolean`
   *
   * @group Drag and drop
   */
  onIsMoveHandle?: OnIsMoveHandle;
  /**
   * Write the state, as a json string, to somewhere other than
   * `localStorage`.
   *
   * Type: `(state: string) => void`
   *
   * @group State
   */
  onSetStateFromStorage?: OnSetStateFromStorage;
  /**
   * The icon of an open folder.
   *
   * Type: `HTMLElement | string`
   *
   * @defaultValue `"&#x25bc;"` (`▼`)
   * @group Appearance
   */
  openedIcon?: IconElement;
  /**
   * How long, in milliseconds, a closed folder has to be hovered during a
   * drag before it opens. `false` never opens folders while dragging.
   *
   * @defaultValue `500`
   * @group Drag and drop
   */
  openFolderDelay: false | number;
  /**
   * Mirror the tree for right-to-left languages.
   *
   * @defaultValue The element's `data-rtl` attribute, otherwise `false`.
   * @group Appearance
   */
  rtl?: boolean;
  /**
   * Remember the open and selected nodes in `localStorage`. A string is used
   * as the storage key; `true` uses `tree`. See
   * [Saving state](/guide/saving-state).
   *
   * @defaultValue `false`
   * @group State
   */
  saveState: boolean | string;
  /**
   * Allow the user to select nodes.
   *
   * @defaultValue `true`
   * @group Selection
   */
  selectable: boolean;
  /**
   * Render a node with `children: []` as a folder instead of as a leaf.
   *
   * @defaultValue `false`
   * @group Appearance
   */
  showEmptyFolder: boolean;
  /**
   * Animate opening and closing folders.
   *
   * @defaultValue `true`
   * @group Appearance
   */
  slide: boolean;
  /**
   * How long, in milliseconds, the mouse has to be held down on a node
   * before a drag starts.
   *
   * @defaultValue `300`
   * @group Drag and drop
   */
  startDndDelay?: number;
  /**
   * The `tabindex` of the selected node's title, which is what makes the
   * tree focusable.
   *
   * @defaultValue `0`
   * @group Selection
   */
  tabIndex?: number;
  /**
   * The class of the root `ul`.
   *
   * @defaultValue The value of `classPrefix`.
   * @group Appearance
   */
  treeClassName?: string;
  /**
   * Handle right clicks on a node: the browser menu is suppressed and
   * [`tree.contextmenu`](/reference/events#tree-contextmenu) is dispatched
   * instead.
   *
   * @defaultValue `true`
   * @group Selection
   */
  useContextMenu: boolean;
}

type DataUrlFunction = (node?: Node) => string;
