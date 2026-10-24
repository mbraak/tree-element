import type { Page } from "@playwright/test";

// Opens the test page and creates a tree in it. `window.treeElement` is the
// tree.

export const initPage = async (page: Page, baseURL: string | undefined) => {
  if (!baseURL) {
    throw new Error("Missing baseURL");
  }

  await page.goto(`${baseURL}/test_index.html`);
  await page.waitForLoadState("domcontentloaded");

  page.on("console", (msg) => {
    console.log(`console: ${msg.text()}`);
  });
};

interface InitTreeOptions {
  ariaLabel?: string;
  autoOpen?: number;
  dragAndDrop?: boolean;
  multiSelect?: boolean;
  onCanMove?: boolean;
  onCanMoveTo?: boolean;
  rtl?: boolean;
}

export const initTree = async (
  page: Page,
  {
    ariaLabel,
    autoOpen = 0,
    dragAndDrop = false,
    multiSelect = false,
    onCanMove,
    onCanMoveTo,
    rtl = false,
  }: InitTreeOptions,
) => {
  await page.evaluate(`
        const onCanMove = (node) => node.name !== "Herrerasaurians";

        const onCanMoveTo = (node, targetNode) => targetNode.name !== "Ornithischians";

        const htmlElement = document.getElementById("tree1");

        window.treeElement = new TreeElement({
            animationSpeed: 0,
            ariaLabel: ${JSON.stringify(ariaLabel)},
            autoOpen: ${autoOpen},
            data: ExampleData.exampleData,
            dragAndDrop: ${dragAndDrop},
            htmlElement,
            multiSelect: ${multiSelect},
            onCanMove: ${onCanMove ? "onCanMove" : "null"},
            onCanMoveTo: ${onCanMoveTo ? "onCanMoveTo" : "null"},
            openFolderDelay: 100,
            rtl: ${rtl},
            startDndDelay: 100
        });
    `);
};
