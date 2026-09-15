import type { Node } from "treeElement/node";

import { mockElementBoundingClientRect } from "jsdom-testing-mocks";
import { vi } from "vitest";

interface Rect {
  height: number;
  width: number;
  x: number;
  y: number;
}

const mockLayout = (element: HTMLElement, rect: Rect) => {
  vi.spyOn(element, "clientHeight", "get").mockReturnValue(rect.height);
  vi.spyOn(element, "clientWidth", "get").mockReturnValue(rect.width);
  vi.spyOn(element, "offsetParent", "get").mockReturnValue(
    element.parentElement,
  );

  mockElementBoundingClientRect(element, rect);
};

export const generateHtmlElementsForTree = (tree: Node) => {
  let y = 0;

  const createNodeElement = (node: Node) => {
    const isTree = node.tree === node;

    if (isTree) {
      const element = document.createElement("ul");
      element.className = "tree-element";
      return element;
    } else {
      const li = document.createElement("li");

      if (node.isFolder()) {
        li.className = "tree-element-folder";

        if (!node.is_open) {
          li.classList.add("tree-element-closed");
        }
      }

      return li;
    }
  };

  function generateHtmlElementsForNode(
    node: Node,
    parentElement: HTMLElement,
    x: number,
  ) {
    const isTree = node.tree === node;
    const nodeElement = createNodeElement(node);

    parentElement.append(nodeElement);

    if (!isTree) {
      const divElement = document.createElement("div");
      divElement.className = "tree-element-element";
      nodeElement.append(divElement);

      mockLayout(nodeElement, { height: 20, width: 100 - x, x, y });
      node.element = nodeElement;
      y += 20;
    }

    if (node.hasChildren() && (node.is_open || isTree)) {
      for (const child of node.children) {
        generateHtmlElementsForNode(child, nodeElement, isTree ? x : x + 10);
      }
    }

    return nodeElement;
  }

  const treeElement = generateHtmlElementsForNode(tree, document.body, 0);
  mockLayout(treeElement, { height: y, width: 100, x: 0, y: 0 });

  return treeElement;
};
