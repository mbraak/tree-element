import BorderDropHint from "treeElement/nodeElement/borderDropHint";

import defaultClassNames from "../../support/classNames";

describe("BorderDropHint", () => {
  it("creates an element", () => {
    const element = document.createElement("div");

    const jqTreeElement = document.createElement("div");
    jqTreeElement.classList.add("tree-element-element");
    element.append(jqTreeElement);

    new BorderDropHint(element, 0, defaultClassNames);

    expect(jqTreeElement.children).toHaveLength(1);
    expect(jqTreeElement.children[0]).toHaveClass("tree-element-border");
  });

  it("doesn't create an element if the node doesn't have a tree-element-element child", () => {
    const element = document.createElement("div");

    new BorderDropHint(element, 0, defaultClassNames);

    expect(element.children).toBeEmpty();
  });
});
