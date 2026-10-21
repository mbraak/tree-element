import {
  getTreeButton,
  getTreeListElement,
  getTreeTitle,
} from "./support/queries";

// Create the html for a tree node:
//
//   <li role="treeitem">
//     <div class="tree-element-element">
//       <span class="tree-element-title"></span>
//     </div>
//   </li>
const createNode = () => {
  const treeElement = document.createElement("li");
  treeElement.setAttribute("role", "treeitem");

  const nodeElement = document.createElement("div");
  nodeElement.className = "tree-element-element";
  treeElement.append(nodeElement);

  const title = document.createElement("span");
  title.className = "tree-element-title";
  nodeElement.append(title);

  return { nodeElement, title, treeElement };
};

const createTogglerElement = () => {
  const toggler = document.createElement("a");
  toggler.className = "tree-element-toggler";
  return toggler;
};

describe("getTreeButton", () => {
  it("returns the toggler element", () => {
    const { nodeElement, treeElement } = createNode();
    const toggler = createTogglerElement();
    nodeElement.append(toggler);

    expect(getTreeButton(treeElement)).toBe(toggler);
  });

  it("only returns a toggler element of the tree element itself", () => {
    const { nodeElement, treeElement } = createNode();
    const toggler = createTogglerElement();
    nodeElement.append(toggler);

    // A nested toggler (e.g. in a child node) should be ignored.
    const child = createNode();
    child.nodeElement.append(createTogglerElement());
    treeElement.append(child.treeElement);

    expect(getTreeButton(treeElement)).toBe(toggler);
  });

  it("throws when the element doesn't have role treeitem", () => {
    const { nodeElement, treeElement } = createNode();
    nodeElement.append(createTogglerElement());
    treeElement.removeAttribute("role");

    expect(() => getTreeButton(treeElement)).toThrow(
      "Element must have role treeitem",
    );
  });

  it("throws when the toggler element is missing", () => {
    const { treeElement } = createNode();

    expect(() => getTreeButton(treeElement)).toThrow(
      "Unable to find tree button element",
    );
  });

  it("throws when there are multiple toggler elements", () => {
    const { nodeElement, treeElement } = createNode();

    for (let i = 0; i < 2; i++) {
      nodeElement.append(createTogglerElement());
    }

    expect(() => getTreeButton(treeElement)).toThrow(
      "Found multiple tree button elements",
    );
  });
});

describe("getTreeTitle", () => {
  it("returns the title element", () => {
    const { title, treeElement } = createNode();

    expect(getTreeTitle(treeElement)).toBe(title);
  });

  it("throws when the title element is missing", () => {
    const { title, treeElement } = createNode();
    title.remove();

    expect(() => getTreeTitle(treeElement)).toThrow(
      "Unable to find tree title element",
    );
  });
});

describe("getTreeListElement", () => {
  it("returns the tree element, which is the list element", () => {
    const { treeElement } = createNode();

    expect(getTreeListElement(treeElement)).toBe(treeElement);
  });

  it("throws when the element doesn't have role treeitem", () => {
    const { treeElement } = createNode();
    treeElement.removeAttribute("role");

    expect(() => getTreeListElement(treeElement)).toThrow(
      "Element must have role treeitem",
    );
  });

  it("throws when the element isn't a list element", () => {
    const div = document.createElement("div");
    div.setAttribute("role", "treeitem");

    expect(() => getTreeListElement(div)).toThrow("Must be a list element");
  });
});
