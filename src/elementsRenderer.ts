import type { ClassNames } from "./classNames";
import type { GetTree, IsNodeSelected } from "./methodTypes";
import type { Node } from "./node";
import type { IconElement, OnCreateLi } from "./options";

import { getBoolString } from "./util";

interface ElementsRendererParams {
  autoEscape: boolean;
  buttonLeft: boolean;
  classNames: ClassNames;
  closedIcon?: IconElement;
  dragAndDrop: boolean;
  getTree: GetTree;
  htmlElement: HTMLElement;
  isNodeSelected: IsNodeSelected;
  onCreateLi?: OnCreateLi;
  openedIcon?: IconElement;
  rtl?: boolean;
  setNodeElement: (element: HTMLElement, node: Node) => void;
  showEmptyFolder: boolean;
  tabIndex?: number;
}

/* Renders the tree to html.
 *
 * The children of a closed folder are not rendered. They are rendered when
 * the folder is opened, see renderChildren.
 *
 * The elements are created by cloning templates. A template is a fully
 * built <li> or <ul> with everything that is the same for every node
 * (structure, roles, static classes, the toggler icon). Per node only the
 * parts that differ are set: the title, the aria attributes and the
 * selected and loading classes.
 */
export default class ElementsRenderer {
  public closedIconElement?: HTMLElement | Text;
  public openedIconElement?: HTMLElement | Text;
  private autoEscape: boolean;
  private buttonLeft: boolean;
  private classNames: ClassNames;
  private closedFolderTemplate: HTMLLIElement;
  private dragAndDrop: boolean;
  private getTree: GetTree;
  private groupUlTemplate: HTMLUListElement;
  private htmlElement: HTMLElement;
  private isNodeSelected: IsNodeSelected;
  private nodeTemplate: HTMLLIElement;
  private onCreateLi?: OnCreateLi;
  private openedFolderTemplate: HTMLLIElement;
  private rootUlTemplate: HTMLUListElement;
  private rtl?: boolean;
  private setNodeElement: (element: HTMLElement, node: Node) => void;
  private showEmptyFolder: boolean;
  private tabIndex?: number;

  constructor({
    autoEscape,
    buttonLeft,
    classNames,
    closedIcon,
    dragAndDrop,
    getTree,
    htmlElement,
    isNodeSelected,
    onCreateLi,
    openedIcon,
    rtl,
    setNodeElement,
    showEmptyFolder,
    tabIndex,
  }: ElementsRendererParams) {
    this.autoEscape = autoEscape;
    this.buttonLeft = buttonLeft;
    this.classNames = classNames;
    this.dragAndDrop = dragAndDrop;
    this.getTree = getTree;
    this.htmlElement = htmlElement;
    this.isNodeSelected = isNodeSelected;
    this.onCreateLi = onCreateLi;
    this.rtl = rtl;
    this.setNodeElement = setNodeElement;
    this.showEmptyFolder = showEmptyFolder;
    this.tabIndex = tabIndex;
    this.openedIconElement = this.createButtonElement(openedIcon ?? "+");
    this.closedIconElement = this.createButtonElement(closedIcon ?? "-");

    this.rootUlTemplate = this.createUlTemplate(true);
    this.groupUlTemplate = this.createUlTemplate(false);
    this.nodeTemplate = this.createNodeTemplate();
    this.openedFolderTemplate = this.createFolderTemplate(true);
    this.closedFolderTemplate = this.createFolderTemplate(false);
  }

  public render(fromNode: Node | null): void {
    if (fromNode?.parent) {
      this.renderFromNode(fromNode);
    } else {
      this.renderFromRoot();
    }
  }

  /* Render the children of a rendered folder. Returns the new <ul>, or
   * null when the folder is not rendered or has no children.
   */
  public renderChildren(node: Node): HTMLUListElement | null {
    if (!node.element || !node.hasChildren()) {
      return null;
    }

    return this.createDomElements(
      node.element,
      node.children,
      false,
      node.getLevel() + 1,
    );
  }

