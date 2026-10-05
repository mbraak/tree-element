import DragElement from "treeElement/dragAndDropHandler/dragElement";

import defaultClassNames from "../../support/classNames";

describe("DragElement", () => {
  it("creates an element with autoEscape is true", () => {
    const treeElement = document.createElement("div");

    new DragElement({
      autoEscape: true,
      classNames: defaultClassNames,
      nodeName: "abc &amp; def",
      offsetX: 0,
      offsetY: 0,
      treeElement,
    });

    expect(treeElement.children).toHaveLength(1);

    const childElement = treeElement.children[0];

    expect(childElement).toHaveClass("tree-element-title");
    expect(childElement).toHaveClass("tree-element-dragging");
    expect(childElement).toHaveTextContent("abc &amp; def");
  });

  it("creates an element with autoEscape is false", () => {
    const treeElement = document.createElement("div");

    new DragElement({
      autoEscape: false,
      classNames: defaultClassNames,
      nodeName: "abc &amp; def",
      offsetX: 0,
      offsetY: 0,
      treeElement,
    });

    expect(treeElement.children).toHaveLength(1);

    const childElement = treeElement.children[0];

    expect(childElement).toHaveTextContent("abc & def");
  });
});
