import type {
  CloseNode,
  GetFocusedNode,
  GetSelectedNode,
  OpenNode,
  SelectNode,
} from "./methodTypes";
import type { Node } from "./node";

interface KeyHandlerParams {
  closeNode: CloseNode;
  getFocusedNode: GetFocusedNode;
  getSelectedNode: GetSelectedNode;
  keyboardSupport: boolean;
  openNode: OpenNode;
  selectNode: SelectNode;
}

export default class KeyHandler {
  private closeNode: CloseNode;
  private getFocusedNode: GetFocusedNode;
  private getSelectedNode: GetSelectedNode;

  private keyboardSupport: boolean;
  private openNode: OpenNode;
  private originalSelectNode: SelectNode;

  constructor({
    closeNode,
    getFocusedNode,
    getSelectedNode,
    keyboardSupport,
    openNode,
    selectNode,
  }: KeyHandlerParams) {
    this.closeNode = closeNode;
    this.getFocusedNode = getFocusedNode;
    this.getSelectedNode = getSelectedNode;
    this.keyboardSupport = keyboardSupport;
    this.openNode = openNode;
    this.originalSelectNode = selectNode;

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

  private handleKeyDown = (e: KeyboardEvent): void => {
    const focusedNode = this.getFocusedNode();

    if (!focusedNode) {
      return;
    }

    let isKeyHandled = false;

    const selectedNode = this.getSelectedNode();
    if (selectedNode) {
      switch (e.key) {
        case "ArrowDown": {
          isKeyHandled = this.moveDown();
          break;
        }

        case "ArrowLeft": {
          isKeyHandled = this.moveLeft();
          break;
        }

        case "ArrowRight": {
          isKeyHandled = this.moveRight();
          break;
        }

        case "ArrowUp": {
          isKeyHandled = this.moveUp();
          break;
        }
      }
    } else {
      // No node is selected. These keys select the focused node, which is
      // usually the first node, see TreeElement.updateTabStop.
      switch (e.key) {
        case " ":
        case "ArrowDown":
        case "ArrowRight": {
          isKeyHandled = this.selectNode(focusedNode);
          break;
        }
      }
    }

    if (isKeyHandled) {
      e.preventDefault();
    }
  };

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
