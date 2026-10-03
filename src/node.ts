/*
A node reads and writes the private members of other nodes (node.setParent),
so the `_` prefix that the build adds cannot be limited to `this.`:

prefix-private-members: all
*/

import { isNodeRecordWithChildren } from "./nodeUtils";

export type NodeData = NodeRecord | string;

export type NodeId = number | string;

export interface NodeRecord {
  [key: string]: unknown;
  children?: NodeData[];
  id?: NodeId;
}

export type Position = "after" | "before" | "inside";

type IterateCallback = (node: Node, level: number) => boolean;

/**
 * @groupDescription Properties
 * Any other key in the node data is copied onto the node, so
 * `{ name: "node1", color: "green" }` gives you `node.color`.
 *
 * @groupDescription Searching
 * These work on any node, and search that node's subtree. Called on the root
 * node, they search the whole tree — which is what the tree's own methods of
 * the same name do.
 *
 * @groupDescription Changing the tree
 * ::: warning
 * These methods change the data without re-rendering. The tree's
 * [methods](/reference/methods) — `appendNode`, `removeNode`, `moveNode` and
 * friends — do the same and refresh the display, so prefer those. If you do
 * use these, call `tree.refresh()` afterwards.
 * :::
 */
export class Node {
  /**
  @hidden
  */
  [key: string]: unknown;

  /**
  The child nodes.
  */
  public children: Node[];
  /** The `li` element, once the node is rendered. Nodes inside a closed
   * folder are rendered when the folder is opened. */
  public element?: HTMLElement;
  /**
  The id from the node data.
  */
  public id?: NodeId;
  /**
  @hidden
  */
  public idMapping?: Map<NodeId, Node>;
  /**
  Whether the node's children are being fetched.
  */
  public is_loading?: boolean;
  /**
  Whether the folder is open.
  */
  public is_open?: boolean;
  /**
  Whether the node data had an empty `children` array.
  */
  public isEmptyFolder: boolean;
  /**
  Whether the children still have to be fetched.
  */
  public load_on_demand = false;
  /**
  The label. Also settable from the `label` key in node data.
  */
  public name = "";
  /**
  @hidden
  */
  public nodeClass?: typeof Node;
  /**
  The parent; `null` for the root node.
  */
  public parent: Node | null;
  /**
  The root node.
  */
  public tree?: Node;

  /**
  @hidden
  */
  constructor(
    nodeData: NodeData | null = null,
    isRoot = false,
    nodeClass = Node,
  ) {
    this.isEmptyFolder =
      nodeData != null &&
      isNodeRecordWithChildren(nodeData) &&
      nodeData.children.length === 0;

    this.setData(nodeData);

    this.children = [];
    this.parent = null;
    this.is_loading = undefined;
    this.is_open ??= undefined;

    if (isRoot) {
      this.idMapping = new Map<NodeId, Node>();
      this.tree = this;
      this.nodeClass = nodeClass;
    } else {
      this.idMapping = undefined;
    }
  }

  /**
   * Adds a sibling after this node.
   *
   * @returns The new node, or `null` when the node has no parent.
   * @group Changing the tree
   */
  public addAfter(nodeInfo: NodeData): Node | null {
    if (this.parent) {
      const node = this.createNode(nodeInfo);

      const childIndex = this.parent.getChildIndex(this);
      this.parent.addChildAtPosition(node, childIndex + 1);

      node.loadChildrenFromData(nodeInfo);
      return node;
    }
    return null;
  }

  /**
   * Adds a sibling before this node.
   *
   * @returns The new node, or `null` when the node has no parent.
   * @group Changing the tree
   */
  public addBefore(nodeInfo: NodeData): Node | null {
    if (this.parent) {
      const node = this.createNode(nodeInfo);

      const childIndex = this.parent.getChildIndex(this);
      this.parent.addChildAtPosition(node, childIndex);

      node.loadChildrenFromData(nodeInfo);
      return node;
    }
    return null;
  }

  /**
   * Adds an existing `Node` object as the last child.
   *
   * @group Changing the tree
   */
  public addChild(node: Node): void {
    this.children.push(node);
    node.setParent(this);
  }

  /**
   * Adds an existing `Node` object as a child, at this position in
   * `children`. The index starts at `0`.
   *
   * @group Changing the tree
   */
  public addChildAtPosition(node: Node, index: number): void {
    this.children.splice(index, 0, node);
    node.setParent(this);
  }

  /**
  @hidden
  */
  public addNodeToIndex(node: Node): void {
    if (node.id != null) {
      this.idMapping?.set(node.id, node);
    }
  }

