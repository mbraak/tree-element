import type { ClassNames } from "./classNames";
import type {
  DragAndDropHandler,
  DragAndDropHandlerParams,
} from "./dragAndDropHandler";
import type { MoveInfo, TreeEvent, TreeEventName, TreeEvents } from "./events";
import type { PositionInfo } from "./mouseUtils";
import type { NodeData, NodeId, Position } from "./node";
import type { TreeElementOptions } from "./options";
import type { SavedState } from "./saveStateHandler";
import type { SelectNodeOptions } from "./selectNodeHandler";

import createClassNames from "./classNames";
import DataLoader from "./dataLoader";
import ElementsRenderer from "./elementsRenderer";
import KeyHandler from "./keyHandler";
import MouseHandler from "./mouseHandler";
import { Node } from "./node";
import NodeElement from "./nodeElement";
import FolderElement from "./nodeElement/folderElement";
import { getOffsetTop } from "./positionUtils";
import RequestUrl from "./requestUrl";
import SaveStateHandler from "./saveStateHandler";
import ScrollHandler from "./scrollHandler";
import SelectNodeHandler from "./selectNodeHandler";
import setDefaultOptions from "./setDefaultOptions";
import triggerCustomEvent from "./triggerCustomEvent";
import __version__ from "./version";

// The types that appear in the public api. Consumers cannot import them from
// the submodules directly, because those are not exposed in package.json. The
// entry points (index.ts and core.ts) re-export them. Type only, so that the
// iife builds keep exposing the TreeElement class itself as their global,
// instead of an object of named exports.
export type {
  MoveInfo,
  Node,
  NodeData,
  NodeId,
  Position,
  SavedState,
  SelectNodeOptions,
  TreeElementOptions,
  TreeEvent,
  TreeEventName,
  TreeEvents,
};

export type TriggerEventProvider = (
  element: HTMLElement,
  eventName: TreeEventName,
  values?: TreeEvents[TreeEventName],
) => boolean;

interface TreeElementParams extends Partial<TreeElementOptions> {
  /** The element the tree is rendered into. Its content is replaced. */
  htmlElement: HTMLElement;
  /** Replaces how events are dispatched. It must return whether the event
   * was not cancelled. This exists for tests and for integrating with
   * another event system. */
  overrideTriggerEventProvider?: TriggerEventProvider,
}

// This module has no runtime dependency on the drag and drop code:
// createDragAndDropHandler returns null here, and the main entry point
// (index.ts) subclasses it to plug the handler in. The "tree-element/core"
// entry point (core.ts) exports this class as is, which gives consumers a tree
// without drag and drop and without its share of the bundle.
export default class TreeElement {
  /** @hidden */
  public tree: Node;

  private classNames: ClassNames;
  private dataLoader: DataLoader;
  private dndHandler: DragAndDropHandler | null;
  private htmlElement: HTMLElement;
  private isInitialized: boolean;
  private keyHandler: KeyHandler;
  private mouseHandler: MouseHandler;
  private nodeMap: WeakMap<HTMLElement, Node>;
  private options: TreeElementOptions;
  private renderer: ElementsRenderer;
  private saveStateHandler: SaveStateHandler;
  private scrollHandler: ScrollHandler;
  private selectNodeHandler: SelectNodeHandler;
  private triggerEventProvider: TriggerEventProvider;

