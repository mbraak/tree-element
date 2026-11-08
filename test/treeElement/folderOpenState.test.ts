import { setTogglerOpenState } from "treeElement/folderOpenState";

import defaultClassNames from "../support/classNames";

const createIcon = (text: string) => {
  const icon = document.createElement("span");
  icon.textContent = text;
  return icon;
};

describe("setTogglerOpenState", () => {
  const icons = { closed: createIcon("closed"), opened: createIcon("opened") };

  it("replaces the icon when the folder is opened", () => {
    const toggler = document.createElement("a");
    setTogglerOpenState(toggler, false, defaultClassNames, icons);

    setTogglerOpenState(toggler, true, defaultClassNames, icons);

    expect(toggler).toHaveTextContent(/^opened$/);
    expect(toggler).not.toHaveClass("tree-element-closed");
  });

  it("replaces the icon when the folder is closed", () => {
    const toggler = document.createElement("a");
    setTogglerOpenState(toggler, true, defaultClassNames, icons);

    setTogglerOpenState(toggler, false, defaultClassNames, icons);

    expect(toggler).toHaveTextContent(/^closed$/);
    expect(toggler).toHaveClass("tree-element-closed");
  });

  it("removes the icon when there is no icon for the new state", () => {
    const toggler = document.createElement("a");
    setTogglerOpenState(toggler, false, defaultClassNames, icons);

    setTogglerOpenState(toggler, true, defaultClassNames, {
      closed: icons.closed,
    });

    expect(toggler).toBeEmptyDOMElement();
  });
});
