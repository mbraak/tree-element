import type { Page } from "@playwright/test";

import type { TreeStructure } from "../test/support/treeStructure";

interface BoundingBox {
    height: number;
    width: number;
    x: number;
    y: number;
}

export const sleep = async (page: Page, timeout: number) => {
    await page.waitForTimeout(timeout); // eslint-disable-line playwright/no-wait-for-timeout
};

export const getTreeStructure = async (page: Page) => {
    const structure = await page.evaluate<string>(`
    ;
    function getTreeNode(li) {
        if (li.classList.contains("tree-element-ghost") || li.classList.contains("tree-element-border")) {
            return null;
        }

        const span = li.querySelector(":scope > .tree-element-element > .tree-element-title");
        const name = span.innerHTML;
        const selected = li.classList.contains("tree-element-selected");

        if (li.classList.contains("tree-element-folder")) {
            const ulChildren = li.querySelectorAll(":scope > ul.tree-element-common");

            const children =
                ulChildren.length === 1
                    ? getChildren(ulChildren[0])
                    : [];

            return {
                children,
                name,
                nodeType: "folder",
                open: !li.classList.contains("tree-element-closed"),
                selected,
            };
        } else {
            return {
                name,
                nodeType: "child",
                selected,
            };
        }
    }

    function getChildren(ul) {
        return Array.from(
            ul.querySelectorAll(":scope > li.tree-element-common")
        )
            .map((li) => getTreeNode(li))
            .filter(node => node);
    }

    const treeElement = document.querySelector("ul.tree-element");

    JSON.stringify(
        window.getChildren(treeElement)
    );
`);

    return JSON.parse(structure) as TreeStructure;
};

export const getNodeRect = async (
    page: Page,
    title: string,
): Promise<BoundingBox> => {
    // The title, because the treeitem contains the children of the node
    const titleElement = page.getByText(title, { exact: true });
    const boundingBox = await titleElement.boundingBox();

    if (!boundingBox) {
        throw new Error(`Could not determine bounding box for tree element ${title}`)
    }

    return boundingBox;
};

export const moveMouseToNode = async (page: Page, title: string) => {
    const rect = await getNodeRect(page, title);

    await page.mouse.move(rect.x + 10, rect.y + rect.height / 2);
};

export const dragAndDrop = async (
    page: Page,
    fromTitle: string,
    toTitle: string,
): Promise<void> => {
    await moveMouseToNode(page, fromTitle);
    await page.mouse.down();

    await sleep(page, 200);

    await moveMouseToNode(page, toTitle);
    await page.mouse.up();
};