import type {
  GetNodeById,
  GetNodeElementForNode,
  OpenParents,
  TriggerEvent,
} from "./methodTypes";
import type { Node, NodeId } from "./node";
import type { OnCanSelectNode } from "./options";

export interface SelectNodeOptions {
  mustSetFocus?: boolean;
  mustToggle?: boolean;
}

interface SelectNodeHandlerParameters {
  getNodeById: GetNodeById;
  getNodeElementForNode: GetNodeElementForNode;
  getOnCanSelectNode: () => OnCanSelectNode | undefined;
  getSelectable: () => boolean;
  openParents: OpenParents;
  saveState: () => void;
  triggerEvent: TriggerEvent;
}

export default class SelectNodeHandler {
  private getNodeById: GetNodeById;
  private getNodeElementForNode: GetNodeElementForNode;
  private getOnCanSelectNode: () => OnCanSelectNode | undefined;
  private getSelectable: () => boolean;
  private openParents: OpenParents;
  private saveState: () => void;
  private selectedNodes: Set<NodeId>;
  private selectedSingleNode: Node | null;
  private triggerEvent: TriggerEvent;

  constructor({
    getNodeById,
    getNodeElementForNode,
    getOnCanSelectNode,
    getSelectable,
    openParents,
    saveState,
    triggerEvent,
  }: SelectNodeHandlerParameters) {
    this.getNodeById = getNodeById;
    this.getNodeElementForNode = getNodeElementForNode;
    this.getOnCanSelectNode = getOnCanSelectNode;
    this.getSelectable = getSelectable;
    this.openParents = openParents;
    this.saveState = saveState;
    this.selectedNodes = new Set<NodeId>();
    this.selectedSingleNode = null;
    this.triggerEvent = triggerEvent;
  }

  public addToSelection(node: Node): void {
    if (node.id != null) {
      this.selectedNodes.add(node.id);
    } else {
      this.selectedSingleNode = node;
    }
  }

  public clear(): void {
    this.selectedNodes.clear();
    this.selectedSingleNode = null;
  }

  public getSelectedNode(): Node | null {
    const selectedNodes = this.getSelectedNodes();

    if (selectedNodes.length) {
      return selectedNodes[0] ?? null;
    } else {
      return null;
    }
  }

  public getSelectedNodes(): Node[] {
    if (this.selectedSingleNode) {
      return [this.selectedSingleNode];
    } else {
      const selectedNodes: Node[] = [];

      this.selectedNodes.forEach((id) => {
        const node = this.getNodeById(id);
        if (node) {
          selectedNodes.push(node);
        }
      });

      return selectedNodes;
    }
  }

  public getSelectedNodesUnder(parent: Node): Node[] {
    if (this.selectedSingleNode) {
      if (parent.isParentOf(this.selectedSingleNode)) {
        return [this.selectedSingleNode];
      } else {
        return [];
      }
    } else {
      const selectedNodes: Node[] = [];

      this.selectedNodes.forEach((id) => {
        const node = this.getNodeById(id);
        if (node && parent.isParentOf(node)) {
          selectedNodes.push(node);
        }
      });

      return selectedNodes;
    }
  }

  public isNodeSelected(node: Node): boolean {
    if (node.id != null) {
      return this.selectedNodes.has(node.id);
    } else if (this.selectedSingleNode) {
      return this.selectedSingleNode === node;
    } else {
      return false;
    }
  }

  public removeFromSelection(node: Node, includeChildren = false): void {
    if (node.id == null) {
      if (this.selectedSingleNode === node) {
        this.selectedSingleNode = null;
      }
    } else {
      this.selectedNodes.delete(node.id);

      if (includeChildren) {
        node.iterate(() => {
          if (node.id != null) {
            this.selectedNodes.delete(node.id);
          }
          return true;
        });
      }
    }
  }

  /* Select a single node.
   * Renders the changed elements.
   * Deselects if the node is currently selected (if the mustToggle is on).
   * Deselects the previously selected node.
   * Check if the node is selectable.
   * Saves the state.
   * Options:
   * mustSetFocus: set the focus to the selected node
   * mustToggle: support deselecting the selected node
   */
  public selectSingleNode(node: Node, optionsParam?: SelectNodeOptions) {
    const defaultOptions = { mustSetFocus: true, mustToggle: true };
    const selectOptions = { ...defaultOptions, ...(optionsParam ?? {}) };

    const canSelect = (): boolean => {
      if (!this.getSelectable()) {
        return false;
      }

      const onCanSelectNode = this.getOnCanSelectNode();
      return onCanSelectNode ? onCanSelectNode(node) : true;
    };

    if (!canSelect()) {
      return;
    }

    const deselectCurrentNode = (deselectedNode: Node) => {
      this.removeFromSelection(deselectedNode);
      this.getNodeElementForNode(deselectedNode).deselect();
    };

    if (this.isNodeSelected(node)) {
      if (selectOptions.mustToggle) {
        deselectCurrentNode(node);
        this.triggerEvent("tree.deselect", { node });
      }
    } else {
      const deselectedNode = this.getSelectedNode();

      if (deselectedNode) {
        deselectCurrentNode(deselectedNode);
      }

      this.addToSelection(node);
      this.openParents(node);
      this.getNodeElementForNode(node).select(selectOptions.mustSetFocus);

      this.triggerEvent("tree.select", {
        deselectedNode,
        node,
      });
    }

    this.saveState();
  }
}