  /**
   * Inserts a new parent between this node and its current parent.
   *
   * @returns The new node, or `null` when the node has no parent.
   * @group Changing the tree
   */
  public addParent(nodeInfo: NodeData): Node | null {
    if (this.parent) {
      const newParent = this.createNode(nodeInfo);

      if (this.tree) {
        newParent.setParent(this.tree);
      }
      const originalParent = this.parent;

      for (const child of originalParent.children) {
        newParent.addChild(child);
      }

      originalParent.children = [];
      originalParent.addChild(newParent);
      return newParent;
    }
    return null;
  }

  /**
   * Adds a child at the end.
   *
   * @returns The new node.
   * @group Changing the tree
   */
  public append(nodeInfo: NodeData): Node {
    const node = this.createNode(nodeInfo);
    this.addChild(node);

    node.loadChildrenFromData(nodeInfo);
    return node;
  }

  /**
   * Returns all nodes in the subtree for which the callback returns
   * `true`.
   *
   * @example
   * ```js
   * const folders = tree.getTree().filter((node) => node.isFolder());
   * ```
   *
   * @group Searching
   */
  public filter(f: (node: Node) => boolean): Node[] {
    const result: Node[] = [];

    this.iterate((node: Node) => {
      if (f(node)) {
        result.push(node);
      }

      return true;
    });

    return result;
  }

  /**
   * Returns the position of a child in `children`, or `-1`.
   *
   * @group Inspecting a node
   */
  public getChildIndex(node: Node): number {
    return this.children.indexOf(node);
  }

  /**
   * Returns the subtree as plain data, ready for `JSON.stringify`.
   * Internal properties (`parent`, `children`, `element`, `tree`,
   * `idMapping`, `nodeClass`, `load_on_demand`, `isEmptyFolder`) are left
   * out; your own properties are kept.
   *
   * ```js
   * tree.getTree().getData();
   * // [{ name: "node1", id: 1, children: [{ name: "child1", id: 2 }] }]
   * ```
   *
   * @param includeParent - Make the result the node itself rather than its
   * children. Default `false`.
   * @group Reading data back
   */
  public getData(includeParent = false): NodeRecord[] {
    const getDataFromNodes = (nodes: Node[]): Record<string, unknown>[] => {
      return nodes.map((node) => {
        const tmpNode: Record<string, unknown> = {};

        for (const k in node) {
          if (
            [
              "children",
              "element",
              "idMapping",
              "isEmptyFolder",
              "load_on_demand",
              "nodeClass",
              "parent",
              "tree",
            ].includes(k) ||
            !Object.prototype.hasOwnProperty.call(node, k)
          ) {
            continue;
          }

          const v = node[k];
          tmpNode[k] = v;
        }

        if (node.hasChildren()) {
          tmpNode.children = getDataFromNodes(node.children);
        }

        return tmpNode;
      });
    };

    return getDataFromNodes(includeParent ? [this] : this.children);
  }

  /**
   * Returns the last child, or `null`. When that child is an open folder,
   * its own last child, and so on.
   *
   * @group Moving around the tree
   */
  public getLastChild(): Node | null {
    if (this.hasChildren()) {
      const lastChild = this.children[this.children.length - 1] as Node;

      return lastChild.hasChildren() && lastChild.is_open
        ? lastChild.getLastChild()
        : lastChild;
    }
    return null;
  }

  /**
   * Returns the depth of the node, counting the top level as `1`.
   *
   * @group Inspecting a node
   */
  public getLevel(): number {
    let level = 0;
    let node: Node = this; // eslint-disable-line @typescript-eslint/no-this-alias, unicorn/no-this-assignment

    while (node.parent) {
      level += 1;
      node = node.parent;
    }

    return level;
  }

  /**
   * Returns the next node in the tree, regardless of whether it is
   * visible. `getNextNode(false)` skips the node's own children.
   *
   * @group Moving around the tree
   */
  public getNextNode(includeChildren = true): Node | null {
    if (includeChildren && this.hasChildren()) {
      return this.children[0] ?? null;
    }
    if (this.parent) {
      const nextSibling = this.getNextSibling();

      return nextSibling ?? this.parent.getNextNode(false);
    }
    return null;
  }

  /**
   * Returns the next sibling, or `null`.
   *
   * @group Moving around the tree
   */
  public getNextSibling(): Node | null {
    if (this.parent) {
      const nextIndex = this.parent.getChildIndex(this) + 1;
      return nextIndex < this.parent.children.length
        ? (this.parent.children[nextIndex] ?? null)
        : null;
    }
    return null;
  }

  /**
   * Like `getNextNode`, but skipping nodes inside closed folders — this is
   * what the arrow keys use.
   *
   * @group Moving around the tree
   */
  public getNextVisibleNode(): Node | null {
    if (this.hasChildren() && this.is_open) {
      // First child
      return this.children[0] ?? null;
    }
    if (this.parent) {
      const nextSibling = this.getNextSibling();
      if (nextSibling) {
        // Next sibling
        return nextSibling;
      }
      // Next node of parent
      return this.parent.getNextNode(false);
    }
    return null;
  }