  public renderFromNode(node: Node): void {
    if (!node.element) {
      return;
    }

    const currentLi = node.element;
    const newLi = this.createLi(node, node.getLevel());
    currentLi.replaceWith(newLi);

    if (this.mustRenderChildren(node)) {
      this.createDomElements(newLi, node.children, false, node.getLevel() + 1);
    }
  }

  public renderFromRoot(): void {
    this.htmlElement.textContent = "";

    const tree = this.getTree();

    if (tree) {
      this.createDomElements(this.htmlElement, tree.children, true, 1);
    }
  }

  private attachNodeData(node: Node, li: HTMLElement): void {
    node.element = li;
    this.setNodeElement(li, node);
  }

  private createButtonElement(
    value: IconElement,
  ): HTMLElement | Text | undefined {
    if (typeof value === "string") {
      // convert value to html
      const div = document.createElement("div");
      div.innerHTML = value;

      return document.createTextNode(div.innerHTML);
    } else if (value.nodeType) {
      return value;
    } else {
      return undefined;
    }
  }

  private createDomElements(
    element: Element,
    children: Node[],
    isRootNode: boolean,
    level: number,
  ): HTMLUListElement {
    const template = isRootNode ? this.rootUlTemplate : this.groupUlTemplate;
    const ul = template.cloneNode() as HTMLUListElement;
    element.appendChild(ul);

    for (const child of children) {
      const li = this.createLi(child, level);
      ul.appendChild(li);

      if (this.mustRenderChildren(child)) {
        this.createDomElements(li, child.children, false, level + 1);
      }
    }

    return ul;
  }

  private createFolderLi(
    node: Node,
    level: number,
    isSelected: boolean,
  ): HTMLLIElement {
    const template = node.is_open
      ? this.openedFolderTemplate
      : this.closedFolderTemplate;
    const li = template.cloneNode(true) as HTMLLIElement;

    if (isSelected) {
      li.classList.add(this.classNames.selected);
    }

    if (node.is_loading) {
      li.classList.add(this.classNames.loading);
    }

    // li > div > [button link], title span, [button link]
    const div = li.firstChild as HTMLDivElement;
    const titleSpan = div.childNodes[
      this.buttonLeft ? 1 : 0
    ] as HTMLSpanElement;

    this.fillTitleSpan(titleSpan, node.name, isSelected, level);

    return li;
  }

  /* Template for a folder <li>:
   *   li > div > [button link], title span, [button link]
   * The toggler icon and the aria-expanded attribute depend on the open
   * state, so there is a template for each.
   */
  private createFolderTemplate(isOpen: boolean): HTMLLIElement {
    const liClasses = [this.classNames.common, this.classNames.folder];

    if (!isOpen) {
      liClasses.push(this.classNames.closed);
    }

    const li = this.createLiTemplate(liClasses.join(" "));
    const div = li.firstChild as HTMLDivElement;

    // button link
    const buttonLink = document.createElement("a");
    buttonLink.className = this.getButtonClasses(isOpen);

    const iconElement = isOpen
      ? this.openedIconElement
      : this.closedIconElement;

    if (iconElement) {
      buttonLink.appendChild(iconElement.cloneNode(true));
    }

    if (this.buttonLeft) {
      div.appendChild(buttonLink);
    }

    // title span
    const titleSpan = this.createTitleSpanTemplate(true);
    titleSpan.setAttribute("aria-expanded", getBoolString(isOpen));
    div.appendChild(titleSpan);

    if (!this.buttonLeft) {
      div.appendChild(buttonLink);
    }

    return li;
  }

  /* Create the <li> element
   * Attach it to node.element.
   * Call onCreateLi
   */
  private createLi(node: Node, level: number): HTMLLIElement {
    const isSelected = this.isNodeSelected(node);

    const mustShowFolder =
      node.isFolder() || (node.isEmptyFolder && this.showEmptyFolder);

    const li = mustShowFolder
      ? this.createFolderLi(node, level, isSelected)
      : this.createNodeLi(node, level, isSelected);

    this.attachNodeData(node, li);

    if (this.onCreateLi) {
      this.onCreateLi(node, li, isSelected);
    }

    return li;
  }

