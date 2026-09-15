import type {
  AddToSelection,
  GetNodeById,
  GetSelectedNodes,
  GetTree,
  OpenNode,
  RefreshElements,
  RemoveFromSelection,
} from "treeElement/methodTypes";
import type {
  OnGetStateFromStorage,
  OnSetStateFromStorage,
} from "treeElement/options";

import { Node } from "treeElement/node";
import SaveStateHandler from "treeElement/saveStateHandler";

interface CreateSaveStateHandlerParams {
  addToSelection?: AddToSelection;
  getNodeById?: GetNodeById;
  getSelectedNodes?: GetSelectedNodes;
  getTree?: GetTree;
  onGetStateFromStorage?: OnGetStateFromStorage;
  onSetStateFromStorage?: OnSetStateFromStorage;
  openNode?: OpenNode;
  refreshElements?: RefreshElements;
  removeFromSelection?: RemoveFromSelection;
  saveState?: boolean | string;
}

const createSaveStateHandler = ({
  addToSelection = vi.fn<AddToSelection>(),
  getNodeById = vi.fn<GetNodeById>(),
  getSelectedNodes = vi.fn<GetSelectedNodes>(() => []),
  getTree = vi.fn<GetTree>(),
  onGetStateFromStorage,
  onSetStateFromStorage,
  openNode = vi.fn<OpenNode>(),
  refreshElements = vi.fn<RefreshElements>(),
  removeFromSelection = vi.fn<RemoveFromSelection>(),
  saveState = true,
}: CreateSaveStateHandlerParams) =>
  new SaveStateHandler({
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
  });

describe("getNodeIdToBeSelected", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("returns the first selected node id from the state in local storage", () => {
    localStorage.setItem("tree", '{"selected_node":[123,124]}');

    const saveStateHandler = createSaveStateHandler({});

    expect(saveStateHandler.getNodeIdToBeSelected()).toBe(123);
  });

  it("returns null when the state doesn't contain a selected node", () => {
    localStorage.setItem("tree", "{}");

    const saveStateHandler = createSaveStateHandler({});

    expect(saveStateHandler.getNodeIdToBeSelected()).toBeNull();
  });

  it("returns null when saveState is false", () => {
    localStorage.setItem("tree", '{"selected_node":[123]}');

    const saveStateHandler = createSaveStateHandler({ saveState: false });

    expect(saveStateHandler.getNodeIdToBeSelected()).toBeNull();
  });
});

describe("getStateFromStorage", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("returns null when the state is not in local storage", () => {
    localStorage.clear();

    const saveStateHandler = createSaveStateHandler({});

    expect(saveStateHandler.getStateFromStorage()).toBeNull();
  });

  it("returns an array of selected nodes when 'selected_node' in the states is a number", () => {
    localStorage.setItem("tree", JSON.stringify({ selected_node: 123 }));

    const saveStateHandler = createSaveStateHandler({});

    expect(saveStateHandler.getStateFromStorage()).toStrictEqual({
      selected_node: [123],
    });
  });

  it("returns null when saveState is false", () => {
    localStorage.setItem("tree", '{"selected_node":[123]}');

    const saveStateHandler = createSaveStateHandler({ saveState: false });

    expect(saveStateHandler.getStateFromStorage()).toBeNull();
  });

  it("reads the state with onGetStateFromStorage when it is set", () => {
    const onGetStateFromStorage = vi.fn(() => '{"selected_node":[123]}');

    const saveStateHandler = createSaveStateHandler({
      onGetStateFromStorage,
    });

    expect(saveStateHandler.getStateFromStorage()).toStrictEqual({
      selected_node: [123],
    });
  });
});

