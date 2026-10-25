import type { ClassNames } from "./classNames";

import { getBoolString } from "./util";

export interface FolderIcons {
  closed?: globalThis.Node;
  opened?: globalThis.Node;
}

/* The open state of a folder is shown on the toggler and on the <li>.
 * These are used both when a folder is rendered and when it is opened or
 * closed, so a rendered folder looks the same as a toggled one.
 */

export const setTogglerOpenState = (
  toggler: HTMLElement,
  isOpen: boolean,
  classNames: ClassNames,
  icons: FolderIcons,
): void => {
  toggler.classList.toggle(classNames.closed, !isOpen);
  toggler.replaceChildren();

  const iconElement = isOpen ? icons.opened : icons.closed;

  if (iconElement) {
    toggler.append(iconElement.cloneNode(true));
  }
};

export const setFolderLiOpenState = (
  li: HTMLElement,
  isOpen: boolean,
  classNames: ClassNames,
): void => {
  li.classList.toggle(classNames.closed, !isOpen);
  li.setAttribute("aria-expanded", getBoolString(isOpen));
};