  /* Create the outer part of a <li> template: li > div */
  private createLiTemplate(liClasses: string): HTMLLIElement {
    const li = document.createElement("li");
    li.className = liClasses;
    li.setAttribute("role", "none");

    const div = document.createElement("div");
    div.className = `${this.classNames.element} ${this.classNames.common}`;
    div.setAttribute("role", "none");

    li.appendChild(div);

    return li;
  }

  private createNodeLi(
    node: Node,
    level: number,
    isSelected: boolean,
  ): HTMLLIElement {
    const li = this.nodeTemplate.cloneNode(true) as HTMLLIElement;

    if (isSelected) {
      li.classList.add(this.classNames.selected);
    }

    // li > div > title span
    const div = li.firstChild as HTMLDivElement;
    const titleSpan = div.firstChild as HTMLSpanElement;

    this.fillTitleSpan(titleSpan, node.name, isSelected, level);

    return li;
  }

  /* Template for a <li> without children: li > div > title span */
  private createNodeTemplate(): HTMLLIElement {
    const li = this.createLiTemplate(this.classNames.common);
    const div = li.firstChild as HTMLDivElement;

    div.appendChild(this.createTitleSpanTemplate(false));

    return li;
  }

  private createTitleSpanTemplate(isFolder: boolean): HTMLSpanElement {
    const titleSpan = document.createElement("span");

    let classes = `${this.classNames.title} ${this.classNames.common}`;

    if (isFolder) {
      classes += ` ${this.classNames.titleFolder}`;
    }

    classes += ` ${this.buttonLeft ? this.classNames.titleButtonLeft : this.classNames.titleButtonRight}`;

    titleSpan.className = classes;
    titleSpan.setAttribute("role", "treeitem");
    titleSpan.setAttribute("aria-selected", "false");

    return titleSpan;
  }

  private createUlTemplate(isRootNode: boolean): HTMLUListElement {
    let classString;
    let role;

    if (!isRootNode) {
      classString = "";
      role = "group";
    } else {
      classString = this.classNames.tree;
      role = "tree";

      if (this.rtl) {
        classString += ` ${this.classNames.rtl}`;
      }
    }

    if (this.dragAndDrop) {
      classString += ` ${this.classNames.dnd}`;
    }

    const ul = document.createElement("ul");
    ul.className = `${this.classNames.common} ${classString}`;

    ul.setAttribute("role", role);

    return ul;
  }

  /* Set the parts of a cloned title span that differ per node */
  private fillTitleSpan(
    titleSpan: HTMLSpanElement,
    nodeName: string,
    isSelected: boolean,
    level: number,
  ): void {
    titleSpan.setAttribute("aria-label", nodeName);
    titleSpan.setAttribute("aria-level", `${level}`);

    if (isSelected) {
      titleSpan.setAttribute("aria-selected", "true");

      const tabIndex = this.tabIndex;

      if (tabIndex !== undefined) {
        titleSpan.setAttribute("tabindex", `${tabIndex}`);
      }
    }

    if (this.autoEscape) {
      titleSpan.textContent = nodeName;
    } else {
      titleSpan.innerHTML = nodeName;
    }
  }

  private getButtonClasses(isOpen: boolean): string {
    const classes = [this.classNames.toggler, this.classNames.common];

    if (!isOpen) {
      classes.push(this.classNames.closed);
    }

    if (this.buttonLeft) {
      classes.push(this.classNames.togglerLeft);
    } else {
      classes.push(this.classNames.togglerRight);
    }

    return classes.join(" ");
  }

  /* The children of a closed folder are rendered when it is opened */
  private mustRenderChildren(node: Node): boolean {
    return node.hasChildren() && node.is_open === true;
  }
}
