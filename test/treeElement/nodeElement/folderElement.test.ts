import { screen } from "@testing-library/dom";
import ElementsRenderer from "treeElement/elementsRenderer";
import { Node } from "treeElement/node";
import BorderDropHint from "treeElement/nodeElement/borderDropHint";
import FolderElement from "treeElement/nodeElement/folderElement";
import GhostDropHint from "treeElement/nodeElement/ghostDropHint";
import { vi } from "vitest";

import defaultClassNames from "../../support/classNames";
import { getTreeButton, getTreeListElement } from "../../support/queries";

interface CreateFolderElementParams {
    closedIconElement?: globalThis.Node;
    isOpen?: boolean;
    openedIconElement?: globalThis.Node;
}

const createFolderElement = ({
    closedIconElement,
    isOpen = false,
    openedIconElement,
}: CreateFolderElementParams = {}) => {
    const tree = new Node().loadFromData([
        { children: [{ id: 2, name: "child1" }], id: 1, name: "node1" },
    ]);

    const folderNode = tree.children[0] as Node;
    folderNode.is_open = isOpen;

    const treeElement = document.createElement("div");
    document.body.append(treeElement);

    const setNodeElement = vi.fn();

    const renderer = new ElementsRenderer({
        autoEscape: true,
        buttonLeft: false,
        classNames: defaultClassNames,
        dragAndDrop: false,
        getTree: () => tree,
        htmlElement: treeElement,
        isNodeSelected: () => false,
        setNodeElement,
        showEmptyFolder: false,
    });
    renderer.renderFromRoot();

    const triggerEvent = vi.fn();

    const folderElement = new FolderElement({
        classNames: defaultClassNames,
        closedIconElement,
        getScrollLeft: () => 0,
        node: folderNode,
        openedIconElement,
        renderChildren: renderer.renderChildren.bind(renderer),
        treeElement,
        triggerEvent,
    });

    return { folderElement, folderNode, triggerEvent };
};

describe("close", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
    });

    it("closes an open node without animation", async () => {
        const { folderElement, folderNode } = createFolderElement({
            isOpen: true,
        });
        const treeItem = screen.getByRole("treeitem", { name: "node1" });

        expect(treeItem).toBeAriaExpanded();

        await folderElement.close(false, 0);

        expect(folderNode.is_open).toBeFalse();
        expect(treeItem).not.toBeAriaExpanded();
        expect(getTreeButton(treeItem)).toHaveClass("tree-element-closed");

        const treeListElement = getTreeListElement(treeItem);

        // eslint-disable-next-line testing-library/no-node-access
        expect(treeListElement.querySelector("ul")).not.toBeVisible();

        // eslint-disable-next-line vitest/max-expects
        expect(treeItem).toHaveAttribute("aria-expanded", "false");
    });

    it("triggers the tree.close event", async () => {
        const { folderElement, folderNode, triggerEvent } = createFolderElement(
            {
                isOpen: true,
            },
        );

        await folderElement.close(false, 0);

        expect(triggerEvent).toHaveBeenCalledExactlyOnceWith("tree.close", {
            node: folderNode,
        });
    });

    it("only sets the state when the node isn't rendered", async () => {
        const { folderElement, folderNode, triggerEvent } = createFolderElement(
            {
                isOpen: true,
            },
        );
        const treeItem = screen.getByRole("treeitem", { name: "node1" });
        folderNode.element = undefined;

        await folderElement.close(false, 0);

        expect(folderNode.is_open).toBeFalse();
        expect(triggerEvent).toHaveBeenCalledExactlyOnceWith("tree.close", {
            node: folderNode,
        });
        expect(treeItem).toBeAriaExpanded();
    });

    it("does nothing when the node is already closed", async () => {
        const { folderElement, folderNode, triggerEvent } = createFolderElement(
            {
                isOpen: false,
            },
        );

        await folderElement.close(false, 0);

        expect(folderNode.is_open).toBeFalse();
        expect(triggerEvent).not.toHaveBeenCalled();
    });

    it("renders the closed icon in the button", async () => {
        const closedIconElement = document.createElement("span");
        closedIconElement.classList.add("closed-icon");

        const { folderElement } = createFolderElement({
            closedIconElement,
            isOpen: true,
        });
        await folderElement.close(false, 0);

        const treeItem = screen.getByRole("treeitem", { name: "node1" });
        const button = getTreeButton(treeItem)

        expect(button.children[0]).toHaveClass("closed-icon");
        expect(button.children[0]).not.toBe(closedIconElement);
    });

    it("closes the node with animation", async () => {
        const { folderElement } = createFolderElement({
            isOpen: true,
        });
        const treeItem = screen.getByRole("treeitem", { name: "node1" });
        // eslint-disable-next-line testing-library/no-node-access
        const ul = getTreeListElement(treeItem).querySelector(":scope > ul[role=group]") as HTMLElement;
        const animate = vi.spyOn(ul, "animate");

        const promise = folderElement.close(true, 123);

        expect(animate).toHaveBeenCalledExactlyOnceWith(expect.any(Array), {
            duration: 123,
        });
        expect(treeItem).toBeAriaExpanded();

        await promise;

        expect(treeItem).not.toBeAriaExpanded();
        expect(ul).not.toBeVisible();
    });
});

