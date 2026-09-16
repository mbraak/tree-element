import type { ClassNames } from "../classNames";

interface DragElementParams {
  autoEscape: boolean;
  classNames: ClassNames;
  nodeName: string;
  offsetX: number;
  offsetY: number;
  treeElement: HTMLElement;
}

class DragElement {
  private element: HTMLElement;
  private offsetX: number;
  private offsetY: number;

  constructor({
    autoEscape,
    classNames,
    nodeName,
    offsetX,
    offsetY,
    treeElement,
  }: DragElementParams) {
    this.offsetX = offsetX;
    this.offsetY = offsetY;

    this.element = this.createElement(nodeName, autoEscape, classNames);

    treeElement.appendChild(this.element);
  }

  public move(pageX: number, pageY: number): void {
    this.element.style.left = `${pageX - this.offsetX}px`;
    this.element.style.top = `${pageY - this.offsetY}px`;
  }

  public remove(): void {
    this.element.remove();
  }

  private createElement(
    nodeName: string,
    autoEscape: boolean,
    classNames: ClassNames,
  ) {
    const element = document.createElement("span");
    element.classList.add(classNames.title, classNames.dragging);

    if (autoEscape) {
      element.textContent = nodeName;
    } else {
      element.innerHTML = nodeName;
    }

    element.style.position = "absolute";

    return element;
  }
}

export default DragElement;
