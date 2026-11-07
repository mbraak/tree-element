import { Node } from "treeElement/node";
import setDefaultOptions, {
  triangleDown,
  triangleLeft,
  triangleRight,
} from "treeElement/setDefaultOptions";

describe("setDefaultOptions", () => {
  describe("defaults", () => {
    it("applies the default options", () => {
      const element = document.createElement("div");

      const options = setDefaultOptions(element, {});

      expect(options).toMatchObject({
        autoEscape: true,
        autoOpen: false,
        buttonLeft: true,
        dragAndDrop: false,
        keyboardSupport: true,
        multiSelect: false,
        nodeClass: Node,
        openedIcon: triangleDown,
        openFolderDelay: 500,
        saveState: false,
        selectable: true,
        showEmptyFolder: false,
        slide: true,
        startDndDelay: 300,
        tabIndex: 0,
        useContextMenu: true,
      });
    });

    it("keeps options that are set in the input options", () => {
      const element = document.createElement("div");

      const options = setDefaultOptions(element, {
        autoEscape: false,
        dragAndDrop: true,
      });

      expect(options).toMatchObject({
        autoEscape: false,
        dragAndDrop: true,
      });
    });
  });

  describe("rtl", () => {
    it("sets rtl to false when there is no data-rtl attribute", () => {
      const element = document.createElement("div");

      const options = setDefaultOptions(element, {});

      expect(options.rtl).toBeFalse();
    });

    it("sets rtl to true when the element has a data-rtl attribute", () => {
      const element = document.createElement("div");
      element.dataset.rtl = "true";

      const options = setDefaultOptions(element, {});

      expect(options.rtl).toBeTrue();
    });

    it("keeps rtl when it is set in the options", () => {
      const element = document.createElement("div");
      element.dataset.rtl = "true";

      const options = setDefaultOptions(element, { rtl: false });

      expect(options.rtl).toBeFalse();
    });
  });

  describe("animationSpeed", () => {
    const stubReducedMotion = (matches: boolean) => {
      const matchMedia = vi.fn((query: string) => ({
        matches: matches && query === "(prefers-reduced-motion: reduce)",
      }));
      vi.stubGlobal("matchMedia", matchMedia);
    };

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("sets animationSpeed to fast by default", () => {
      stubReducedMotion(false);
      const element = document.createElement("div");

      const options = setDefaultOptions(element, {});

      expect(options.animationSpeed).toBe("fast");
    });

    it("sets animationSpeed to 0 when the user prefers reduced motion", () => {
      stubReducedMotion(true);
      const element = document.createElement("div");

      const options = setDefaultOptions(element, {});

      expect(options.animationSpeed).toBe(0);
    });

    it("keeps animationSpeed when it is set in the options", () => {
      stubReducedMotion(true);
      const element = document.createElement("div");

      const options = setDefaultOptions(element, { animationSpeed: "slow" });

      expect(options.animationSpeed).toBe("slow");
    });

    it("sets animationSpeed to fast when matchMedia is not available", () => {
      vi.stubGlobal("matchMedia", undefined);
      const element = document.createElement("div");

      const options = setDefaultOptions(element, {});

      expect(options.animationSpeed).toBe("fast");
    });
  });

  describe("the default icons", () => {
    const getPoints = (icon: string) => {
      const template = document.createElement("template");
      template.innerHTML = icon;

      return template.content.querySelector("polygon")?.getAttribute("points");
    };

    it.each([
      {
        direction: "down",
        icon: triangleDown,
        points: "0.5,0.5 9.5,0.5 5,9.5",
      },
      {
        direction: "left",
        icon: triangleLeft,
        points: "9.5,0.5 9.5,9.5 0.5,5",
      },
      {
        direction: "right",
        icon: triangleRight,
        points: "0.5,0.5 0.5,9.5 9.5,5",
      },
    ])("draws a triangle pointing $direction", ({ icon, points }) => {
      expect(getPoints(icon)).toBe(points);
    });
  });

  describe("closedIcon", () => {
    it("sets closedIcon to a triangle to the right when rtl is false", () => {
      const element = document.createElement("div");

      const options = setDefaultOptions(element, {});

      expect(options.closedIcon).toBe(triangleRight);
    });

    it("sets closedIcon to a triangle to the left when rtl is true", () => {
      const element = document.createElement("div");

      const options = setDefaultOptions(element, { rtl: true });

      expect(options.closedIcon).toBe(triangleLeft);
    });

    it("keeps closedIcon when it is set in the options", () => {
      const element = document.createElement("div");

      const options = setDefaultOptions(element, {
        closedIcon: "closed",
      });

      expect(options.closedIcon).toBe("closed");
    });
  });
});