  /** @hidden */
  constructor({ htmlElement, overrideTriggerEventProvider, ...options }: TreeElementParams) {
    this.htmlElement = htmlElement;
    this.options = setDefaultOptions(htmlElement, options);
    this.classNames = createClassNames(this.options);
    this.triggerEventProvider = overrideTriggerEventProvider ?? triggerCustomEvent;

    this.isInitialized = false;
    this.tree = new Node({}, true);
    this.nodeMap = new WeakMap();

    const {
      autoEscape,
      buttonLeft,
      closedIcon,
      dataFilter,
      dragAndDrop,
      keyboardSupport,
      onCreateLi,
      onGetStateFromStorage,
      onSetStateFromStorage,
      openedIcon,
      rtl,
      saveState: saveStateOption,
      showEmptyFolder,
      tabIndex,
    } = this.options;

    const classNames = this.classNames;
    const closeNode = this.closeNode.bind(this);
    const getNodeElementForNode = this.getNodeElementForNode.bind(this);
    const getNodeById = this.getNodeById.bind(this);
    const getSelectedNode = this.getSelectedNode.bind(this);
    const getTree = this.getTree.bind(this);
    const isFocusOnTree = this.isFocusOnTree.bind(this);
    const loadData = this.loadData.bind(this);
    const openNode = this.openNode.bind(this);
    const openParents = this.openParents.bind(this);
    const refreshElements = this.refreshElements.bind(this);
    const refreshHitAreas = this.refreshHitAreas.bind(this);
    const setNodeElement = this.setNodeElement.bind(this);
    const treeElement = this.htmlElement;
    const triggerEvent = this.triggerEvent.bind(this);

    const saveState = () => {
      saveStateHandler.saveState();
    }

    const selectNodeHandler = new SelectNodeHandler({
      getNodeById,
      getNodeElementForNode,
      getOnCanSelectNode: () => this.options.onCanSelectNode,
      getSelectable: () => this.options.selectable,
      openParents,
      saveState,
      triggerEvent
    });

    const addToSelection =
      selectNodeHandler.addToSelection.bind(selectNodeHandler);
    const getSelectedNodes =
      selectNodeHandler.getSelectedNodes.bind(selectNodeHandler);
    const isNodeSelected =
      selectNodeHandler.isNodeSelected.bind(selectNodeHandler);
    const removeFromSelection =
      selectNodeHandler.removeFromSelection.bind(selectNodeHandler);
    const selectNode = selectNodeHandler.selectSingleNode.bind(selectNodeHandler);

    const getMouseDelay = () => this.options.startDndDelay ?? 0;

    const dataLoader = new DataLoader({
      classNames,
      dataFilter,
      loadData,
      treeElement,
      triggerEvent,
    });

    const saveStateHandler = new SaveStateHandler({
      addToSelection,
      getNodeById,
      getSelectedNodes,
      getTree,
      onGetStateFromStorage,
      onSetStateFromStorage,
      openNode,
      refreshElements,
      removeFromSelection,
      saveState: saveStateOption,
    });

    const scrollHandler = new ScrollHandler({
      refreshHitAreas,
      treeElement,
    });

    const keyHandler = new KeyHandler({
      closeNode,
      getSelectedNode,
      isFocusOnTree,
      keyboardSupport,
      openNode,
      selectNode,
    });

    const renderer = new ElementsRenderer({
      autoEscape,
      buttonLeft,
      classNames,
      closedIcon,
      dragAndDrop,
      getTree,
      htmlElement: treeElement,
      isNodeSelected,
      onCreateLi,
      openedIcon,
      rtl,
      setNodeElement,
      showEmptyFolder,
      tabIndex,
    });

    const getNode = this.getNode.bind(this);
    const onMouseCapture = this.mouseCapture.bind(this);
    const onMouseDrag = this.mouseDrag.bind(this);
    const onMouseStart = this.mouseStart.bind(this);
    const onMouseStop = this.mouseStop.bind(this);

    const mouseHandler = new MouseHandler({
      classNames,
      element: treeElement,
      getMouseDelay,
      getNode,
      onClickButton: this.toggle.bind(this),
      onClickTitle: selectNode,
      onMouseCapture,
      onMouseDrag,
      onMouseStart,
      onMouseStop,
      triggerEvent,
      useContextMenu: this.options.useContextMenu,
    });

    this.dataLoader = dataLoader;
    this.dndHandler = null;
    this.keyHandler = keyHandler;
    this.mouseHandler = mouseHandler;
    this.renderer = renderer;
    this.saveStateHandler = saveStateHandler;
    this.scrollHandler = scrollHandler;
    this.selectNodeHandler = selectNodeHandler;

    this.initData();
  }

  /**
   * Adds a sibling after a node.
   *
   * @returns The new node, or `null` when the node has no parent.
   * @group Changing the tree
   */
  public addNodeAfter(
    nodeData: NodeData,
    existingNode: Node,
  ): Node | null {
    const newNode = existingNode.addAfter(nodeData);

    if (newNode) {
      this.refreshElements(existingNode.parent);
    }

    return newNode;
  }