  /**
   * Returns the first node for which the callback returns `true`.
   *
   * @group Searching
   */
  public getNodeByCallback(callback: (node: Node) => boolean): Node | null {
    let result: Node | null = null;

    this.iterate((node: Node) => {
      if (result) {
        return false;
      }
      if (callback(node)) {
        result = node;
        return false;
      }
      return true;
    });

    return result;
  }

  /**
   * Returns the node with this id. Only available on the root node, which
   * keeps the id index.
   *
   * @group Searching
   */
  public getNodeById(nodeId: NodeId): Node | null {
    return this.idMapping?.get(nodeId) ?? null;
  }

  /**
   * Returns the first node with this name.
   *
   * @group Searching
   */
  public getNodeByName(name: string): Node | null {
    return this.getNodeByCallback((node: Node) => node.name === name);
  }

  /**
   * Like `getNodeByName`, but throws when there is no such node.
   *
   * @group Searching
   */
  public getNodeByNameMustExist(name: string): Node {
    const node = this.getNodeByCallback((n: Node) => n.name === name);

    if (!node) {
      throw new Error(`Node with name ${name} not found`);
    }

    return node;
  }

  /**
   * Returns all nodes with this property value.
   *
   * @group Searching
   */
  public getNodesByProperty(key: string, value: unknown): Node[] {
    return this.filter((node: Node) => node[key] === value);
  }

  /**
   * Returns the parent: `null` for a top-level node — the root node is not
   * returned.
   *
   * @group Moving around the tree
   */
  public getParent(): Node | null {
    // Return parent except if it is the root node
    if (!this.parent) {
      return null;
    }
    if (this.parent.parent) {
      return this.parent;
    }
    // Root node -> null
    return null;
  }

  /**
   * Returns the previous node in the tree, regardless of whether it is
   * visible.
   *
   * @group Moving around the tree
   */
  public getPreviousNode(): Node | null {
    if (this.parent) {
      const previousSibling = this.getPreviousSibling();

      if (!previousSibling) {
        return this.getParent();
      }
      return previousSibling.hasChildren()
        ? previousSibling.getLastChild()
        : previousSibling;
    }
    return null;
  }

  /**
   * Returns the previous sibling, or `null`.
   *
   * @group Moving around the tree
   */
  public getPreviousSibling(): Node | null {
    if (this.parent) {
      const previousIndex = this.parent.getChildIndex(this) - 1;
      return previousIndex >= 0
        ? (this.parent.children[previousIndex] ?? null)
        : null;
    }
    return null;
  }

  /**
   * Like `getPreviousNode`, but skipping nodes inside closed folders —
   * this is what the arrow keys use.
   *
   * @group Moving around the tree
   */
  public getPreviousVisibleNode(): Node | null {
    if (this.parent) {
      const previousSibling = this.getPreviousSibling();

      if (!previousSibling) {
        return this.getParent();
      }
      if (!previousSibling.hasChildren() || !previousSibling.is_open) {
        // Previous sibling
        return previousSibling;
      }
      // Last child of previous sibling
      return previousSibling.getLastChild();
    }
    return null;
  }

  /**
   * Whether the node has children.
   *
   * @group Inspecting a node
   */
  public hasChildren(): boolean {
    return this.children.length !== 0;
  }

  /**
   * Init Node from data without making it the root of the tree.
   *
   * @hidden
   */
  public initFromData(data: NodeData): void {
    const addNode = (nodeData: NodeData): void => {
      this.setData(nodeData);

      if (isNodeRecordWithChildren(nodeData) && nodeData.children.length) {
        addChildren(nodeData.children);
      }
    };

    const addChildren = (childrenData: NodeData[]): void => {
      for (const child of childrenData) {
        const node = this.createNode();
        node.initFromData(child);
        this.addChild(node);
      }
    };

    addNode(data);
  }

  /**
   * `true` when the node has children, or is marked `load_on_demand`.
   *
   * @group Inspecting a node
   */
  public isFolder(): boolean {
    return this.hasChildren() || this.load_on_demand;
  }

  /**
   * Whether this node is an ancestor of the other node.
   *
   * @group Inspecting a node
   */
  public isParentOf(node: Node): boolean {
    let parent = node.parent;

    while (parent) {
      if (parent === this) {
        return true;
      }

      parent = parent.parent;
    }

    return false;
  }

