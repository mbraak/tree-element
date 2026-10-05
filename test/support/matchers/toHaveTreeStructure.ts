import type { MatcherState } from "vitest";

import type { TreeStructure } from "../treeStructure";

import treeStructure from "../treeStructure";

export function toHaveTreeStructure(
  this: MatcherState,
  element: HTMLElement,
  expectedStructure: TreeStructure,
) {
  const receivedStructure = treeStructure(element);

  /* istanbul ignore next @preserve */
  return {
    message: () =>
      this.utils.printDiffOrStringify(expectedStructure, receivedStructure) ??
      "",
    pass: this.equals(receivedStructure, expectedStructure),
  };
}