describe("saveState", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("saves the state to local storage", () => {
    const node = new Node({ id: 123 });
    const getSelectedNodes = vi.fn(() => [node]);

    const saveStateHandler = createSaveStateHandler({ getSelectedNodes });
    saveStateHandler.saveState();

    expect(localStorage.getItem("tree")).toBe(
      '{"open_nodes":[],"selected_node":[123]}',
    );
  });

  it("uses the saveState option as a key when it is a string", () => {
    const saveStateHandler = createSaveStateHandler({
      saveState: "my-state",
    });
    saveStateHandler.saveState();

    expect(localStorage.getItem("my-state")).toBe(
      '{"open_nodes":[],"selected_node":[]}',
    );
  });

  it("doesn't save the state when saveState is false", () => {
    const saveStateHandler = createSaveStateHandler({ saveState: false });
    saveStateHandler.saveState();

    expect(localStorage.getItem("tree")).toBeNull();
  });

  it("calls onSetStateFromStorage when it is set", () => {
    const onSetStateFromStorage = vi.fn();

    const saveStateHandler = createSaveStateHandler({
      onSetStateFromStorage,
    });
    saveStateHandler.saveState();

    expect(onSetStateFromStorage).toHaveBeenCalledExactlyOnceWith(
      '{"open_nodes":[],"selected_node":[]}',
    );
    expect(localStorage.getItem("tree")).toBeNull();
  });

  it("doesn't call onSetStateFromStorage when saveState is false", () => {
    const onSetStateFromStorage = vi.fn();

    const saveStateHandler = createSaveStateHandler({
      onSetStateFromStorage,
      saveState: false,
    });
    saveStateHandler.saveState();

    expect(onSetStateFromStorage).not.toHaveBeenCalled();
  });
});

describe("setInitialState", () => {
  it("deselects nodes that are currently selected", () => {
    const node = new Node({ id: 123 });

    const getSelectedNodes = vi.fn(() => [node]);
    const removeFromSelection = vi.fn();

    const saveStateHandler = createSaveStateHandler({
      getSelectedNodes,
      removeFromSelection,
    });
    saveStateHandler.setInitialState({});

    expect(removeFromSelection).toHaveBeenCalledExactlyOnceWith(node);
  });
});

describe("setInitialStateOnDemand", () => {
  it("doesn't open a node when open_nodes in the state is empty", async () => {
    const openNode = vi.fn();

    const saveStateHandler = createSaveStateHandler({ openNode });
    await saveStateHandler.setInitialStateOnDemand({});

    expect(openNode).not.toHaveBeenCalled();
  });

  it("opens a node when the node id is in open_nodes in the state", async () => {
    const node = new Node({ id: 123 });
    const getNodeById = vi.fn((nodeId) => {
      if (nodeId === 123) {
        return node;
      } else {
        return null;
      }
    });
    const openNode = vi.fn();

    const saveStateHandler = createSaveStateHandler({
      getNodeById,
      openNode,
    });
    await saveStateHandler.setInitialStateOnDemand({ open_nodes: [123] });

    expect(openNode).toHaveBeenCalledExactlyOnceWith(node, false);
  });

  it("selects a node and redraws the tree when the node id is in selected_node in the state", async () => {
    const node = new Node({ id: 123 });
    const getNodeById = vi.fn((nodeId) => {
      if (nodeId === 123) {
        return node;
      } else {
        return null;
      }
    });
    const addToSelection = vi.fn();
    const refreshElements = vi.fn();

    const saveStateHandler = createSaveStateHandler({
      addToSelection,
      getNodeById,
      refreshElements,
    });

    await saveStateHandler.setInitialStateOnDemand({
      open_nodes: [123],
      selected_node: [123],
    });

    expect(addToSelection).toHaveBeenCalledExactlyOnceWith(node);
    expect(refreshElements).toHaveBeenCalledExactlyOnceWith(null);
  });

  it("opens nodes recursively", async () => {
    const node1 = new Node({ id: 1, load_on_demand: true });
    const node2 = new Node({ id: 2 });
    let calledGetNodeByIdForNode2 = false;

    const getNodeById = vi.fn((nodeId) => {
      switch (nodeId) {
        case 1:
          return node1;
        case 2: {
          // Return the node the second time.
          if (calledGetNodeByIdForNode2) {
            return node2;
          } else {
            calledGetNodeByIdForNode2 = true;
            return null;
          }
        }
        default:
          return null;
      }
    });

    const openNode = vi.fn<OpenNode>((node: Node, _slide?: boolean) => {
      node.load_on_demand = false;
      node.is_open = true;

      return Promise.resolve();
    });

    const saveStateHandler = createSaveStateHandler({
      getNodeById,
      openNode,
    });

    await saveStateHandler.setInitialStateOnDemand({ open_nodes: [1, 2] });

    expect(openNode).toHaveBeenNthCalledWith(1, node1, false);
    expect(openNode).toHaveBeenNthCalledWith(2, node1, false);
    expect(openNode).toHaveBeenNthCalledWith(3, node2, false);
  });
});
