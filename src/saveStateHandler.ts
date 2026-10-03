import type {
  AddToSelection,
  GetNodeById,
  GetSelectedNodes,
  GetTree,
  OpenNode,
  RefreshElements,
  RemoveFromSelection,
} from "./methodTypes";
import type { Node, NodeId } from "./node";
import type { OnGetStateFromStorage, OnSetStateFromStorage } from "./options";

import { isInt } from "./util";

export interface SavedState {
  open_nodes?: NodeId[];
  selected_node?: NodeId[];
}

interface SaveStateHandlerParams {
  addToSelection: AddToSelection;
  getNodeById: GetNodeById;
  getSelectedNodes: GetSelectedNodes;
  getTree: GetTree;
  onGetStateFromStorage?: OnGetStateFromStorage;
  onSetStateFromStorage?: OnSetStateFromStorage;
  openNode: OpenNode;
  refreshElements: RefreshElements;
  removeFromSelection: RemoveFromSelection;
  saveState: boolean | string;
}

export default class SaveStateHandler {
  private addToSelection: AddToSelection;
  private getNodeById: GetNodeById;
  private getSelectedNodes: GetSelectedNodes;
  private getTree: GetTree;
  private onGetStateFromStorage?: OnGetStateFromStorage;
  private onSetStateFromStorage?: OnSetStateFromStorage;
  private openNode: OpenNode;
  private refreshElements: RefreshElements;
  private removeFromSelection: RemoveFromSelection;
  private saveStateOption: boolean | string;

  constructor({
    addToSelection,
    getNodeById,
    getSelectedNodes,
    getTree,
    onGetStateFromStorage,
    onSetStateFromStorage,
    openNode,
    refreshElements,
    removeFromSelection,
    saveState,
  }: SaveStateHandlerParams) {
    this.addToSelection = addToSelection;
    this.getNodeById = getNodeById;
    this.getSelectedNodes = getSelectedNodes;
    this.getTree = getTree;
    this.onGetStateFromStorage = onGetStateFromStorage;
    this.onSetStateFromStorage = onSetStateFromStorage;
    this.openNode = openNode;
    this.refreshElements = refreshElements;
    this.removeFromSelection = removeFromSelection;
    this.saveStateOption = saveState;
  }

  public getNodeIdToBeSelected(): NodeId | null {
    if (!this.saveStateOption) {
      return null;
    }

    const state = this.getStateFromStorage();

    return state?.selected_node ? (state.selected_node[0] ?? null) : null;
  }

  public getState(): SavedState {
    const getOpenNodeIds = (): NodeId[] => {
      const openNodes: NodeId[] = [];

      this.getTree()?.iterate((node: Node) => {
        if (node.is_open && node.id && node.hasChildren()) {
          openNodes.push(node.id);
        }
        return true;
      });

      return openNodes;
    };

    const getSelectedNodeIds = (): NodeId[] => {
      const selectedNodeIds: NodeId[] = [];

      for (const node of this.getSelectedNodes()) {
        if (node.id != null) {
          selectedNodeIds.push(node.id);
        }
      }

      return selectedNodeIds;
    };

    return {
      open_nodes: getOpenNodeIds(),
      selected_node: getSelectedNodeIds(),
    };
  }

  public getStateFromStorage(): null | SavedState {
    if (!this.saveStateOption) {
      return null;
    }

    const jsonData = this.loadFromStorage();

    return jsonData ? this.parseState(jsonData) : null;
  }

  public saveState(): void {
    if (!this.saveStateOption) {
      return;
    }

    const state = JSON.stringify(this.getState());

    if (this.onSetStateFromStorage) {
      this.onSetStateFromStorage(state);
    } else {
      localStorage.setItem(this.getKeyName(), state);
    }
  }

  /*
    Set initial state
    Don't handle nodes that are loaded on demand

    result: must load on demand (boolean)
    */
  public setInitialState(state: SavedState): boolean {
    const mustLoadOnDemand = state.open_nodes
      ? this.openInitialNodes(state.open_nodes)
      : false;

    this.resetSelection();

    if (state.selected_node) {
      this.selectInitialNodes(state.selected_node);
    }

    return mustLoadOnDemand;
  }

  public async setInitialStateOnDemand(state: SavedState): Promise<void> {
    let nodeIds = state.open_nodes;

    const openNodes = async () => {
      if (!nodeIds) {
        return;
      }

      const newNodesIds = [];

      for (const nodeId of nodeIds) {
        const node = this.getNodeById(nodeId);

        if (node) {
          if (!node.is_loading) {
            if (node.load_on_demand) {
              await loadAndOpenNode(node);
            } else {
              await this.openNode(node, false);
            }
          }
        } else {
          newNodesIds.push(nodeId);
        }
      }

      nodeIds = newNodesIds;

      if (state.selected_node && this.selectInitialNodes(state.selected_node)) {
        this.refreshElements(null);
      }
    };

    const loadAndOpenNode = async (node: Node) => {
      await this.openNode(node, false);
      await openNodes();
    };

    await openNodes();
  }

  private getKeyName(): string {
    return typeof this.saveStateOption === "string"
      ? this.saveStateOption
      : "tree";
  }

  private loadFromStorage(): null | string {
    return this.onGetStateFromStorage
      ? this.onGetStateFromStorage()
      : localStorage.getItem(this.getKeyName());
  }

  private openInitialNodes(nodeIds: NodeId[]): boolean {
    let mustLoadOnDemand = false;

    for (const nodeId of nodeIds) {
      const node = this.getNodeById(nodeId);

      if (node) {
        if (node.load_on_demand) {
          mustLoadOnDemand = true;
        } else {
          node.is_open = true;
        }
      }
    }

    return mustLoadOnDemand;
  }

  private parseState(jsonData: string): SavedState {
    const state = JSON.parse(jsonData) as Record<string, unknown>;

    // Check if selected_node is an int (instead of an array)
    if (state.selected_node && isInt(state.selected_node)) {
      // Convert to array
      state.selected_node = [state.selected_node];
    }

    return state;
  }

  private resetSelection(): void {
    const selectedNodes = this.getSelectedNodes();

    for (const node of selectedNodes) {
      this.removeFromSelection(node);
    }
  }

  private selectInitialNodes(nodeIds: NodeId[]): boolean {
    let selectCount = 0;

    for (const nodeId of nodeIds) {
      const node = this.getNodeById(nodeId);

      if (!node) {
        continue;
      }

      selectCount += 1;

      this.addToSelection(node);
    }

    return selectCount !== 0;
  }
}
