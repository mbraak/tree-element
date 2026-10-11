import type {
  CloseNode,
  GetFocusedNode,
  GetSelectedNode,
  GetTree,
  OpenNode,
  SelectNode,
  TriggerEvent,
} from "./methodTypes";
import type { Node } from "./node";

interface KeyHandlerParams {
  closeNode: CloseNode;
  getFocusedNode: GetFocusedNode;
  getSelectedNode: GetSelectedNode;
  getTree: GetTree;
  keyboardSupport: boolean;
  openNode: OpenNode;
  selectNode: SelectNode;
  triggerEvent: TriggerEvent;
}

export default class KeyHandler {
  private closeNode: CloseNode;
  private getFocusedNode: GetFocusedNode;
  private getSelectedNode: GetSelectedNode;
  private getTree: GetTree;

  private keyboardSupport: boolean;
  private openNode: OpenNode;
  private originalSelectNode: SelectNode;
  private triggerEvent: TriggerEvent;

  constructor({
    closeNode,
    getFocusedNode,
    getSelectedNode,
    getTree,
    keyboardSupport,
    openNode,
    selectNode,
    triggerEvent,
  }: KeyHandlerParams) {
    this.closeNode = closeNode;
    this.getFocusedNode = getFocusedNode;
    this.getSelectedNode = getSelectedNode;
    this.getTree = getTree;
    this.keyboardSupport = keyboardSupport;
    this.openNode = openNode;
    this.originalSelectNode = selectNode;
    this.triggerEvent = triggerEvent;

    if (keyboardSupport) {
      document.addEventListener("keydown", this.handleKeyDown);
    }
  }

  public deinit(): void {
    if (this.keyboardSupport) {
      document.removeEventListener("keydown", this.handleKeyDown);
    }
  }

  public moveDown(): boolean {
    return this.selectNode(this.getSelectedNode()?.getNextVisibleNode());
  }

  public moveUp(): boolean {
    return this.selectNode(this.getSelectedNode()?.getPreviousVisibleNode());
  }

  // Activate the node, for example to open its edit page.
  private activate(node: Node, originalEvent: KeyboardEvent): boolean {
    this.triggerEvent("tree.activate", { node, originalEvent });
    return true;
  }

  private handleArrowKey(key: string): boolean {
    switch (key) {
      case "ArrowDown": {
        return this.moveDown();
      }

      case "ArrowLeft": {
        return this.moveLeft();
      }

      case "ArrowRight": {
        return this.moveRight();
      }

      case "ArrowUp": {
        return this.moveUp();
      }

      default: {
        return false;
      }
    }
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    const focusedNode = this.getFocusedNode();

    if (!focusedNode) {
      return;
    }

    let isKeyHandled: boolean;

    const selectedNode = this.getSelectedNode();

    switch (e.key) {
      case "End": {
        isKeyHandled = this.selectNode(this.getTree()?.getLastChild());
        break;
      }

      case "Enter": {
        // Without a selected node, activate the focused node
        isKeyHandled = this.activate(selectedNode ?? focusedNode, e);
        break;
      }

      case "Home": {
        isKeyHandled = this.selectNode(this.getTree()?.children[0]);
        break;
      }

      default: {
        isKeyHandled = selectedNode
          ? this.handleArrowKey(e.key)
          : this.handleKeyWithoutSelection(e.key, focusedNode);
      }
    }

    if (isKeyHandled) {
      e.preventDefault();
    }
  };

  // No node is selected. These keys select the focused node, which is
  // usually the first node, see TreeElement.updateTabStop.
  private handleKeyWithoutSelection(key: string, focusedNode: Node): boolean {
    switch (key) {
      case " ":
      case "ArrowDown":
      case "ArrowRight": {
        return this.selectNode(focusedNode);
      }

      default: {
        return false;
      }
    }
  }

  private moveLeft(): boolean {
    const selectedNode = this.getSelectedNode();

    /* istanbul ignore if */
    if (!selectedNode) {
      return false;
    }

    if (selectedNode.isFolder() && selectedNode.is_open) {
      // Left on an open node closes the node
      void this.closeNode(selectedNode);
      return true;
    }
    // Left on a closed or end node moves focus to the node's parent
    return this.selectNode(selectedNode.getParent());
  }

  private moveRight(): boolean {
    const selectedNode = this.getSelectedNode();

    if (selectedNode?.isFolder()) {
      // folder node
      if (selectedNode.is_open) {
        // Right moves to the first child of an open node
        return this.selectNode(selectedNode.getNextVisibleNode());
      }
      // Right expands a closed node
      void this.openNode(selectedNode);
      return true;
    }
    return false;
  }

  /* Select the node.
   * Don't do anything if the node is null.
   * Result: a different node was selected.
   */
  private selectNode(node?: Node | null): boolean {
    if (node) {
      this.originalSelectNode(node);

      return true;
    }
    return false;
  }
}
