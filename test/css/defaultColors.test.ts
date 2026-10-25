import fs from "node:fs";
import path from "node:path";

// Checks the default colors in the stylesheet against the WCAG 2 contrast
// minimums: 4.5:1 for text, 3:1 for icons and other graphics.

const projectRoot = path.resolve(import.meta.dirname, "../..");
const css = fs.readFileSync(
  path.join(projectRoot, "css/tree_element.postcss"),
  "utf8",
);

// The defaults of all custom properties. The colors and the toggler size are
// in separate :where(:root) blocks.
const getDefaultColors = (): Map<string, string> => {
  const blocks = Array.from(
    css.matchAll(/:where\(:root\) \{([^}]*)\}/g),
    ([, block]) => block as string,
  );

  if (blocks.length === 0) {
    throw new Error("No :where(:root) block in the stylesheet");
  }

  return new Map(
    blocks.flatMap((block) =>
      Array.from(
        block.matchAll(/--tree-element-([\w-]+):\s*([^;]+);/g),
        ([, name, value]) => [name as string, (value as string).trim()],
      ),
    ),
  );
};

const defaultColors = getDefaultColors();

const getColor = (name: string): string => {
  const value = defaultColors.get(name);

  if (value === undefined) {
    throw new Error(`No default for --tree-element-${name}`);
  }

  return value;
};

type Rgb = [number, number, number];

const parseHex = (hex: string): Rgb => {
  const digits = hex.replace("#", "");
  const full = digits.length === 3 ? digits.replaceAll(/./g, "$&$&") : digits;

  return [0, 2, 4].map((index) =>
    Number.parseInt(full.slice(index, index + 2), 16),
  ) as Rgb;
};

const getHexColors = (value: string): Rgb[] =>
  (value.match(/#[\da-f]{3,6}\b/gi) ?? []).map((hex) => parseHex(hex));

const getLuminance = (rgb: Rgb): number => {
  const [red, green, blue] = rgb.map((channel) => {
    const value = channel / 255;

    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }) as Rgb;

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

const getContrast = (first: Rgb, second: Rgb): number => {
  const [lighter, darker] = [getLuminance(first), getLuminance(second)].sort(
    (a, b) => b - a,
  ) as [number, number];

  return (lighter + 0.05) / (darker + 0.05);
};

const white: Rgb = [255, 255, 255];

// The color of a semi-transparent color on a white page
const blendOnWhite = (color: Rgb, opacity: number): Rgb =>
  color.map((channel) => channel * opacity + 255 * (1 - opacity)) as Rgb;

// A gradient is checked at every color stop: the text crosses all of them
const selectedBackgrounds = getHexColors(getColor("selected-background"));

const backgrounds = [
  { background: white, name: "the page" },
  ...selectedBackgrounds.map((background, index) => ({
    background,
    name: `the selected row (stop ${index + 1})`,
  })),
];

describe("default colors", () => {
  it("has a color for each stop of the selected background", () => {
    expect(selectedBackgrounds.length).toBeGreaterThan(0);
  });

  describe.each(backgrounds)("on $name", ({ background }) => {
    it("has 4.5:1 for the title", () => {
      const title = parseHex(getColor("title-color"));

      expect(getContrast(title, background)).toBeGreaterThanOrEqual(4.5);
    });

    it("has 3:1 for the toggler", () => {
      for (const name of ["toggler-color", "toggler-hover-color"]) {
        const toggler = parseHex(getColor(name));

        expect(getContrast(toggler, background)).toBeGreaterThanOrEqual(3);
      }
    });

    it("has 3:1 for the drop hint", () => {
      const dropHint = parseHex(getColor("drop-hint-color"));

      expect(getContrast(dropHint, background)).toBeGreaterThanOrEqual(3);
    });
  });

  it("has 4.5:1 for the dragged node on the page", () => {
    // The dragged node has opacity 0.6, so the page shows through
    const opacity = Number(
      /span\.tree-element-dragging \{[^}]*opacity: ([\d.]+)/.exec(css)?.[1],
    );
    const color = blendOnWhite(parseHex(getColor("dragging-color")), opacity);
    const background = blendOnWhite(
      parseHex(getColor("dragging-background")),
      opacity,
    );

    expect(getContrast(color, background)).toBeGreaterThanOrEqual(4.5);
  });

  it("only uses colors that have a default", () => {
    const used = new Set(
      Array.from(
        css.matchAll(/var\(--tree-element-([\w-]+)/g),
        ([, name]) => name as string,
      ),
    );

    // The selected color falls back to the title color
    used.delete("selected-color");

    expect([...used].filter((name) => !defaultColors.has(name))).toStrictEqual(
      [],
    );
  });
});
