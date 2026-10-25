import type { AnimationSpeed } from "../animation";
import type { FolderIcons } from "../folderOpenState";
import type { TriggerEvent } from "../methodTypes";
import type { Node, Position } from "../node";
import type { NodeElementParams } from "./index";

import { slideDown, slideUp } from "../animation";
import { setFolderLiOpenState, setTogglerOpenState } from "../folderOpenState";
import NodeElement from "./index";

export type RenderChildren = (node: Node) => HTMLUListElement | null;

interface FolderElementParams extends NodeElementParams {
  icons: FolderIcons;
  renderChildren: RenderChildren;
  triggerEvent: TriggerEvent;
}

class FolderElement extends NodeElement {
  private icons: FolderIcons;
  private renderChildren: RenderChildren;
  private triggerEvent: TriggerEvent;

  constructor({
    classNames,
    getScrollLeft,
    icons,
    multiSelect,
    node,
    renderChildren,
    tabIndex,
    treeElement,
    triggerEvent,
  }: FolderElementParams) {
    super({
      classNames,
      getScrollLeft,
      multiSelect,
      node,
      tabIndex,
      treeElement,
    });

    this.icons = icons;
    this.renderChildren = renderChildren;
    this.triggerEvent = triggerEvent;
  }

  public async close(
    slide: boolean,
    animationSpeed: AnimationSpeed,
  ): Promise<void> {
    if (!this.node.is_open) {
      return;
    }

    this.node.is_open = false;

    if (this.isRendered()) {
      this.setButtonState(false);
      await this.setUlState(this.getUl(), false, slide, animationSpeed);
      this.setElementState(false);
    }

    this.triggerEvent("tree.close", { node: this.node });
  }

  public async open(
    slide: boolean,
    animationSpeed: AnimationSpeed,
  ): Promise<void> {
    if (this.node.is_open) {
      return;
    }

    this.node.is_open = true;

    // A folder that is not rendered is rendered open when its parent is
    // opened
    if (this.isRendered()) {
      this.setButtonState(true);

      // The children are rendered the first time the folder is opened
      const ul = this.getUl() ?? this.renderChildren(this.node);
      await this.setUlState(ul, true, slide, animationSpeed);

      this.setElementState(true);
    }

    this.triggerEvent("tree.open", { node: this.node });
  }

  protected mustShowBorderDropHint(position: Position): boolean {
    return !this.node.is_open && position === "inside";
  }

  private getButton(): HTMLElement {
    return this.element.querySelector(
      `:scope > .${this.classNames.element} > .${this.classNames.toggler}`,
    ) as HTMLElement;
  }

  private setButtonState(isOpen: boolean): void {
    setTogglerOpenState(this.getButton(), isOpen, this.classNames, this.icons);
  }

  private setElementState(isOpen: boolean): void {
    setFolderLiOpenState(this.element, isOpen, this.classNames);
  }

  private async setUlState(
    ul: HTMLUListElement | null,
    isOpen: boolean,
    slide: boolean,
    animationSpeed: AnimationSpeed,
  ): Promise<void> {
    if (!ul) {
      return;
    }

    if (slide) {
      await (isOpen ? slideDown : slideUp)(ul, animationSpeed);
    } else {
      ul.style.display = isOpen ? "block" : "none";
    }
  }
}

export default FolderElement;
