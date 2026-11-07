import type { HitArea } from "treeElement/dragAndDropHandler/types";
import type { Position } from "treeElement/node";

import {
  generateHitAreasForGroup,
  generateHitAreasFromPositions,
  generateHitPositions,
} from "treeElement/dragAndDropHandler/generateHitAreas";
import { Node } from "treeElement/node";

const mockHtmlElement = (y: number, clientHeight = 20) =>
  ({
    clientHeight,
    getBoundingClientRect: () => ({
      x: 10,
      y,
    }),
    offsetParent: {},
  }) as HTMLElement;

describe("generateHitAreasForGroup", () => {
  it("doesn't add a hit area with zero hit positions", () => {
    const hitAreas: HitArea[] = [];
    generateHitAreasForGroup(hitAreas, [], 0, 0);

    expect(hitAreas).toBeEmpty();
  });

  it("adds a hit area with one hit position", () => {
    const node = new Node(null);
    const hitPosition = {
      node,
      position: "inside" as Position,
      top: 0,
    };

    const hitAreas: HitArea[] = [];
    generateHitAreasForGroup(hitAreas, [hitPosition], 40, 100);

    expect(hitAreas).toStrictEqual([
      expect.objectContaining({
        bottom: 100,
        node,
        position: "inside",
        top: 40,
      }),
    ]);
  });

  it("doesn't add a hit area when the position is none", () => {
    const node = new Node(null);
    const hitPosition = {
      node,
      position: null,
      top: 0,
    };

    const hitAreas: HitArea[] = [];
    generateHitAreasForGroup(hitAreas, [hitPosition], 0, 100);

    expect(hitAreas).toBeEmpty();
  });

  it("adds two hit areas with two hit positions", () => {
    const node = new Node(null);
    const hitPositions = [
      {
        node,
        position: "before" as Position,
        top: 0,
      },
      {
        node,
        position: "inside" as Position,
        top: 0,
      },
    ];

    const hitAreas: HitArea[] = [];
    generateHitAreasForGroup(hitAreas, hitPositions, 40, 100);

    expect(hitAreas).toStrictEqual([
      expect.objectContaining({
        bottom: 70,
        node,
        position: "before",
        top: 40,
      }),
      expect.objectContaining({
        bottom: 100,
        node,
        position: "inside",
        top: 70,
      }),
    ]);
  });
});

describe("generateHitAreasFromPositions", () => {
  it("returns an empty array with no hit positions", () => {
    expect(generateHitAreasFromPositions([], 100)).toBeEmpty();
  });

  it("returns a hit area with one hit position", () => {
    const node = new Node(null);
    const hitPosition = {
      node,
      position: "inside" as Position,
      top: 100,
    };

    expect(generateHitAreasFromPositions([hitPosition], 140)).toStrictEqual([
      expect.objectContaining({
        bottom: 140,
        node,
        position: "inside",
        top: 100,
      }),
    ]);
  });

  it("returns two hit areas with two hit positions with the same top", () => {
    const node = new Node(null);
    const hitPositions = [
      {
        node,
        position: "before" as Position,
        top: 100,
      },
      {
        node,
        position: "inside" as Position,
        top: 100,
      },
    ];

    expect(generateHitAreasFromPositions(hitPositions, 140)).toStrictEqual([
      expect.objectContaining({
        bottom: 120,
        node,
        position: "before",
        top: 100,
      }),
      expect.objectContaining({
        bottom: 140,
        node,
        position: "inside",
        top: 120,
      }),
    ]);
  });

  it("returns two hit areas with two hit positions with a different top", () => {
    const node1 = new Node(null);
    const node2 = new Node(null);
    const hitPositions = [
      {
        node: node1,
        position: "inside" as Position,
        top: 100,
      },
      {
        node: node2,
        position: "after" as Position,
        top: 125,
      },
    ];

    expect(generateHitAreasFromPositions(hitPositions, 140)).toStrictEqual([
      expect.objectContaining({
        bottom: 125,
        node: node1,
        position: "inside",
        top: 100,
      }),
      expect.objectContaining({
        bottom: 140,
        node: node2,
        position: "after",
        top: 125,
      }),
    ]);
  });
});

