import type {
  GetNodeById,
  GetNodeElementForNode,
  OpenParents,
  TriggerEvent,
} from "treeElement/methodTypes";
import type { NodeId } from "treeElement/node";
import type NodeElement from "treeElement/nodeElement";
import type { OnCanSelectNode } from "treeElement/options";

import { Node } from "treeElement/node";
import SelectNodeHandler from "treeElement/selectNodeHandler";
import { vi } from "vitest";

const createMockNodeElement = () => ({
  deselect: vi.fn(),
  select: vi.fn(),
});

type MockNodeElement = ReturnType<typeof createMockNodeElement>;

const asNodeElement = (mockNodeElement: MockNodeElement) =>
  mockNodeElement as unknown as NodeElement;

const createGetNodeById = (nodes: Node[]): GetNodeById => {
  const nodeMap = new Map<NodeId, Node>();

  for (const node of nodes) {
    if (node.id != null) {
      nodeMap.set(node.id, node);
    }
  }

  return (id: NodeId) => nodeMap.get(id) ?? null;
};

interface CreateSelectNodeHandlerParams {
  getNodeById?: GetNodeById;
  getNodeElementForNode?: GetNodeElementForNode;
  onCanSelectNode?: OnCanSelectNode;
  openParents?: OpenParents;
  saveState?: () => void;
  selectable?: boolean;
  triggerEvent?: TriggerEvent;
}

const createSelectNodeHandler = ({
  getNodeById = vi.fn(() => null),
  getNodeElementForNode = vi.fn(() => asNodeElement(createMockNodeElement())),
  onCanSelectNode,
  openParents = vi.fn(),
  saveState = vi.fn(),
  selectable = true,
  triggerEvent = vi.fn(),
}: CreateSelectNodeHandlerParams = {}) =>
  new SelectNodeHandler({
    getNodeById,
    getNodeElementForNode,
    getOnCanSelectNode: () => onCanSelectNode,
    getSelectable: () => selectable,
    openParents,
    saveState,
    triggerEvent,
  });

describe("getSelectedNodesUnder", () => {
  it("returns the nodes when the nodes have an id", () => {
    const node = new Node({ id: 1 });

    const child = new Node({ id: 2 });
    node.addChild(child);

    const selectNodeHandler = createSelectNodeHandler({
      getNodeById: createGetNodeById([node, child]),
    });
    selectNodeHandler.addToSelection(child);

    expect(selectNodeHandler.getSelectedNodesUnder(node)).toIncludeAllMembers([
      child,
    ]);
  });
});

