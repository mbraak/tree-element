import BorderDropHint from "treeElement/nodeElement/borderDropHint";

import defaultClassNames from "../../support/classNames";

// jsdom does no layout, so offsetWidth and clientHeight are always 0
const createNodeElement = ({ clientHeight = 0, offsetWidth = 0 } = {}) => {
  const element = document.createElement("div");
  Object.defineProperties(element, {
    clientHeight: { value: clientHeight },
    offsetWidth: { value: offsetWidth },
  });

  const elementDiv = document.createElement("div");
  elementDiv.classList.add("tree-element-element");
  element.append(elementDiv);

  // jsdom only computes styles for elements that are attached to the document
  document.body.append(element);

  return { element, elementDiv };
};

describe("BorderDropHint", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("creates an element", () => {
    const { element, elementDiv } = createNodeElement();

    new BorderDropHint(element, 0, defaultClassNames);

    expect(elementDiv.children).toHaveLength(1);
    expect(elementDiv.children[0]).toHaveClass("tree-element-border");
  });

  it("sizes the border to the node, 4px smaller for the border itself, and wider by the horizontal scroll", () => {
    const { element, elementDiv } = createNodeElement({
      clientHeight: 30,
      offsetWidth: 100,
    });

    new BorderDropHint(element, 10, defaultClassNames);

    expect(elementDiv.children[0]).toHaveStyle({
      height: "26px",
      width: "106px",
    });
  });

  it("doesn't make the size negative for a node smaller than the border", () => {
    const { element, elementDiv } = createNodeElement({
      clientHeight: 2,
      offsetWidth: 3,
    });

    new BorderDropHint(element, 0, defaultClassNames);

    expect(elementDiv.children[0]).toHaveStyle({ height: "0px", width: "0px" });
  });

  it("removes the element", () => {
    const { element, elementDiv } = createNodeElement();

    const hint = new BorderDropHint(element, 0, defaultClassNames);
    hint.remove();

    expect(elementDiv.children).toBeEmpty();
  });

  it("doesn't create an element if the node doesn't have a tree-element-element child", () => {
    const element = document.createElement("div");

    const hint = new BorderDropHint(element, 0, defaultClassNames);

    expect(element.children).toBeEmpty();
    expect(() => {
      hint.remove();
    }).not.toThrow();
  });
});
