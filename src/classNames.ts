export interface ClassNames {
  border: string;
  circle: string;
  closed: string;
  common: string;
  dnd: string;
  dragging: string;
  element: string;
  folder: string;
  ghost: string;
  inside: string;
  line: string;
  loading: string;
  moving: string;
  rtl: string;
  selected: string;
  title: string;
  titleButtonLeft: string;
  titleButtonRight: string;
  titleFolder: string;
  toggler: string;
  togglerLeft: string;
  togglerRight: string;
  tree: string;
}

export interface ClassNamesOptions {
  classPrefix: string;
  commonClassName?: string;
  treeClassName?: string;
}

export const DEFAULT_CLASS_PREFIX = "tree-element";

/* Create the class names that the widget puts on the elements it creates.
 * They are all derived from classPrefix, except for the class of the root
 * element and the class that every element gets, which have an option of
 * their own.
 */
const createClassNames = ({
  classPrefix,
  commonClassName,
  treeClassName,
}: ClassNamesOptions): ClassNames => ({
  border: `${classPrefix}-border`,
  circle: `${classPrefix}-circle`,
  closed: `${classPrefix}-closed`,
  common: commonClassName ?? `${classPrefix}-common`,
  dnd: `${classPrefix}-dnd`,
  dragging: `${classPrefix}-dragging`,
  element: `${classPrefix}-element`,
  folder: `${classPrefix}-folder`,
  ghost: `${classPrefix}-ghost`,
  inside: `${classPrefix}-inside`,
  line: `${classPrefix}-line`,
  loading: `${classPrefix}-loading`,
  moving: `${classPrefix}-moving`,
  rtl: `${classPrefix}-rtl`,
  selected: `${classPrefix}-selected`,
  title: `${classPrefix}-title`,
  titleButtonLeft: `${classPrefix}-title-button-left`,
  titleButtonRight: `${classPrefix}-title-button-right`,
  titleFolder: `${classPrefix}-title-folder`,
  toggler: `${classPrefix}-toggler`,
  togglerLeft: `${classPrefix}-toggler-left`,
  togglerRight: `${classPrefix}-toggler-right`,
  tree: treeClassName ?? classPrefix,
});

export default createClassNames;
