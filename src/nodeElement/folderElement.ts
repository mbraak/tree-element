import type { AnimationSpeed } from "../animation";
import type { TriggerEvent } from "../methodTypes";
import type { Node, Position } from "../node";
import type { NodeElementParams } from "./index";

import { slideDown, slideUp } from "../animation";
import NodeElement from "./index";

export type RenderChildren = (node: Node) => HTMLUListElement | null;

interface FolderElementParams extends NodeElementParams {
  closedIconElement?: globalThis.Node;
  openedIconElement?: globalThis.Node;
  renderChildren: RenderChildren;
  triggerEvent: TriggerEvent;
}

class FolderElement extends NodeElement {
  private closedIconElement?: globalThis.Node;
  private openedIconElement?: globalThis.Node;
  private renderChildren: RenderChildren;
  private triggerEvent: TriggerEvent;

  constructor({
    classNames,
    closedIconElement,
    getScrollLeft,
    node,
    openedIconElement,
    renderChildren,
    tabIndex,
    treeElement,
    triggerEvent,
  }: FolderElementParams) {
    super({
      classNames,
      getScrollLeft,
      node,
      tabIndex,
      treeElement,
    });

    this.closedIconElement = closedIconElement;
    this.openedIconElement = openedIconElement;
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

    if (!this.isRendered()) {
      this.triggerEvent("tree.close", { node: this.node });
      return;
    }

    const button = this.getButton();
    button.classList.add(this.classNames.closed);
    button.innerHTML = "";

    const closedIconElement = this.closedIconElement;

    if (closedIconElement) {
      const icon = closedIconElement.cloneNode(true);
      button.appendChild(icon);
    }

    const ul = this.getUl();

    if (ul) {
      if (slide) {
        await slideUp(ul, animationSpeed);
      } else {
        ul.style.display = "none";
      }
    }

    this.element.classList.add(this.classNames.closed);

    const titleSpan = this.getTitleSpan();
    titleSpan.setAttribute("aria-expanded", "false");

    this.triggerEvent("tree.close", {
      node: this.node,
    });
  }

  public async open(
    slide: boolean,
    animationSpeed: AnimationSpeed,
  ): Promise<void> {
    return new Promise((resolve) => {
      if (this.node.is_open) {
        resolve();
        return;
      }

      this.node.is_open = true;

      if (!this.isRendered()) {
        // The folder is rendered open when its parent is opened
        this.triggerEvent("tree.open", { node: this.node });
        resolve();
        return;
      }

      const button = this.getButton();
      button.classList.remove(this.classNames.closed);
      button.innerHTML = "";

      const openedIconElement = this.openedIconElement;

      if (openedIconElement) {
        const icon = openedIconElement.cloneNode(true);
        button.appendChild(icon);
      }

      const doOpen = (): void => {
        this.element.classList.remove(this.classNames.closed);

        const titleSpan = this.getTitleSpan();
        titleSpan.setAttribute("aria-expanded", "true");

        this.triggerEvent("tree.open", {
          node: this.node,
        });

        resolve();
      };

      // The children are rendered the first time the folder is opened
      const ul = this.getUl() ?? this.renderChildren(this.node);

      if (!ul) {
        doOpen();
      } else if (slide) {
        void slideDown(ul, animationSpeed).then(doOpen);
      } else {
        ul.style.display = "block";
        doOpen();
      }
    });
  }

  protected mustShowBorderDropHint(position: Position): boolean {
    return !this.node.is_open && position === "inside";
  }

  private getButton(): HTMLLinkElement {
    return this.element.querySelector(
      `:scope > .${this.classNames.element} > a.${this.classNames.toggler}`,
    ) as HTMLLinkElement;
  }
}

export default FolderElement;
