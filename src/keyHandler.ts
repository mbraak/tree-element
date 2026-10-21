import type {
  CloseNode,
  FocusNode,
  GetActiveNode,
  GetFocusedNode,
  GetSelectedNode,
  GetTree,
  OpenNode,
  SelectNode,
  ToggleNodeInSelection,
  TriggerEvent,
} from "./methodTypes";
import type { Node } from "./node";

interface KeyHandlerParams {
  closeNode: CloseNode;
  focusNode: FocusNode;
  getActiveNode: GetActiveNode;
  getFocusedNode: GetFocusedNode;
  getSelectedNode: GetSelectedNode;
  getTree: GetTree;
  keyboardSupport: boolean;
  multiSelect: boolean;
  openNode: OpenNode;
  selectNode: SelectNode;
  toggleNodeInSelection: ToggleNodeInSelection;
  triggerEvent: TriggerEvent;
}

/* The keys move from the selected node and select the node they move to.
 * With multiSelect they move from the focused node and only move the focus;
 * Space adds the focused node to the selection or removes it.
 */

export default class KeyHandler {
  private closeNode: CloseNode;
  private focusNode: FocusNode;
  private getActiveNode: GetActiveNode;
  private getFocusedNode: GetFocusedNode;
  private getSelectedNode: GetSelectedNode;
  private getTree: GetTree;

  private keyboardSupport: boolean;
  private multiSelect: boolean;
  private openNode: OpenNode;
  private originalSelectNode: SelectNode;
  private toggleNodeInSelection: ToggleNodeInSelection;
  private triggerEvent: TriggerEvent;

  constructor({
    closeNode,
    focusNode,
    getActiveNode,
    getFocusedNode,
    getSelectedNode,
    getTree,
    keyboardSupport,
    multiSelect,
    openNode,
    selectNode,
    toggleNodeInSelection,
    triggerEvent,
  }: KeyHandlerParams) {
    this.closeNode = closeNode;
    this.focusNode = focusNode;
    this.getActiveNode = getActiveNode;
    this.getFocusedNode = getFocusedNode;
    this.getSelectedNode = getSelectedNode;
    this.getTree = getTree;
    this.keyboardSupport = keyboardSupport;
    this.multiSelect = multiSelect;
    this.openNode = openNode;
    this.originalSelectNode = selectNode;
    this.toggleNodeInSelection = toggleNodeInSelection;
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
    return this.goToNode(this.getCurrentNode()?.getNextVisibleNode());
  }

  public moveUp(): boolean {
    return this.goToNode(this.getCurrentNode()?.getPreviousVisibleNode());
  }

  // Activate the node, for example to open its edit page.
  private activate(node: Node, originalEvent: KeyboardEvent): boolean {
    this.triggerEvent("tree.activate", { node, originalEvent });
    return true;
  }

  // No node is selected. These keys select the focused node, which is
  // usually the first node, see TreeElement.updateTabStop.
  private getCurrentNode(): Node | null {
    return this.multiSelect ? this.getActiveNode() : this.getSelectedNode();
  }

  // Move to the node: select it, or with multiSelect focus it.
  // Result: there was a node to move to.
  private goToNode(node?: Node | null): boolean {
    if (!node) {
      return false;
    }

    if (this.multiSelect) {
      this.focusNode(node);
    } else {
      this.originalSelectNode(node);
    }

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

  private handleKey(key: string, focusedNode: Node): boolean {
    return this.getCurrentNode()
      ? this.handleArrowKey(key)
      : this.handleKeyWithoutSelection(key, focusedNode);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    const focusedNode = this.getFocusedNode();

    if (!focusedNode) {
      return;
    }

    let isKeyHandled: boolean;

    switch (e.key) {
      case " ": {
        isKeyHandled = this.multiSelect
          ? this.toggle(focusedNode)
          : this.handleKey(e.key, focusedNode);
        break;
      }

      case "End": {
        isKeyHandled = this.goToNode(this.getTree()?.getLastChild());
        break;
      }

      case "Enter": {
        // Without a selected node, activate the focused node
        isKeyHandled = this.activate(
          this.multiSelect
            ? focusedNode
            : (this.getSelectedNode() ?? focusedNode),
          e,
        );
        break;
      }

      case "Home": {
        isKeyHandled = this.goToNode(this.getTree()?.children[0]);
        break;
      }

      default: {
        isKeyHandled = this.handleKey(e.key, focusedNode);
      }
    }

    if (isKeyHandled) {
      e.preventDefault();
    }
  };

  private handleKeyWithoutSelection(key: string, focusedNode: Node): boolean {
    switch (key) {
      case " ":
      case "ArrowDown":
      case "ArrowRight": {
        return this.goToNode(focusedNode);
      }

      default: {
        return false;
      }
    }
  }

  private moveLeft(): boolean {
    const currentNode = this.getCurrentNode();

    /* istanbul ignore if */
    if (!currentNode) {
      return false;
    }

    if (currentNode.isFolder() && currentNode.is_open) {
      // Left on an open node closes the node
      void this.closeNode(currentNode);
      return true;
    }
    // Left on a closed or end node moves focus to the node's parent
    return this.goToNode(currentNode.getParent());
  }

  private moveRight(): boolean {
    const currentNode = this.getCurrentNode();

    if (currentNode?.isFolder()) {
      // folder node
      if (currentNode.is_open) {
        // Right moves to the first child of an open node
        return this.goToNode(currentNode.getNextVisibleNode());
      }
      // Right expands a closed node
      void this.openNode(currentNode);
      return true;
    }
    return false;
  }

  private toggle(node: Node): boolean {
    this.toggleNodeInSelection(node);
    return true;
  }
}
