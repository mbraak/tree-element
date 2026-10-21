import type { Page } from "@playwright/test";

import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { initCoverage, saveCoverage } from "./coverage";
import { initPage, initTree } from "./treePage";

// Accessibility in a real browser: axe checks the rendered tree, including the
// color contrast that jsdom can't compute, and the keyboard tests only use the
// keyboard.

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const getAxeViolations = async (page: Page) => {
  const results = await new AxeBuilder({ page })
    .include("#tree1")
    .withTags(WCAG_TAGS)
    // A treeitem is named by its title with aria-label. Its visible text
    // also contains the titles of its children, which this rule doesn't allow.
    // The visible label, the title, is in the name, so WCAG 2.5.3 is met.
    .disableRules(["label-content-name-mismatch"])
    .analyze();

  // Only the parts that help to find the problem
  return results.violations.map(({ id, nodes }) => ({
    id,
    targets: nodes.map(({ target }) => target.join(" ")),
  }));
};

const getTreeItem = (page: Page, name: string) =>
  page.getByRole("treeitem", { exact: true, name });

test.beforeEach(async ({ baseURL, context, page }) => {
  await initCoverage(context);
  await initPage(page, baseURL);
});

test.afterEach(async ({ context }) => {
  await saveCoverage(context);
});

test.describe("axe", () => {
  test("has no violations", async ({ page }) => {
    await initTree(page, { ariaLabel: "Dinosaurs" });

    expect(await getAxeViolations(page)).toEqual([]);
  });

  test("has no violations with a selected and focused node", async ({
    page,
  }) => {
    await initTree(page, { ariaLabel: "Dinosaurs" });

    await getTreeItem(page, "Theropods").click();
    await page.keyboard.press("ArrowDown");

    await expect(getTreeItem(page, "Sauropodomorphs")).toBeFocused();
    expect(await getAxeViolations(page)).toEqual([]);
  });

  test("has no violations with all folders open", async ({ page }) => {
    await initTree(page, { ariaLabel: "Dinosaurs", autoOpen: 3 });

    expect(await getAxeViolations(page)).toEqual([]);
  });

  test("has no violations right-to-left", async ({ page }) => {
    await initTree(page, { ariaLabel: "Dinosaurs", rtl: true });

    expect(await getAxeViolations(page)).toEqual([]);
  });

  test("has no violations with drag and drop", async ({ page }) => {
    await initTree(page, { ariaLabel: "Dinosaurs", dragAndDrop: true });

    expect(await getAxeViolations(page)).toEqual([]);
  });
});

// The accessibility tree that the browser gives to screen readers. The
// children of a treeitem are in a group inside the treeitem, and a treeitem is
// named by its title only. `/children: equal` makes the match exact, so a
// missing group shows that the children of a closed folder are hidden.
test.describe("accessibility tree", () => {
  test.beforeEach(async ({ page }) => {
    await initTree(page, { ariaLabel: "Dinosaurs" });
  });

  test("exposes the nodes as a nested tree", async ({ page }) => {
    await expect(page.getByRole("tree", { name: "Dinosaurs" }))
      .toMatchAriaSnapshot(`
      - tree "Dinosaurs":
        - /children: equal
        - treeitem "Saurischia" [expanded] [level=1]:
          - text: Saurischia
          - group:
            - treeitem "Herrerasaurians" [level=2]
            - treeitem "Theropods" [level=2]
            - treeitem "Sauropodomorphs" [level=2]
        - treeitem "Ornithischians" [expanded] [level=1]:
          - text: Ornithischians
          - group:
            - treeitem "Heterodontosaurids" [level=2]
            - treeitem "Thyreophorans" [level=2]
            - treeitem "Ornithopods" [level=2]
            - treeitem "Pachycephalosaurians" [level=2]
            - treeitem "Ceratopsians" [level=2]
    `);
  });

  test("exposes a selected and opened node", async ({ page }) => {
    await page.getByText("Theropods", { exact: true }).click();
    await page.keyboard.press("ArrowRight");

    await expect(getTreeItem(page, "Theropods")).toMatchAriaSnapshot(`
      - treeitem "Theropods" [expanded] [level=2] [selected]:
        - /children: equal
        - text: Theropods
        - group:
          - treeitem "Coelophysoids" [level=3]
          - treeitem "Ceratosaurians" [level=3]
          - treeitem "Spinosauroids" [level=3]
          - treeitem "Carnosaurians" [level=3]
          - treeitem "Coelurosaurians" [level=3]
    `);
  });

  test("hides the children of a closed folder", async ({ page }) => {
    await page.getByText("Saurischia", { exact: true }).click();
    await page.keyboard.press("ArrowLeft");

    // Wait until the group has slid up. During the animation the group is
    // still in the accessibility tree.
    await expect(
      getTreeItem(page, "Saurischia").getByRole("group", {
        includeHidden: true,
      }),
    ).toBeHidden();

    await expect(page.getByRole("tree", { name: "Dinosaurs" }))
      .toMatchAriaSnapshot(`
      - tree "Dinosaurs":
        - /children: equal
        - treeitem "Saurischia" [level=1] [selected]
        - treeitem "Ornithischians" [expanded] [level=1]:
          - text: Ornithischians
          - group:
            - treeitem "Heterodontosaurids" [level=2]
            - treeitem "Thyreophorans" [level=2]
            - treeitem "Ornithopods" [level=2]
            - treeitem "Pachycephalosaurians" [level=2]
            - treeitem "Ceratopsians" [level=2]
    `);
  });
});

