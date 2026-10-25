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
  updateTabStop: () => void;
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
  private updateTabStop: () => void;

  constructor({
    getNodeById,
    getNodeElementForNode,
    getOnCanSelectNode,
    getSelectable,
    openParents,
    saveState,
    triggerEvent,
    updateTabStop,
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
    this.updateTabStop = updateTabStop;
  }

  public addToSelection(node: Node): void {
    if (node.id == null) {
      this.selectedSingleNode = node;
    } else {
      this.selectedNodes.add(node.id);
    }
  }

  public clear(): void {
    this.selectedNodes.clear();
    this.selectedSingleNode = null;
  }

  public getSelectedNode(): Node | null {
    const selectedNodes = this.getSelectedNodes();

    return selectedNodes.length ? (selectedNodes[0] ?? null) : null;
  }

  public getSelectedNodes(): Node[] {
    if (this.selectedSingleNode) {
      return [this.selectedSingleNode];
    }

    const selectedNodes: Node[] = [];

    this.selectedNodes.forEach((id) => {
      const node = this.getNodeById(id);
      if (node) {
        selectedNodes.push(node);
      }
    });

    return selectedNodes;
  }

  public getSelectedNodesUnder(parent: Node): Node[] {
    if (this.selectedSingleNode) {
      return parent.isParentOf(this.selectedSingleNode)
        ? [this.selectedSingleNode]
        : [];
    }

    const selectedNodes: Node[] = [];

    this.selectedNodes.forEach((id) => {
      const node = this.getNodeById(id);
      if (node && parent.isParentOf(node)) {
        selectedNodes.push(node);
      }
    });

    return selectedNodes;
  }

  public isNodeSelected(node: Node): boolean {
    if (node.id != null) {
      return this.selectedNodes.has(node.id);
    }
    return this.selectedSingleNode ? this.selectedSingleNode === node : false;
  }

  public removeFromSelection(node: Node, includeChildren = false): void {
    if (node.id == null) {
      if (this.selectedSingleNode === node) {
        this.selectedSingleNode = null;
      }
    } else {
      this.selectedNodes.delete(node.id);

      if (includeChildren) {
        node.iterate((child: Node) => {
          if (child.id != null) {
            this.selectedNodes.delete(child.id);
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
    if (!this.canSelect(node)) {
      return;
    }

    const defaultOptions = { mustSetFocus: true, mustToggle: true };
    const selectOptions = { ...defaultOptions, ...optionsParam };

    const otherSelectedNodes = this.getSelectedNodes().filter(
      (selectedNode) => selectedNode !== node,
    );

    if (this.isNodeSelected(node)) {
      if (otherSelectedNodes.length) {
        // Part of a multiple selection: keep only this node selected
        for (const otherNode of otherSelectedNodes) {
          this.deselectNode(otherNode);
        }

        for (const otherNode of otherSelectedNodes) {
          this.triggerEvent("tree.deselect", { node: otherNode });
        }
      } else if (selectOptions.mustToggle) {
        this.deselectNode(node);
        this.triggerEvent("tree.deselect", { node });
      }
    } else {
      // tree.select reports the first deselected node; the others, from a
      // multiple selection, get a tree.deselect.
      const [deselectedNode = null, ...alsoDeselectedNodes] =
        otherSelectedNodes;

      for (const otherNode of otherSelectedNodes) {
        this.deselectNode(otherNode);
      }

      this.addToSelection(node);
      this.openParents(node);
      this.getNodeElementForNode(node).select(selectOptions.mustSetFocus);

      for (const otherNode of alsoDeselectedNodes) {
        this.triggerEvent("tree.deselect", { node: otherNode });
      }

      this.triggerEvent("tree.select", {
        deselectedNode,
        node,
      });
    }

    this.updateTabStop();
    this.saveState();
  }

  /* Add a node to the selection, or remove it when it is selected, without
   * changing the other selected nodes.
   * Checks if the node is selectable and saves the state.
   */
  public toggleNodeInSelection(node: Node, mustSetFocus = true): void {
    if (!this.canSelect(node)) {
      return;
    }

    if (this.isNodeSelected(node)) {
      this.deselectNode(node);
      this.triggerEvent("tree.deselect", { node });
    } else {
      this.addToSelection(node);
      this.openParents(node);
      this.getNodeElementForNode(node).select(mustSetFocus);

      this.triggerEvent("tree.select", { deselectedNode: null, node });
    }

    this.updateTabStop();
    this.saveState();
  }

  private canSelect(node: Node): boolean {
    if (!this.getSelectable()) {
      return false;
    }

    const onCanSelectNode = this.getOnCanSelectNode();
    return onCanSelectNode ? onCanSelectNode(node) : true;
  }

  private deselectNode(node: Node): void {
    this.removeFromSelection(node);
    this.getNodeElementForNode(node).deselect();
  }
}