  /**
   * Walks the subtree, calling the callback with `(node, level)`. Return
   * `false` from the callback to stop descending into that node:
   *
   * ```js
   * tree.getTree().iterate((node, level) => {
   *   console.log(" ".repeat(level) + node.name);
   *   return level <= 2; // don't go deeper than level 2
   * });
   * ```
   *
   * @group Searching
   */
  public iterate(callback: IterateCallback): void {
    const _iterate = (node: Node, level: number): void => {
      for (const child of node.children) {
        const result = callback(child, level);

        if (result && child.hasChildren()) {
          _iterate(child, level + 1);
        }
      }
    };

    _iterate(this, 0);
  }

  /**
   * Replaces the children with new node data.
   *
   * @group Changing the tree
   */
  public loadFromData(data: NodeData[]): this {
    this.removeChildren();

    for (const childData of data) {
      const node = this.createNode(childData);
      this.addChild(node);

      if (isNodeRecordWithChildren(childData)) {
        node.loadFromData(childData.children);
      }
    }

    return this;
  }

  /**
   * Moves a node relative to another node. Called on the root node.
   *
   * @param position - `"before"`, `"after"` or `"inside"`.
   * @returns `false` when the move is impossible, for instance moving a
   * node into its own subtree.
   * @group Changing the tree
   */
  public moveNode(
    movedNode: Node,
    targetNode: Node,
    position: Position,
  ): boolean {
    if (!movedNode.parent || movedNode.isParentOf(targetNode)) {
      // - Node is parent of target node
      // - Or, parent is empty
      return false;
    }
    movedNode.parent.doRemoveChild(movedNode);

    switch (position) {
      case "after": {
        if (targetNode.parent) {
          targetNode.parent.addChildAtPosition(
            movedNode,
            targetNode.parent.getChildIndex(targetNode) + 1,
          );
          return true;
        }
        return false;
      }

      case "before": {
        if (targetNode.parent) {
          targetNode.parent.addChildAtPosition(
            movedNode,
            targetNode.parent.getChildIndex(targetNode),
          );
          return true;
        }
        return false;
      }

      case "inside": {
        // move inside as first child
        targetNode.addChildAtPosition(movedNode, 0);
        return true;
      }
    }
  }

  /**
   * Adds a child at the start.
   *
   * @returns The new node.
   * @group Changing the tree
   */
  public prepend(nodeInfo: NodeData): Node {
    const node = this.createNode(nodeInfo);
    this.addChildAtPosition(node, 0);

    node.loadChildrenFromData(nodeInfo);
    return node;
  }

  /**
   * Removes this node from its parent.
   *
   * @group Changing the tree
   */
  public remove(): void {
    if (!this.parent) {
      return;
    }

    this.parent.removeChild(this);
    this.parent = null;
  }

  /**
   * Removes a child and its children.
   *
   * @group Changing the tree
   */
  public removeChild(node: Node): void {
    // remove children from the index
    node.removeChildren();

    this.doRemoveChild(node);
  }

  /**
   * Removes all children.
   *
   * @group Changing the tree
   */
  public removeChildren(): void {
    this.iterate((child: Node) => {
      this.tree?.removeNodeFromIndex(child);
      return true;
    });

    this.children = [];
  }

  /**
  @hidden
  */
  public removeNodeFromIndex(node: Node): void {
    if (node.id != null) {
      this.idMapping?.delete(node.id);
    }
  }

  /**
   * Updates the node's properties from node data. `children` and `parent`
   * are ignored. A string sets the name. Existing node values are not
   * removed.
   *
   * @group Changing the tree
   */
  public setData(o: NodeData | null): void {
    if (!o) {
      return;
    }
    if (typeof o === "string") {
      this.name = o;
    } else if (typeof o === "object") {
      for (const key in o) {
        if (!Object.prototype.hasOwnProperty.call(o, key)) {
          continue;
        }

        const value = o[key];

        if (key === "label" || key === "name") {
          // You can use the 'label' key instead of 'name'; this is a legacy feature
          if (typeof value === "string") {
            this.name = value;
          }
        } else if (key !== "children" && key !== "parent") {
          // You can't update the children or the parent using this function
          this[key] = value;
        }
      }
    }
  }

  private createNode(nodeData?: NodeData): Node {
    const nodeClass = this.getNodeClass();
    return new nodeClass(nodeData);
  }

  private doRemoveChild(node: Node): void {
    this.children.splice(this.getChildIndex(node), 1);
    this.tree?.removeNodeFromIndex(node);
  }

  private getNodeClass(): typeof Node {
    return this.nodeClass ?? this.tree?.nodeClass ?? Node;
  }

  // Load children data from nodeInfo if it has children
  private loadChildrenFromData(nodeInfo: NodeData) {
    if (isNodeRecordWithChildren(nodeInfo) && nodeInfo.children.length) {
      this.loadFromData(nodeInfo.children);
    }
  }

  private setParent(parent: Node): void {
    this.parent = parent;
    this.tree = parent.tree;
    this.tree?.addNodeToIndex(this);
  }
}