describe("open", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
    });

    it("opens a closed node without animation", async () => {
        const { folderElement, folderNode } = createFolderElement({
            isOpen: false,
        });
        const treeItem = screen.getByRole("treeitem", { name: "node1" });

        expect(treeItem).not.toBeAriaExpanded();

        await folderElement.open(false, 0);

        expect(folderNode.is_open).toBeTrue();
        expect(treeItem).toBeAriaExpanded();

        const button = getTreeButton(treeItem);

        expect(button).not.toHaveClass("tree-element-closed");

        // eslint-disable-next-line testing-library/no-node-access
        const ul = getTreeListElement(treeItem).querySelector(":scope > ul[role=group]") as HTMLElement;

        expect(ul).toBeVisible();
        // eslint-disable-next-line vitest/max-expects
        expect(treeItem).toHaveAttribute("aria-expanded", "true");
    });

    it("renders the children when the node is opened for the first time", async () => {
        const { folderElement } = createFolderElement({
            isOpen: false,
        });

        expect(screen.queryByRole("treeitem", { name: "child1" })).not.toBeInTheDocument();

        await folderElement.open(false, 0);

        expect(screen.getByRole("treeitem", { name: "child1" })).toBeVisible();
    });

    it("doesn't render the children again when the node is opened a second time", async () => {
        const { folderElement } = createFolderElement({
            isOpen: false,
        });

        await folderElement.open(false, 0);
        await folderElement.close(false, 0);
        await folderElement.open(false, 0);

        expect(screen.getAllByRole("treeitem", { name: "child1" })).toHaveLength(1);
    });

    it("only sets the state when the node isn't rendered", async () => {
        const { folderElement, folderNode, triggerEvent } = createFolderElement(
            {
                isOpen: false,
            },
        );
        folderNode.element = undefined;

        await folderElement.open(false, 0);

        expect(folderNode.is_open).toBeTrue();
        expect(triggerEvent).toHaveBeenCalledExactlyOnceWith("tree.open", {
            node: folderNode,
        });
        expect(screen.queryByRole("treeitem", { name: "child1" })).not.toBeInTheDocument();
    });

    it("triggers the tree.open event", async () => {
        const { folderElement, folderNode, triggerEvent } = createFolderElement(
            {
                isOpen: false,
            },
        );

        await folderElement.open(false, 0);

        expect(triggerEvent).toHaveBeenCalledExactlyOnceWith("tree.open", {
            node: folderNode,
        });
    });

    it("does nothing when the node is already open", async () => {
        const { folderElement, folderNode, triggerEvent } = createFolderElement(
            {
                isOpen: true,
            },
        );

        await folderElement.open(false, 0);

        expect(folderNode.is_open).toBeTrue();
        expect(triggerEvent).not.toHaveBeenCalled();
    });

    it("renders the opened icon in the button", async () => {
        const openedIconElement = document.createElement("span");
        openedIconElement.classList.add("opened-icon");

        const { folderElement } = createFolderElement({
            isOpen: false,
            openedIconElement,
        });

        await folderElement.open(false, 0);

        const treeItem = screen.getByRole("treeitem", { name: "node1" });
        const button = getTreeButton(treeItem);

        // eslint-disable-next-line testing-library/no-node-access
        expect(button.children).toHaveLength(1);
        expect(button.children[0]).toHaveClass("opened-icon");
        expect(button.children[0]).not.toBe(openedIconElement);
    });

    it("opens the node with animation", async () => {
        const { folderElement } = createFolderElement({
            isOpen: false,
        });
        const treeItem = screen.getByRole("treeitem", { name: "node1" });
        const animate = vi.spyOn(HTMLElement.prototype, "animate");

        await folderElement.open(true, 456);

        expect(animate).toHaveBeenCalledExactlyOnceWith(expect.any(Array), {
            duration: 456,
        });

        // eslint-disable-next-line testing-library/no-node-access
        const ul = getTreeListElement(treeItem).querySelector(":scope > ul[role=group]") as HTMLElement;

        expect(ul).toBeVisible();

        await ul.getAnimations()[0]?.finished;

        expect(treeItem).toBeAriaExpanded();
    });
});

describe("addDropHint", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
    });

    it("returns a border drop hint for a closed node and position inside", () => {
        const { folderElement } = createFolderElement({ isOpen: false });

        expect(folderElement.addDropHint("inside")).toBeInstanceOf(
            BorderDropHint,
        );
    });

    it("returns a ghost drop hint for an open node and position inside", () => {
        const { folderElement } = createFolderElement({ isOpen: true });

        expect(folderElement.addDropHint("inside")).toBeInstanceOf(
            GhostDropHint,
        );
    });

    it("returns a ghost drop hint for a closed node and position after", () => {
        const { folderElement } = createFolderElement({ isOpen: false });

        expect(folderElement.addDropHint("after")).toBeInstanceOf(
            GhostDropHint,
        );
    });
});
