import type { ClassNames } from "../classNames";
import type { DropHint } from "../dragAndDropHandler/types";
import type { GetScrollLeft } from "../methodTypes";
import type { Node, Position } from "../node";

import BorderDropHint from "./borderDropHint";
import GhostDropHint from "./ghostDropHint";

export interface NodeElementParams {
  classNames: ClassNames;
  getScrollLeft: GetScrollLeft;
  node: Node;
  tabIndex?: number;
  treeElement: HTMLElement;
}

class NodeElement {
  public element: HTMLElement;
  public node: Node;
  protected classNames: ClassNames;
  private getScrollLeft: GetScrollLeft;
  private tabIndex?: number;
  private treeElement: HTMLElement;

  constructor({
    classNames,
    getScrollLeft,
    node,
    tabIndex,
    treeElement,
  }: NodeElementParams) {
    this.classNames = classNames;
    this.getScrollLeft = getScrollLeft;
    this.node = node;
    this.tabIndex = tabIndex;
    this.treeElement = treeElement;

    // The root node has no element of its own; it uses the tree element.
    this.element = node.element ?? this.treeElement;
  }

  public addDropHint(position: Position): DropHint {
    return this.mustShowBorderDropHint(position)
      ? new BorderDropHint(this.element, this.getScrollLeft(), this.classNames)
      : new GhostDropHint(this.node, this.element, position, this.classNames);
  }

  public deselect(): void {
    if (!this.isRendered()) {
      return;
    }

    this.element.classList.remove(this.classNames.selected);

    // Check for null or undefined
    if (this.tabIndex != null) {
      this.element.setAttribute("tabindex", "-1");
    }

    this.element.setAttribute("aria-selected", "false");

    this.element.blur();
  }

  public select(mustSetFocus: boolean): void {
    if (!this.isRendered()) {
      return;
    }

    this.element.classList.add(this.classNames.selected);

    const tabIndex = this.tabIndex;

    // Check for null or undefined
    if (tabIndex != null) {
      this.element.setAttribute("tabindex", tabIndex.toString());
    }

    this.element.setAttribute("aria-selected", "true");

    if (mustSetFocus) {
      this.element.focus();
    }
  }

  protected getUl(): HTMLUListElement | null {
    return this.element.querySelector(":scope > ul");
  }

  /* A node inside a closed folder is not rendered. Its selected and open
   * state is applied when it is rendered.
   */
  protected isRendered(): boolean {
    return Boolean(this.node.element);
  }

  protected mustShowBorderDropHint(position: Position): boolean {
    return position === "inside";
  }
}

export default NodeElement;
