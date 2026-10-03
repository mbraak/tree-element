import type { TreeElementOptions } from "treeElement/options";

import axe from "axe-core";
import TreeElement from "treeElement";

import exampleData from "../support/exampleData";

describe("accessibility", () => {
  let htmlElement: HTMLElement;
  let treeElement: TreeElement | undefined;

  const createTreeElement = (options: Partial<TreeElementOptions> = {}) => {
    treeElement = new TreeElement({ htmlElement, ...options });

    return treeElement;
  };

  const runAxe = () => {
    const rules = axe.getRules(["cat.color"]).map(({ ruleId: id }) => ({
      enabled: false,
      id,
    }));

    axe.configure({ rules });

    return axe.run();
  };

  beforeEach(() => {
    document.title = "Test title";
    document.body.replaceChildren();
    document.documentElement.setAttribute("lang", "en");

    const mainElement = document.createElement("main");
    htmlElement = document.createElement("div");
    mainElement.append(htmlElement);
    document.body.append(mainElement);
  });

  afterEach(() => {
    treeElement?.deinit();
    treeElement = undefined;

    document.body.replaceChildren();
  });

  it("has an accessible ui", async () => {
    createTreeElement({ data: exampleData });

    const results = await runAxe();

    expect(results.violations).toBeEmpty();
  });

  it("has an accessible ui with an open and selected node", async () => {
    const tree = createTreeElement({ autoOpen: true, data: exampleData });

    tree.selectNode(tree.getNodeByNameMustExist("child1"));

    const results = await runAxe();

    expect(results.violations).toBeEmpty();
  });
});
