import type { AnimationSpeed } from "./animation";
import type { TreeElementOptions } from "./options";

import { DEFAULT_CLASS_PREFIX } from "./classNames";
import { Node } from "./node";

/* The default icons are svg instead of text: the triangle characters come
 * from different fonts on each platform, so they differ in shape and size.
 * They are sized in em to follow the font size, and use currentColor to follow
 * --tree-element-toggler-color.
 */
const triangle = (points: string): string =>
  `<svg width="0.8em" height="0.8em" viewBox="0 0 10 10" focusable="false"><polygon points="${points}" fill="currentColor"/></svg>`;

export const triangleDown = triangle("0.5,0.5 9.5,0.5 5,9.5");
export const triangleLeft = triangle("9.5,0.5 9.5,9.5 0.5,5");
export const triangleRight = triangle("0.5,0.5 0.5,9.5 9.5,5");

const defaults: TreeElementOptions = {
  animationSpeed: "fast",
  autoEscape: true,
  autoOpen: false, // true / false / int (open n levels starting at 0)
  buttonLeft: true,
  classPrefix: DEFAULT_CLASS_PREFIX, // the prefix of all css classes
  // closedIcon: undefined, // the default is a triangle; see getDefaultClosedIcon
  // commonClassName: undefined, // the class of every element; the default is "<classPrefix>-common"
  // data: undefined,
  // dataFilter: undefined,
  // dataUrl: undefined,
  dragAndDrop: false,
  keyboardSupport: true,
  multiSelect: false,
  nodeClass: Node,
  // onCanMove: undefined, // Can this node be moved?
  // onCanMoveTo: undefined, // Can this node be moved to this position? function(moved_node, target_node, position)
  // onCanSelectNode: undefined,
  // onCreateLi: undefined,
  // onDragMove: undefined,
  // onDragStop: undefined,
  // onGetStateFromStorage: undefined,
  // onIsMoveHandle: undefined,
  // onSetStateFromStorage: undefined,
  // openedIcon: undefined, // the default is a triangle pointing down
  openFolderDelay: 500, // The delay for opening a folder during drag and drop; the value is in milliseconds
  // rtl: undefined, // right-to-left support; true / false (default)
  saveState: false, // true / false / string (local storage key; the default key is "tree")
  selectable: true,
  showEmptyFolder: false,
  slide: true, // must display slide animation?
  startDndDelay: 300, // The delay for starting dnd (in milliseconds)
  tabIndex: 0,
  // treeClassName: undefined, // the class of the root element; the default is classPrefix
  useContextMenu: true,
};

const setDefaultOptions = (
  htmlElement: HTMLElement,
  inputOptions: Partial<TreeElementOptions>,
): TreeElementOptions => {
  const options = {
    ...defaults,
    ...inputOptions,
    animationSpeed: inputOptions.animationSpeed ?? getDefaultAnimationSpeed(),
  };

  options.dataUrl ??= htmlElement.dataset.url;
  options.rtl ??= getRtlOptionFromHTMLElement(htmlElement);
  options.closedIcon ??= getDefaultClosedIcon(options);
  options.openedIcon ??= triangleDown;

  return options;
};

// No animation when the user asked the system for reduced motion
const getDefaultAnimationSpeed = (): AnimationSpeed =>
  prefersReducedMotion() ? 0 : defaults.animationSpeed;

const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const getDefaultClosedIcon = (options: TreeElementOptions): string => {
  return options.rtl ? triangleLeft : triangleRight;
};

const getRtlOptionFromHTMLElement = (htmlElement: HTMLElement): boolean => {
  const dataRtl = htmlElement.dataset.rtl;

  if (dataRtl == "") {
    return true;
  }
  return dataRtl === "false" ? false : Boolean(dataRtl);
};

export default setDefaultOptions;