// Buttons before and after the tree, to tab from and to
const addButtons = async (page: Page) => {
  await page.evaluate(`
    const tree = document.getElementById("tree1");
    const before = document.createElement("button");
    before.textContent = "Before";
    const after = document.createElement("button");
    after.textContent = "After";

    tree.before(before);
    tree.after(after);
  `);
};

const getSelectedNames = (page: Page) =>
  page.evaluate<string[]>(`
    treeElement.getSelectedNodes().map((node) => node.name)
  `);

test.describe("keyboard", () => {
  test.beforeEach(async ({ page }) => {
    await initTree(page, { ariaLabel: "Dinosaurs" });
    await addButtons(page);
  });

  test("tabs into the tree on the first node when nothing is selected", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Before" }).focus();
    await page.keyboard.press("Tab");

    await expect(getTreeItem(page, "Saurischia")).toBeFocused();
    expect(await getSelectedNames(page)).toEqual([]);
  });

  test("tabs into the tree on the selected node", async ({ page }) => {
    await page.evaluate(`
      treeElement.selectNode(treeElement.getNodeByName("Theropods"), {
        mustSetFocus: false,
      });
    `);

    await page.getByRole("button", { name: "Before" }).focus();
    await page.keyboard.press("Tab");

    await expect(getTreeItem(page, "Theropods")).toBeFocused();
  });

  test("is a single tab stop", async ({ page }) => {
    await page.getByRole("button", { name: "Before" }).focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");

    await expect(page.getByRole("button", { name: "After" })).toBeFocused();

    await page.keyboard.press("Shift+Tab");

    await expect(getTreeItem(page, "Saurischia")).toBeFocused();
  });

  test("shows a focus outline for the keyboard", async ({ page }) => {
    await page.getByRole("button", { name: "Before" }).focus();
    await page.keyboard.press("Tab");

    const treeItem = getTreeItem(page, "Saurischia");

    await expect(treeItem).toBeFocused();
    expect(
      await treeItem.evaluate((element) => element.matches(":focus-visible")),
    ).toBe(true);
    // The outline is around the title, not around the treeitem with its
    // children
    await expect(treeItem).toHaveCSS("outline-style", "none");
    await expect(page.getByText("Saurischia", { exact: true })).not.toHaveCSS(
      "outline-style",
      "none",
    );
  });

  test("selects the first node with space", async ({ page }) => {
    await page.getByRole("button", { name: "Before" }).focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press(" ");

    await expect(getTreeItem(page, "Saurischia")).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("moves down and up through the visible nodes", async ({ page }) => {
    await page.getByRole("button", { name: "Before" }).focus();
    await page.keyboard.press("Tab");

    // The first key selects the focused node
    await page.keyboard.press("ArrowDown");
    expect(await getSelectedNames(page)).toEqual(["Saurischia"]);

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");

    const theropods = getTreeItem(page, "Theropods");

    await expect(theropods).toBeFocused();
    await expect(theropods).toHaveAttribute("aria-selected", "true");
    expect(await getSelectedNames(page)).toEqual(["Theropods"]);

    await page.keyboard.press("ArrowUp");

    await expect(getTreeItem(page, "Herrerasaurians")).toBeFocused();
    expect(await getSelectedNames(page)).toEqual(["Herrerasaurians"]);
  });

  test("opens, enters, leaves and closes a folder with the arrow keys", async ({
    page,
  }) => {
    await getTreeItem(page, "Theropods").click();

    const theropods = getTreeItem(page, "Theropods");

    await expect(theropods).toHaveAttribute("aria-expanded", "false");

    // Right opens a closed folder
    await page.keyboard.press("ArrowRight");
    await expect(theropods).toHaveAttribute("aria-expanded", "true");
    await expect(theropods).toBeFocused();

    // Right on an open folder moves to its first child
    await page.keyboard.press("ArrowRight");
    await expect(getTreeItem(page, "Coelophysoids")).toBeFocused();

    // Left on a child moves to its parent
    await page.keyboard.press("ArrowLeft");
    await expect(theropods).toBeFocused();

    // Left on an open folder closes it
    await page.keyboard.press("ArrowLeft");
    await expect(theropods).toHaveAttribute("aria-expanded", "false");
    await expect(theropods).toBeFocused();
  });

  test("moves to the first and the last visible node with Home and End", async ({
    page,
  }) => {
    await getTreeItem(page, "Theropods").click();

    await page.keyboard.press("End");

    await expect(getTreeItem(page, "Ceratopsians")).toBeFocused();
    expect(await getSelectedNames(page)).toEqual(["Ceratopsians"]);

    await page.keyboard.press("Home");

    await expect(getTreeItem(page, "Saurischia")).toBeFocused();
    expect(await getSelectedNames(page)).toEqual(["Saurischia"]);
  });

  test("activates the selected node with Enter", async ({ page }) => {
    await page.evaluate(`
      window.activated = [];
      document.getElementById("tree1").addEventListener("tree.activate", (e) => {
        window.activated.push(e.detail.node.name);
      });
    `);

    await getTreeItem(page, "Theropods").click();
    await page.keyboard.press("Enter");

    expect(await page.evaluate<string[]>("window.activated")).toEqual([
      "Theropods",
    ]);
    // Enter doesn't open the folder
    await expect(getTreeItem(page, "Theropods")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  test("leaves the keys alone in a form field", async ({ page }) => {
    await getTreeItem(page, "Theropods").click();

    // Record which keys reach the window with their default action intact
    await page.evaluate(`
      const input = document.createElement("input");
      input.setAttribute("aria-label", "Name");
      document.body.append(input);

      window.keys = [];

      window.addEventListener("keydown", (e) => {
        if (!e.defaultPrevented) {
          window.keys.push(e.key);
        }
      });
    `);

    await page.getByRole("textbox", { name: "Name" }).focus();

    for (const key of ["Home", "End", "ArrowDown", "ArrowUp", "Enter"]) {
      await page.keyboard.press(key);
    }

    expect(await page.evaluate<string[]>("window.keys")).toEqual([
      "Home",
      "End",
      "ArrowDown",
      "ArrowUp",
      "Enter",
    ]);
    expect(await getSelectedNames(page)).toEqual(["Theropods"]);
  });
});

test.describe("multiSelect", () => {
  test.beforeEach(async ({ page }) => {
    await initTree(page, { ariaLabel: "Dinosaurs", multiSelect: true });
    await addButtons(page);
  });

  test("has no violations with selected nodes and a focused node", async ({
    page,
  }) => {
    await page.getByText("Saurischia", { exact: true }).click();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press(" ");
    await page.keyboard.press("ArrowDown");

    await expect(getTreeItem(page, "Theropods")).toBeFocused();
    expect(await getSelectedNames(page)).toEqual([
      "Saurischia",
      "Herrerasaurians",
    ]);
    expect(await getAxeViolations(page)).toEqual([]);
  });

  test("exposes the tree as multiselectable", async ({ page }) => {
    await page.getByText("Saurischia", { exact: true }).click();

    await expect(page.getByRole("tree", { name: "Dinosaurs" })).toHaveAttribute(
      "aria-multiselectable",
      "true",
    );
    await expect(getTreeItem(page, "Saurischia")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(getTreeItem(page, "Ornithischians")).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  test("moves the focus with the keys and toggles with space", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Before" }).focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press(" ");
    await page.keyboard.press("End");
    await page.keyboard.press(" ");
    await page.keyboard.press("Home");

    await expect(getTreeItem(page, "Saurischia")).toBeFocused();
    expect(await getSelectedNames(page)).toEqual([
      "Saurischia",
      "Ceratopsians",
    ]);

    await page.keyboard.press(" ");

    expect(await getSelectedNames(page)).toEqual(["Ceratopsians"]);
  });

  test("is a single tab stop on the focused node", async ({ page }) => {
    await page.getByRole("button", { name: "Before" }).focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press(" ");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press(" ");
    await page.keyboard.press("Tab");

    await expect(page.getByRole("button", { name: "After" })).toBeFocused();

    await page.keyboard.press("Shift+Tab");

    await expect(getTreeItem(page, "Herrerasaurians")).toBeFocused();
  });

  test("shows a focus outline on a node that is not selected", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Before" }).focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press(" ");
    await page.keyboard.press("ArrowDown");

    const treeItem = getTreeItem(page, "Herrerasaurians");

    await expect(treeItem).toBeFocused();
    await expect(treeItem).toHaveAttribute("aria-selected", "false");
    await expect(
      page.getByText("Herrerasaurians", { exact: true }),
    ).not.toHaveCSS("outline-style", "none");
  });
});