  /**
   * Adds a sibling before a node.
   *
   * @returns The new node, or `null` when the node has no parent.
   * @group Changing the tree
   */
  public addNodeBefore(
    nodeData: NodeData,
    existingNode: Node,
  ): Node | null {
    const newNode = existingNode.addBefore(nodeData);

    if (newNode) {
      this.refreshElements(existingNode.parent);
    }

    return newNode;
  }

  /**
   * Inserts a new node between a node and its parent, taking the node as its
   * child.
   *
   * @returns The new node, or `null` when the node has no parent.
   * @group Changing the tree
   */
  public addParentNode(
    nodeData: NodeData,
    existingNode: Node,
  ): Node | null {
    const newNode = existingNode.addParent(nodeData);

    if (newNode) {
      this.refreshElements(newNode.parent);
    }

    return newNode;
  }

  /**
   * Adds a node to the selection instead of replacing it.
   *
   * @param mustSetFocus - Move the focus to the node. Default `true`.
   * @group Selection
   */
  public addToSelection(node: Node, mustSetFocus?: boolean) {
    this.selectNodeHandler.addToSelection(node);
    this.openParents(node);

    this.getNodeElementForNode(node).select(mustSetFocus ?? true);

    this.saveState();
  }

  /**
   * Adds a node as the last child of a parent.
   *
   * @example
   * ```js
   * tree.appendNode({ name: "child", id: 5 }, tree.getNodeById(1));
   * ```
   *
   * @returns The new node.
   * @group Changing the tree
   */
  public appendNode(nodeData: NodeData, parentNode: Node): Node {
    const node = parentNode.append(nodeData);

    this.refreshElements(parentNode);

    return node;
  }

  /**
   * Closes a folder.
   *
   * @param slide - Override the `slide` option for this call.
   * @group Opening and closing
   */
  public closeNode(node: Node, slide?: boolean): void {
    if (node.isFolder() || node.isEmptyFolder) {
      this.createFolderElement(node).close(
        slide ?? this.options.slide,
        this.options.animationSpeed,
      );

      this.saveState();
    }
  }

  /**
   * Empties the element and removes the tree's document-level keyboard
   * listener. Call it when you remove the tree from the page.
   *
   * @group Other
   */
  public deinit(): void {
    this.htmlElement.textContent = '';

    this.dataLoader.deinit();
    this.keyHandler.deinit();
    this.mouseHandler.deinit();

    this.tree = new Node({}, true);
  }

  /**
   * Returns the node that belongs to a `li` element the tree rendered.
   *
   * @group Finding nodes
   */
  public getNode(element: HTMLElement): Node | null {
    const liElement = element.closest<HTMLElement>(
      `li.${this.classNames.common}`,
    );

    if (liElement) {
      return this.nodeMap.get(liElement) ?? null;
    } else {
      return null;
    }
  }

  /**
   * Returns the first node for which the callback returns `true`.
   *
   * @example
   * ```js
   * const node = tree.getNodeByCallback((node) => node.children.length > 3);
   * ```
   *
   * @group Finding nodes
   */
  public getNodeByCallback(callback: (node: Node) => boolean): Node | null {
    return this.tree.getNodeByCallback(callback);
  }

  /**
   * Returns the node with this id.
   *
   * @example
   * ```js
   * const node = tree.getNodeById(1);
   * ```
   *
   * @group Finding nodes
   */
  public getNodeById(id: NodeId): Node | null {
    return this.tree.getNodeById(id);
  }

  /**
   * Returns the first node with this name.
   *
   * @group Finding nodes
   */
  public getNodeByName(name: string): Node | null {
    return this.tree.getNodeByName(name);
  }

  /**
   * Like `getNodeByName`, but throws when there is no such node. Convenient
   * in tests and when a missing node is a bug.
   *
   * @group Finding nodes
   */
  public getNodeByNameMustExist(name: string): Node {
    return this.tree.getNodeByNameMustExist(name);
  }

  /**
   * Returns all nodes with this property value.
   *
   * @example
   * ```js
   * tree.getNodesByProperty("color", "green");
   * ```
   *
   * @group Finding nodes
   */
  public getNodesByProperty(key: string, value: unknown): Node[] {
    return this.tree.getNodesByProperty(key, value);
  }

