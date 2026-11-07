import { Node } from "treeElement/node";
import GhostDropHint from "treeElement/nodeElement/ghostDropHint";

import defaultClassNames from "../../support/classNames";

describe("GhostDropHint", () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it("creates a hint element after the node element when the position is After", () => {
    const nodeElement = document.createElement("div");
    document.body.append(nodeElement);

    const node = new Node();
    new GhostDropHint(node, nodeElement, "after", defaultClassNames);

    expect(nodeElement.nextSibling).toHaveClass("tree-element-ghost");
    expect(nodeElement.previousSibling).toBeNull();
    expect(nodeElement.children).toBeEmpty();
  });

  it("creates a hint element before the node element when the position is Before", () => {
    const nodeElement = document.createElement("div");
    document.body.append(nodeElement);

    const node = new Node();
    new GhostDropHint(node, nodeElement, "before", defaultClassNames);

    expect(nodeElement.previousSibling).toHaveClass("tree-element-ghost");
    expect(nodeElement.nextSibling).toBeNull();
    expect(nodeElement.children).toBeEmpty();
  });

  it("creates a hint element before the first child when the position is Inside and the node is an open folder", () => {
    const nodeElement = document.createElement("div");
    document.body.append(nodeElement);

    const childElement = document.createElement("div");
    nodeElement.append(childElement);

    const node = new Node({ is_open: true });
    const childNode = new Node();
    childNode.element = childElement;
    node.addChild(childNode);

    new GhostDropHint(node, nodeElement, "inside", defaultClassNames);

    expect(nodeElement.previousSibling).toBeNull();
    expect(nodeElement.nextSibling).toBeNull();
    expect(nodeElement.children).toHaveLength(2);
    expect(nodeElement.children[0]).toHaveClass("tree-element-ghost");
  });

  it("creates a hint element after the node element when the position is Inside and the node is a closed folder", () => {
    const nodeElement = document.createElement("div");
    document.body.append(nodeElement);

    const node = new Node();
    node.addChild(new Node());

    new GhostDropHint(node, nodeElement, "inside", defaultClassNames);

    expect(nodeElement.nextSibling).toHaveClass("tree-element-ghost");
    expect(nodeElement.previousSibling).toBeNull();
    expect(nodeElement.children).toBeEmpty();
  });

  it("marks the hint as inside when the position is Inside and the node is a closed folder", () => {
    const nodeElement = document.createElement("div");
    document.body.append(nodeElement);

    const node = new Node();
    node.addChild(new Node());

    new GhostDropHint(node, nodeElement, "inside", defaultClassNames);

    expect(nodeElement.nextSibling).toHaveClass("tree-element-inside");
  });

  it("doesn't mark the hint as inside when the position is After", () => {
    const nodeElement = document.createElement("div");
    document.body.append(nodeElement);

    new GhostDropHint(new Node(), nodeElement, "after", defaultClassNames);

    expect(nodeElement.nextSibling).not.toHaveClass("tree-element-inside");
  });

  it("draws the hint with a circle and a line", () => {
    const nodeElement = document.createElement("div");
    document.body.append(nodeElement);

    new GhostDropHint(new Node(), nodeElement, "after", defaultClassNames);

    const ghost = nodeElement.nextSibling as HTMLElement;

    expect(ghost.children).toHaveLength(2);
    expect(ghost.children[0]).toHaveClass(
      "tree-element-common",
      "tree-element-circle",
    );
    expect(ghost.children[1]).toHaveClass(
      "tree-element-common",
      "tree-element-line",
    );
  });

  it("removes the hint", () => {
    const nodeElement = document.createElement("div");
    document.body.append(nodeElement);

    const hint = new GhostDropHint(
      new Node(),
      nodeElement,
      "after",
      defaultClassNames,
    );
    hint.remove();

    expect(nodeElement.nextSibling).toBeNull();
  });
});
