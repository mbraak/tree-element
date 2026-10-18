import { queryHelpers } from "@testing-library/dom";

const assertSingleElement = (
  container: HTMLElement,
  elements: NodeListOf<Element>,
  name: string,
) => {
  if (!elements.length) {
    throw queryHelpers.getElementError(
      `Unable to find ${name} element`,
      container,
    );
  }
  if (elements.length > 1) {
    throw queryHelpers.getElementError(
      `Found multiple ${name} elements`,
      container,
    );
  }
};

const assertTreeItem = (treeElement: HTMLElement) => {
  if (treeElement.role != "treeitem") {
    throw new Error("Element must have role treeitem");
  }

  if (treeElement.tagName != "LI") {
    throw new Error("Must be a list element");
  }
};

const getSingleChildOfElement = (
  treeElement: HTMLElement,
  className: string,
  name: string,
) => {
  assertTreeItem(treeElement);

  // eslint-disable-next-line testing-library/no-node-access
  const elements = treeElement.querySelectorAll(
    `:scope > .tree-element-element > .${className}`,
  );
  assertSingleElement(treeElement, elements, name);
  return elements[0] as HTMLElement;
};

export const getTreeButton = (treeElement: HTMLElement) =>
  getSingleChildOfElement(treeElement, "tree-element-toggler", "tree button");

// The title of a treeitem; click it to select the node
export const getTreeTitle = (treeElement: HTMLElement) =>
  getSingleChildOfElement(treeElement, "tree-element-title", "tree title");

// The treeitem is the li
export const getTreeListElement = (treeElement: HTMLElement) => {
  assertTreeItem(treeElement);
  return treeElement;
};