  /**
   * Returns the selected node, or `false` when nothing is selected.
   *
   * @group Selection
   */
  public getSelectedNode(): false | Node {
    return this.selectNodeHandler.getSelectedNode();
  }

  /**
   * Returns the selected nodes.
   *
   * @group Selection
   */
  public getSelectedNodes(): Node[] {
    return this.selectNodeHandler.getSelectedNodes();
  }

  /**
   * Returns the current state — `open_nodes` and `selected_node` — whether or
   * not `saveState` is enabled.
   *
   * @group State
   */
  public getState(): null | SavedState {
    return this.saveStateHandler.getState();
  }

  /**
   * Returns the state as it is stored.
   *
   * @group State
   */
  public getStateFromStorage(): null | SavedState {
    return this.saveStateHandler.getStateFromStorage();
  }

  /**
   * Returns the root node. It is not rendered; its `children` are the
   * top-level nodes. Also available as the `tree` property.
   *
   * @group Finding nodes
   */
  public getTree(): Node {
    return this.tree;
  }

  /**
   * Returns the version of tree-element.
   *
   * @group Other
   */
  public getVersion(): string {
    return __version__;
  }

  /**
   * Returns whether the user is dragging a node.
   *
   * @group Other
   */
  public isDragging(): boolean {
    return this.dndHandler?.isDragging ?? false;
  }

  /**
   * Returns whether the node is selected.
   *
   * @group Selection
   */
  public isNodeSelected(node: Node): boolean {
    return this.selectNodeHandler.isNodeSelected(node);
  }

  /**
   * Loads data into the tree.
   *
   * @param parentNode - Replace this node's children instead of the whole
   * tree.
   * @group Loading data
   */
  public loadData(data: NodeData[] | null, parentNode?: Node): void {
    if (data) {
      if (parentNode) {
        this.deselectNodes(parentNode);
        this.loadSubtree(data, parentNode);
      } else {
        this.initTree(data);
      }

      if (this.dndHandler?.isDragging) {
        this.dndHandler.refresh();
      }
    }

    this.triggerEvent("tree.set_data", {
      node: parentNode,
      treeData: data ?? undefined,
    });
  }

  /**
   * Fetches data and loads it into the tree, or into `parentNode`.
   *
   * @param url - Defaults to the `dataUrl` option.
   * @group Loading data
   */
  public async loadDataFromUrl(
    url?: string,
    parentNode?: Node
  ): Promise<void> {
    const requestUrl = url ? new RequestUrl(url) : this.createRequestUrl(parentNode);

    if (requestUrl) {
      await this.dataLoader.loadFromUrl(requestUrl, parentNode);
    }
  }

  /**
   * Selects the next visible node, like the down arrow key.
   *
   * @group Selection
   */
  public moveDown() {
    const selectedNode = this.getSelectedNode();
    if (selectedNode) {
      this.keyHandler.moveDown(selectedNode);
    }
  }

  /**
   * Moves a node inside the tree.
   *
   * @example
   * ```js
   * tree.moveNode(tree.getNodeById(2), tree.getNodeById(1), "inside");
   * ```
   *
   * @param position - `"before"`, `"after"` or `"inside"`.
   * @group Changing the tree
   */
  public moveNode(
    node: Node,
    targetNode: Node,
    position: Position,
  ): void {
    this.tree.moveNode(node, targetNode, position);
    this.refreshElements(null);
  }

  /**
   * Selects the previous visible node, like the up arrow key.
   *
   * @group Selection
   */
  public moveUp() {
    const selectedNode = this.getSelectedNode();
    if (selectedNode) {
      this.keyHandler.moveUp(selectedNode);
    }
  }

  /**
   * Opens a folder, and the folders above it. A node marked `load_on_demand`
   * is fetched first, so await the promise when you need to know it is really
   * open.
   *
   * @example
   * ```js
   * await tree.openNode(node);
   * console.log("open");
   * ```
   *
   * @param slide - Override the `slide` option for this call.
   * @group Opening and closing
   */
  public async openNode(
    node: Node,
    slide?: boolean
  ): Promise<void> {
    const mustSlide = slide ?? this.options.slide;

    const doOpenNode = async (
      openedNode: Node,
      slideOption: boolean
    ): Promise<void> => {
      if (!node.children.length) {
        return;
      }

      const folderElement = this.createFolderElement(openedNode);

      await folderElement.open(
        slideOption,
        this.options.animationSpeed,
      );
    };

    if (node.isFolder() || node.isEmptyFolder) {
      if (node.load_on_demand) {
        await this.loadFolderOnDemand(node, mustSlide);
      } else {
        let parent = node.parent;

        while (parent) {
          // nb: do not open root element
          if (parent.parent) {
            await doOpenNode(parent, false);
          }
          parent = parent.parent;
        }

        await doOpenNode(node, mustSlide);

        this.saveState();
      }
    }
  }