describe("generatePositions", () => {
  it("doesn't generate hit positions with an empty tree", () => {
    const tree = new Node(null);

    expect(generateHitPositions(tree, tree)).toBeEmpty();
  });

  it("generates hit positions when the tree has two nodes and the first node is the current node", () => {
    const tree = new Node().loadFromData([
      { id: 1, name: "node1" },
      { id: 2, name: "node2" },
    ]);

    const node1 = tree.children[0] as Node;
    const node2 = tree.children[1] as Node;

    node1.element = mockHtmlElement(100);
    node2.element = mockHtmlElement(120);

    expect(generateHitPositions(tree, node1)).toStrictEqual([
      expect.objectContaining({
        node: node1,
        position: null,
        top: 100,
      }),
      expect.objectContaining({
        node: node1,
        position: null,
        top: 100,
      }),
      expect.objectContaining({
        node: node2,
        position: "inside",
        top: 120,
      }),
      expect.objectContaining({
        node: node2,
        position: "after",
        top: 120,
      }),
    ]);
  });

  it("generates hit positions when the tree has a node and an open folder node and the first node is the current node", () => {
    const tree = new Node().loadFromData([
      { id: 1, name: "node1" },
      { children: [{ id: 3, name: "child1" }], id: 2, name: "node2" },
    ]);

    const node1 = tree.children[0] as Node;
    const node2 = tree.children[1] as Node;
    const child1 = node2.children[0] as Node;

    node1.element = mockHtmlElement(100);
    node2.element = mockHtmlElement(120);
    node2.is_open = true;

    child1.element = mockHtmlElement(140);

    expect(generateHitPositions(tree, node1)).toStrictEqual([
      expect.objectContaining({
        node: node1,
        position: null,
        top: 100,
      }),
      expect.objectContaining({
        node: node1,
        position: null,
        top: 100,
      }),
      expect.objectContaining({
        node: node2,
        position: "inside",
        top: 120,
      }),
      expect.objectContaining({
        node: child1,
        position: "inside",
        top: 140,
      }),
      expect.objectContaining({
        node: child1,
        position: "after",
        top: 140,
      }),
      expect.objectContaining({
        node: node2,
        position: "after",
        top: 140,
      }),
    ]);
  });

  it("generates hit positions when the tree has a node and an open folder node and the folder node is the current node", () => {
    const tree = new Node().loadFromData([
      { id: 1, name: "node1" },
      { children: [{ id: 3, name: "child1" }], id: 2, name: "node2" },
    ]);

    const node1 = tree.children[0] as Node;
    const node2 = tree.children[1] as Node;
    const child1 = node2.children[0] as Node;

    node1.element = mockHtmlElement(100);
    node2.element = mockHtmlElement(120);
    node2.is_open = true;

    child1.element = mockHtmlElement(140);

    expect(generateHitPositions(tree, node2)).toStrictEqual([
      expect.objectContaining({
        node: node1,
        position: "before",
        top: 100,
      }),
      expect.objectContaining({
        node: node1,
        position: "inside",
        top: 100,
      }),
      expect.objectContaining({
        node: node1,
        position: null,
        top: 100,
      }),
      expect.objectContaining({
        node: node2,
        position: null,
        top: 120,
      }),
      expect.objectContaining({
        node: node2,
        position: null,
        top: 135,
      }),
    ]);
  });

  it("doesn't allow a drop after an open folder that is followed by the current node", () => {
    const tree = new Node().loadFromData([
      { children: [{ id: 2, name: "child1" }], id: 1, name: "folder" },
      { id: 3, name: "node2" },
    ]);
    const folder = tree.children[0] as Node;
    const child1 = folder.children[0] as Node;
    const node2 = tree.children[1] as Node;

    folder.element = mockHtmlElement(100);
    folder.is_open = true;
    child1.element = mockHtmlElement(120);
    node2.element = mockHtmlElement(140);

    expect(generateHitPositions(tree, node2)).toStrictEqual([
      { node: folder, position: "before", top: 100 },
      { node: folder, position: "inside", top: 100 },
      { node: child1, position: "inside", top: 120 },
      { node: child1, position: "after", top: 120 },
      { node: folder, position: null, top: 120 },
      { node: node2, position: null, top: 140 },
      { node: node2, position: null, top: 140 },
    ]);
  });

  it("doesn't allow a drop inside or after a closed folder that is the current node", () => {
    const tree = new Node().loadFromData([
      { id: 1, name: "node1" },
      { children: [{ id: 3, name: "child1" }], id: 2, name: "folder" },
    ]);
    const node1 = tree.children[0] as Node;
    const folder = tree.children[1] as Node;

    node1.element = mockHtmlElement(100);
    folder.element = mockHtmlElement(120);

    expect(generateHitPositions(tree, folder)).toStrictEqual([
      { node: node1, position: "before", top: 100 },
      { node: node1, position: "inside", top: 100 },
      { node: node1, position: null, top: 100 },
      { node: folder, position: null, top: 120 },
    ]);
  });

  it("doesn't allow a drop after a closed folder that is followed by the current node", () => {
    const tree = new Node().loadFromData([
      { children: [{ id: 2, name: "child1" }], id: 1, name: "folder" },
      { id: 3, name: "node2" },
    ]);
    const folder = tree.children[0] as Node;
    const node2 = tree.children[1] as Node;

    folder.element = mockHtmlElement(100);
    node2.element = mockHtmlElement(120);

    expect(generateHitPositions(tree, node2)).toStrictEqual([
      { node: folder, position: "before", top: 100 },
      { node: folder, position: "inside", top: 100 },
      { node: node2, position: null, top: 120 },
      { node: node2, position: null, top: 120 },
    ]);
  });

  it("adds no position for the bottom of an open folder that is the current node when it is 5px high or less", () => {
    const tree = new Node().loadFromData([
      { children: [{ id: 2, name: "child1" }], id: 1, name: "folder" },
    ]);
    const folder = tree.children[0] as Node;

    folder.element = mockHtmlElement(100, 5);
    folder.is_open = true;

    expect(generateHitPositions(tree, folder)).toStrictEqual([
      { node: folder, position: null, top: 100 },
    ]);
  });

  it("doesn't allow a drop inside an open folder when its first child is the current node", () => {
    const tree = new Node().loadFromData([
      {
        children: [
          { id: 2, name: "child1" },
          { id: 3, name: "child2" },
        ],
        id: 1,
        name: "folder",
      },
    ]);
    const folder = tree.children[0] as Node;
    const child1 = folder.children[0] as Node;
    const child2 = folder.children[1] as Node;

    folder.element = mockHtmlElement(100);
    folder.is_open = true;
    child1.element = mockHtmlElement(120);
    child2.element = mockHtmlElement(140);

    expect(generateHitPositions(tree, child1)).toStrictEqual([
      { node: folder, position: "before", top: 100 },
      { node: child1, position: null, top: 120 },
      { node: child1, position: null, top: 120 },
      { node: child2, position: "inside", top: 140 },
      { node: child2, position: "after", top: 140 },
      { node: folder, position: "after", top: 140 },
    ]);
  });
});