describe("selectSingleNode", () => {
  it("selects the node", () => {
    const node = new Node({ id: 1 });

    const nodeElement = createMockNodeElement();
    const getNodeElementForNode = vi.fn(() => asNodeElement(nodeElement));
    const openParents = vi.fn();
    const saveState = vi.fn();
    const triggerEvent = vi.fn();

    const selectNodeHandler = createSelectNodeHandler({
      getNodeById: createGetNodeById([node]),
      getNodeElementForNode,
      openParents,
      saveState,
      triggerEvent,
    });

    selectNodeHandler.selectSingleNode(node);

    expect(selectNodeHandler.isNodeSelected(node)).toBeTrue();
    expect(openParents).toHaveBeenCalledWith(node);
    expect(nodeElement.select).toHaveBeenCalledWith(true);
    expect(triggerEvent).toHaveBeenCalledWith("tree.select", {
      deselectedNode: null,
      node,
    });
    expect(saveState).toHaveBeenCalledWith();
  });

  it("doesn't set the focus when mustSetFocus is false", () => {
    const node = new Node({ id: 1 });

    const nodeElement = createMockNodeElement();

    const selectNodeHandler = createSelectNodeHandler({
      getNodeById: createGetNodeById([node]),
      getNodeElementForNode: vi.fn(() => asNodeElement(nodeElement)),
    });

    selectNodeHandler.selectSingleNode(node, { mustSetFocus: false });

    expect(nodeElement.select).toHaveBeenCalledWith(false);
  });

  it("deselects the node when it is selected", () => {
    const node = new Node({ id: 1 });

    const nodeElement = createMockNodeElement();
    const triggerEvent = vi.fn();

    const selectNodeHandler = createSelectNodeHandler({
      getNodeById: createGetNodeById([node]),
      getNodeElementForNode: vi.fn(() => asNodeElement(nodeElement)),
      triggerEvent,
    });
    selectNodeHandler.addToSelection(node);

    selectNodeHandler.selectSingleNode(node);

    expect(selectNodeHandler.isNodeSelected(node)).toBeFalse();
    expect(nodeElement.deselect).toHaveBeenCalledWith();
    expect(triggerEvent).toHaveBeenCalledWith("tree.deselect", { node });
  });

  it("doesn't deselect the node when mustToggle is false", () => {
    const node = new Node({ id: 1 });

    const nodeElement = createMockNodeElement();
    const saveState = vi.fn();
    const triggerEvent = vi.fn();

    const selectNodeHandler = createSelectNodeHandler({
      getNodeById: createGetNodeById([node]),
      getNodeElementForNode: vi.fn(() => asNodeElement(nodeElement)),
      saveState,
      triggerEvent,
    });
    selectNodeHandler.addToSelection(node);

    selectNodeHandler.selectSingleNode(node, { mustToggle: false });

    expect(selectNodeHandler.isNodeSelected(node)).toBeTrue();
    expect(nodeElement.deselect).not.toHaveBeenCalled();
    expect(triggerEvent).not.toHaveBeenCalled();
    expect(saveState).toHaveBeenCalledWith();
  });

  it("deselects the previously selected node", () => {
    const node1 = new Node({ id: 1 });
    const node2 = new Node({ id: 2 });

    const nodeElements = new Map<Node, MockNodeElement>();
    nodeElements.set(node1, createMockNodeElement());
    nodeElements.set(node2, createMockNodeElement());

    const getNodeElementForNode = vi.fn((node: Node) =>
      asNodeElement(nodeElements.get(node) ?? createMockNodeElement()),
    );
    const triggerEvent = vi.fn();

    const selectNodeHandler = createSelectNodeHandler({
      getNodeById: createGetNodeById([node1, node2]),
      getNodeElementForNode,
      triggerEvent,
    });

    selectNodeHandler.selectSingleNode(node1);
    selectNodeHandler.selectSingleNode(node2);

    expect(selectNodeHandler.isNodeSelected(node1)).toBeFalse();
    expect(selectNodeHandler.isNodeSelected(node2)).toBeTrue();
    expect(nodeElements.get(node1)?.deselect).toHaveBeenCalledWith();
    expect(triggerEvent).toHaveBeenCalledWith("tree.select", {
      deselectedNode: node1,
      node: node2,
    });
  });

  it("doesn't select the node when selectable is false", () => {
    const node = new Node({ id: 1 });

    const saveState = vi.fn();
    const triggerEvent = vi.fn();

    const selectNodeHandler = createSelectNodeHandler({
      getNodeById: createGetNodeById([node]),
      saveState,
      selectable: false,
      triggerEvent,
    });

    selectNodeHandler.selectSingleNode(node);

    expect(selectNodeHandler.isNodeSelected(node)).toBeFalse();
    expect(triggerEvent).not.toHaveBeenCalled();
    expect(saveState).not.toHaveBeenCalled();
  });

  it("doesn't select the node when onCanSelectNode returns false", () => {
    const node = new Node({ id: 1 });

    const onCanSelectNode = vi.fn(() => false);
    const triggerEvent = vi.fn();

    const selectNodeHandler = createSelectNodeHandler({
      getNodeById: createGetNodeById([node]),
      onCanSelectNode,
      triggerEvent,
    });

    selectNodeHandler.selectSingleNode(node);

    expect(onCanSelectNode).toHaveBeenCalledWith(node);
    expect(selectNodeHandler.isNodeSelected(node)).toBeFalse();
    expect(triggerEvent).not.toHaveBeenCalled();
  });
});