  /**
   * Adds a node as the first child of a parent.
   *
   * @returns The new node.
   * @group Changing the tree
   */
  public prependNode(nodeData: NodeData, parentNode: Node): Node {
    const node = parentNode.prepend(nodeData);

    this.refreshElements(parentNode);

    return node;
  }

  /**
   * Re-renders the whole tree. Needed after changing node data directly
   * instead of through these methods.
   *
   * @group Changing the tree
   */
  public refresh() {
    this.refreshElements(null);
  }

  /**
   * Recomputes the drop targets. Call this if the layout changes during a
   * drag.
   *
   * @group Other
   */
  public refreshHitAreas() {
    this.dndHandler?.refresh();
  }

  /**
   * Removes a node from the selection.
   *
   * @group Selection
   */
  public removeFromSelection(node: Node) {
    this.selectNodeHandler.removeFromSelection(node);

    this.getNodeElementForNode(node).deselect();
    this.saveState();
  }

  /**
   * Removes a node and its children.
   *
   * @group Changing the tree
   */
  public removeNode(node: Node): void {
    this.selectNodeHandler.removeFromSelection(node, true); // including children

    const parent = node.parent;
    node.remove();
    this.refreshElements(parent);
  }

  /**
   * Scrolls the node into view.
   *
   * @group Selection
   */
  public scrollToNode(node: Node) {
    if (!node.element) {
      return;
    }

    const top =
      getOffsetTop(node.element) -
      getOffsetTop(this.htmlElement);

    this.scrollHandler.scrollToY(top);
  }

  /**
   * Replaces the selection, and opens the parents of the node.
   *
   * @param node - `null` clears the selection.
   * @param options - `mustSetFocus`: move focus to the node, default `true`.
   * `mustToggle`: deselect the node if it is already selected, default
   * `false`.
   * @group Selection
   */
  public selectNode(
    node: Node | null,
    options?: SelectNodeOptions,
  ): void {
    if (!node) {
      // Called with empty node -> deselect current node
      this.deselectCurrentNode();
      this.saveStateHandler.saveState();
      return;
    }

    this.selectNodeHandler.selectSingleNode(node, options);
  }

  /**
   * Changes an option after construction. See
   * [Options](/reference/options#changing-an-option-later) for the caveats.
   *
   * @group Other
   */
  public setOption(option: string, value: unknown) {
    (this.options as unknown as Record<string, unknown>)[option] = value;
  }

  /**
   * Applies a state to the tree.
   *
   * @group State
   */
  public setState(state: SavedState) {
    this.saveStateHandler.setInitialState(state);
    this.refreshElements(null);
  }

  /**
   * Closes an open node and opens a closed one.
   *
   * @param slide - Override the `slide` option for this call.
   * @group Opening and closing
   */
  public toggle(node: Node, slide: boolean | null = null) {
    const mustSlide = slide ?? this.options.slide;

    if (node.is_open) {
      this.closeNode(node, mustSlide);
    } else {
      void this.openNode(node, mustSlide);
    }
  }

  /**
   * Returns the tree as a json string, including changes made through the
   * api.
   *
   * @group Other
   */
  public toJson(): string {
    return JSON.stringify(this.tree.getData());
  }

