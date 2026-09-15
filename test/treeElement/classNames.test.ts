import createClassNames, { DEFAULT_CLASS_PREFIX } from "treeElement/classNames";

describe("createClassNames", () => {
  it("derives the class names from the prefix", () => {
    const classNames = createClassNames({
      classPrefix: DEFAULT_CLASS_PREFIX,
    });

    expect(classNames).toStrictEqual({
      border: "tree-element-border",
      circle: "tree-element-circle",
      closed: "tree-element-closed",
      common: "tree-element-common",
      dnd: "tree-element-dnd",
      dragging: "tree-element-dragging",
      element: "tree-element-element",
      folder: "tree-element-folder",
      ghost: "tree-element-ghost",
      inside: "tree-element-inside",
      line: "tree-element-line",
      loading: "tree-element-loading",
      moving: "tree-element-moving",
      rtl: "tree-element-rtl",
      selected: "tree-element-selected",
      title: "tree-element-title",
      titleButtonLeft: "tree-element-title-button-left",
      titleButtonRight: "tree-element-title-button-right",
      titleFolder: "tree-element-title-folder",
      toggler: "tree-element-toggler",
      togglerLeft: "tree-element-toggler-left",
      togglerRight: "tree-element-toggler-right",
      tree: "tree-element",
    });
  });

  it("uses a custom prefix", () => {
    const classNames = createClassNames({ classPrefix: "my-tree" });

    expect(classNames).toContainEntries([
      ["common", "my-tree-common"],
      ["element", "my-tree-element"],
      ["titleButtonLeft", "my-tree-title-button-left"],
      ["tree", "my-tree"],
    ]);
  });

  it("overrides the common and the tree class name", () => {
    const classNames = createClassNames({
      classPrefix: "my-tree",
      commonClassName: "my-common",
      treeClassName: "my-root",
    });

    expect(classNames).toContainEntries([
      ["common", "my-common"],
      ["element", "my-tree-element"],
      ["tree", "my-root"],
    ]);
  });
});
