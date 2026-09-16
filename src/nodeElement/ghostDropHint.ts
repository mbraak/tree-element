import type { ClassNames } from "../classNames";
import type { DropHint } from "../dragAndDropHandler/types";
import type { Node, Position } from "../node";

class GhostDropHint implements DropHint {
  private classNames: ClassNames;
  private element: HTMLElement;
  private ghost: HTMLElement;
  private node: Node;

  constructor(
    node: Node,
    element: HTMLElement,
    position: Position,
    classNames: ClassNames,
  ) {
    this.classNames = classNames;
    this.element = element;
    this.node = node;
    this.ghost = this.createGhostElement();

    switch (position) {
      case "after":
        this.moveAfter();
        break;

      case "before":
        this.moveBefore();
        break;

      case "inside": {
        if (node.isFolder() && node.is_open) {
          this.moveInsideOpenFolder();
        } else {
          this.moveInside();
        }
      }
    }
  }

  public remove(): void {
    this.ghost.remove();
  }

  private createGhostElement() {
    const { circle, common, ghost: ghostClass, line } = this.classNames;

    const ghost = document.createElement("li");
    ghost.className = `${common} ${ghostClass}`;

    const circleSpan = document.createElement("span");
    circleSpan.className = `${common} ${circle}`;
    ghost.append(circleSpan);

    const lineSpan = document.createElement("span");
    lineSpan.className = `${common} ${line}`;
    ghost.append(lineSpan);

    return ghost;
  }

  private moveAfter(): void {
    this.element.after(this.ghost);
  }

  private moveBefore(): void {
    this.element.before(this.ghost);
  }

  private moveInside(): void {
    this.element.after(this.ghost);
    this.ghost.classList.add(this.classNames.inside);
  }

  private moveInsideOpenFolder(): void {
    const childElement = this.node.children[0]?.element;

    if (childElement) {
      childElement.before(this.ghost);
    }
  }
}

export default GhostDropHint;