  /**
   * Updates the data of a node and re-renders it. A string updates just the
   * name.
   *
   * Changing the `id` re-indexes the node. `children` and `parent` are
   * ignored — use `loadData` or `moveNode` for those.
   *
   * @example
   * ```js
   * tree.updateNode(node, "new name");
   * tree.updateNode(node, { name: "new name", color: "red" });
   * ```
   *
   * @group Changing the tree
   */
  public updateNode(node: Node, data: NodeData): void {
    const idIsChanged =
      typeof data === "object" && data.id && data.id !== node.id;

    if (idIsChanged) {
      this.tree.removeNodeFromIndex(node);
    }

    node.setData(data);

    if (idIsChanged) {
      this.tree.addNodeToIndex(node);
    }

    if (
      typeof data === "object" &&
      data.children &&
      data.children instanceof Array
    ) {
      node.removeChildren();

      if (data.children.length) {
        node.loadFromData(data.children);
      }
    }

    this.refreshElements(node);
  }

  /**
   * Creates the drag and drop handler. This base class has none, so the
   * `dragAndDrop` option does nothing here; the main entry point overrides
   * this to construct the real handler.
   *
   * @hidden
   */
  protected createDragAndDropHandler(
    _params: DragAndDropHandlerParams,
  ): DragAndDropHandler | null {
    return null;
  }

  private createFolderElement(node: Node) {
    const classNames = this.classNames;
    const closedIconElement = this.renderer.closedIconElement;
    const getScrollLeft = this.scrollHandler.getScrollLeft.bind(
      this.scrollHandler,
    );
    const openedIconElement = this.renderer.openedIconElement;
    const tabIndex = this.options.tabIndex;
    const treeElement = this.htmlElement;
    const triggerEvent = this.triggerEvent.bind(this);

    return new FolderElement({
      classNames,
      closedIconElement,
      getScrollLeft,
      node,
      openedIconElement,
      tabIndex,
      treeElement,
      triggerEvent,
    });
  }

  private createNodeElement(node: Node) {
    const classNames = this.classNames;
    const getScrollLeft = this.scrollHandler.getScrollLeft.bind(
      this.scrollHandler,
    );
    const tabIndex = this.options.tabIndex;
    const treeElement = this.htmlElement;

    return new NodeElement({
      classNames,
      getScrollLeft,
      node,
      tabIndex,
      treeElement,
    });
  }

  /* Create a RequestUrl based on the url in the options.
    * Add a 'node' query parameter for loading on demand
    * Add a 'selected_node' query parameter if a node is selected.
  */
  private createRequestUrl(node?: Node): null | RequestUrl {
    const dataUrl = this.options.dataUrl;

    let url;

    if (typeof dataUrl === "function") {
      url = dataUrl(node);
    } else {
      url = dataUrl;
    }

    if (!url) {
      return null;
    }

    const requestUrl = new RequestUrl(url);

    if (node?.id) {
      // Load on demand of a subtree; add node parameter
      requestUrl.setSearchParam('node', node.id.toString());
    } else {
      // Add selected_node parameter
      const selectedNodeId = this.getNodeIdToBeSelected();
      if (selectedNodeId) {
        requestUrl.setSearchParam('selected_node', selectedNodeId.toString());
      }
    }

    return requestUrl;
  }

  private deselectCurrentNode(): void {
    const node = this.getSelectedNode();
    if (node) {
      this.removeFromSelection(node);
    }
  }

  // Deselect the children of the node.
  private deselectNodes(parentNode: Node): void {
    const selectedNodesUnderParent =
      this.selectNodeHandler.getSelectedNodesUnder(parentNode);
    for (const n of selectedNodesUnderParent) {
      this.selectNodeHandler.removeFromSelection(n);
    }
  }

  // Get the maximum level for auto open
  private getAutoOpenMaxLevel(): number {
    if (this.options.autoOpen === true) {
      return -1;
    } else if (typeof this.options.autoOpen === "number") {
      return this.options.autoOpen;
    } else if (typeof this.options.autoOpen === "string") {
      return parseInt(this.options.autoOpen, 10);
    }

    /* istanbul ignore next @preserve */
    return 0;
  }

  /**
   * Returns the drag and drop handler, creating it on first use. Returns
   * `null` when the `dragAndDrop` option is off, so the handler is never
   * constructed for trees that don't use it. The option is checked on every
   * call because it can be turned on later with `setOption`.
   */
  private getDndHandler(): DragAndDropHandler | null {
    if (!this.options.dragAndDrop) {
      return null;
    }

    this.dndHandler ??= this.createDragAndDropHandler({
      autoEscape: this.options.autoEscape,
      classNames: this.classNames,
      getNodeElement: this.getNodeElement.bind(this),
      getNodeElementForNode: this.getNodeElementForNode.bind(this),
      getScrollLeft: this.scrollHandler.getScrollLeft.bind(this.scrollHandler),
      getTree: this.getTree.bind(this),
      onCanMove: this.options.onCanMove,
      onCanMoveTo: this.options.onCanMoveTo,
      onDragMove: this.options.onDragMove,
      onDragStop: this.options.onDragStop,
      onIsMoveHandle: this.options.onIsMoveHandle,
      openFolderDelay: this.options.openFolderDelay,
      openNode: this.openNode.bind(this),
      refreshElements: this.refreshElements.bind(this),
      slide: this.options.slide,
      treeElement: this.htmlElement,
      triggerEvent: this.triggerEvent.bind(this),
    });

    return this.dndHandler;
  }

  private getNodeElement(element: HTMLElement): NodeElement | null {
    const node = this.getNode(element);
    if (node) {
      return this.getNodeElementForNode(node);
    } else {
      return null;
    }
  }

  private getNodeElementForNode(node: Node): NodeElement {
    if (node.isFolder()) {
      return this.createFolderElement(node);
    } else {
      return this.createNodeElement(node);
    }
  }

  private getNodeIdToBeSelected(): NodeId | null {
    return this.saveStateHandler.getNodeIdToBeSelected();
  }

  private initData(): void {
    if (this.options.data) {
      this.loadData(this.options.data);
    } else {
      const dataUrl = this.createRequestUrl();

      if (dataUrl) {
        void this.loadDataFromUrl();
      } else {
        this.loadData([]);
      }
    }
  }

  private initTree(data: NodeData[]): void {
    const doInit = (): void => {
      if (!this.isInitialized) {
        this.isInitialized = true;
        this.triggerEvent("tree.init");
      }
    };

    this.tree = new this.options.nodeClass(
      null,
      true,
      this.options.nodeClass,
    );

    this.selectNodeHandler.clear();

    this.tree.loadFromData(data);

    const mustLoadOnDemand = this.setInitialState();

    this.refreshElements(null);

    if (mustLoadOnDemand) {
      // Load data on demand and then init the tree
      void this.setInitialStateOnDemand().then(doInit);
    } else {
      doInit();
    }
  }

  // Does an HTML element of the tree have the focus?
  private isFocusOnTree(): boolean {
    const activeElement = document.activeElement;

    /* istanbul ignore if */
    if (!activeElement) {
      return false;
    }

    // The keyboard must still work for input elements.
    const tagName = activeElement.tagName;
    if (tagName !== "A" && tagName !== "SPAN") {
      return false;
    }

    const node = this.getNode(activeElement as HTMLElement);
    return node?.tree === this.tree;
  }

  private isSelectedNodeInSubtree(subtree: Node): boolean {
    const selectedNode = this.getSelectedNode();

    if (!selectedNode) {
      return false;
    } else {
      return subtree === selectedNode || subtree.isParentOf(selectedNode);
    }
  }

  private async loadFolderOnDemand(
    node: Node,
    slide: boolean,
  ): Promise<void> {
    node.is_loading = true;

    await this.loadDataFromUrl(undefined, node);

    await this.openNode(node, slide);
  }

  private loadSubtree(data: NodeData[], parentNode: Node): void {
    parentNode.loadFromData(data);

    parentNode.load_on_demand = false;
    parentNode.is_loading = false;

    this.refreshElements(parentNode);
  }

  private mouseCapture(positionInfo: PositionInfo): boolean | null {
    const dndHandler = this.getDndHandler();

    if (!dndHandler) {
      return false;
    }

    return dndHandler.mouseCapture(positionInfo);
  }

  private mouseDrag(positionInfo: PositionInfo): boolean {
    const dndHandler = this.getDndHandler();

    /* istanbul ignore if */
    if (!dndHandler) {
      return false;
    }

    const result = dndHandler.mouseDrag(positionInfo);
    this.scrollHandler.checkScrolling(positionInfo);
    return result;
  }

  private mouseStart(positionInfo: PositionInfo): boolean {
    const dndHandler = this.getDndHandler();

    /* istanbul ignore if */
    if (!dndHandler) {
      return false;
    }

    return dndHandler.mouseStart(positionInfo);
  }

  private mouseStop(positionInfo: PositionInfo): boolean {
    const dndHandler = this.getDndHandler();

    /* istanbul ignore if */
    if (!dndHandler) {
      return false;
    }

    this.scrollHandler.stopScrolling();
    return dndHandler.mouseStop(positionInfo);
  }

  private openParents(node: Node) {
    const parent = node.parent;

    if (parent?.parent && !parent.is_open) {
      void this.openNode(parent, false);
    }
  }

  /*
  Redraw the tree or part of the tree.
    from_node: redraw this subtree
  */
  private refreshElements(fromNode: Node | null): void {
    const mustSetFocus = this.isFocusOnTree();
    const mustSelect = fromNode
      ? this.isSelectedNodeInSubtree(fromNode)
      : false;

    this.renderer.render(fromNode);

    if (mustSelect) {
      this.selectCurrentNode(mustSetFocus);
    }

    this.triggerEvent("tree.refresh");
  }

  private saveState(): void {
    this.saveStateHandler.saveState();
  }

  private selectCurrentNode(mustSetFocus: boolean): void {
    const node = this.getSelectedNode();
    if (node) {
      const nodeElement = this.getNodeElementForNode(node);
      nodeElement.select(mustSetFocus);
    }
  }

  // Set initial state, either by restoring the state or auto-opening nodes
  // result: must load nodes on demand?
  private setInitialState(): boolean {
    const restoreState = (): [boolean, boolean] => {
      // result: is state restored, must load on demand?
      const state = this.saveStateHandler.getStateFromStorage();

      if (!state) {
        return [false, false];
      } else {
        const mustLoadOnDemand =
          this.saveStateHandler.setInitialState(state);

        // return true: the state is restored
        return [true, mustLoadOnDemand];
      }
    };

    const autoOpenNodes = (): boolean => {
      // result: must load on demand?
      if (this.options.autoOpen === false) {
        return false;
      }

      const maxLevel = this.getAutoOpenMaxLevel();
      let mustLoadOnDemand = false;

      this.tree.iterate((node: Node, level: number) => {
        if (node.load_on_demand) {
          mustLoadOnDemand = true;
          return false;
        } else if (!node.hasChildren()) {
          return false;
        } else {
          node.is_open = true;
          return level !== maxLevel;
        }
      });

      return mustLoadOnDemand;
    };

    let [isRestored, mustLoadOnDemand] = restoreState(); // eslint-disable-line prefer-const

    if (!isRestored) {
      mustLoadOnDemand = autoOpenNodes();
    }

    return mustLoadOnDemand;
  }

  // Set the initial state for nodes that are loaded on demand
  private async setInitialStateOnDemand(): Promise<void> {
    return new Promise(resolve => {
      const restoreState = (): boolean => {
        const state = this.saveStateHandler.getStateFromStorage();

        if (!state) {
          return false;
        } else {
          void this.saveStateHandler.setInitialStateOnDemand(
            state,
          ).then(() => {
            resolve();
          });

          return true;
        }
      };

      const autoOpenNodes = (): void => {
        const maxLevel = this.getAutoOpenMaxLevel();
        let loadingCount = 0;

        const loadAndOpenNode = (node: Node): void => {
          loadingCount += 1;
          void this.openNode(node, false).then(() => {
            loadingCount -= 1;
            openNodes();
          });
        };

        const openNodes = (): void => {
          this.tree.iterate((node: Node, level: number) => {
            if (node.load_on_demand) {
              if (!node.is_loading) {
                loadAndOpenNode(node);
              }

              return false;
            } else {
              void this.openNode(node, false);

              return level !== maxLevel;
            }
          });

          if (loadingCount === 0) {
            resolve();
          }
        };

        openNodes();
      };

      if (!restoreState()) {
        autoOpenNodes();
      }
    });
  }

  // Set this HTML element to this node in the node map.
  private setNodeElement(element: HTMLElement, node: Node) {
    this.nodeMap.set(element, node);
  }

  private triggerEvent<Name extends TreeEventName>(eventName: Name, values?: TreeEvents[Name]): boolean {
    return this.triggerEventProvider(this.htmlElement, eventName, values)
  }
}