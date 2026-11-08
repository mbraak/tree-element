import {
  getAnimationDuration,
  slideDown,
  slideUp,
} from "treeElement/animation";

describe("getAnimationDuration", () => {
  it("returns a number unchanged", () => {
    expect(getAnimationDuration(456)).toBe(456);
  });

  it("returns 200 for 'fast'", () => {
    expect(getAnimationDuration("fast")).toBe(200);
  });

  it("returns 600 for 'slow'", () => {
    expect(getAnimationDuration("slow")).toBe(600);
  });
});

const createElement = () => {
  const element = document.createElement("ul");
  element.style.display = "none";
  // jsdom does no layout, so scrollHeight is always 0
  Object.defineProperty(element, "scrollHeight", { value: 50 });
  document.body.append(element);
  return element;
};

describe("slideDown", () => {
  it("shows the element and resolves when the animation ends", async () => {
    // Like the stylesheet, which hides the children of a closed folder. The
    // inline display must override it; removing display: none is not enough.
    const style = document.createElement("style");
    style.textContent = "ul { display: none; }";
    document.head.append(style);
    onTestFinished(() => {
      style.remove();
    });

    const element = createElement();
    const animate = vi.spyOn(element, "animate");
    const onFinished = vi.fn();

    const promise = slideDown(element, 123).then(onFinished);

    expect(animate).toHaveBeenCalledExactlyOnceWith(
      [
        { height: "0", overflow: "hidden" },
        { height: "50px", overflow: "hidden" },
      ],
      { duration: 123 },
    );
    expect(element).toBeVisible();
    expect(onFinished).not.toHaveBeenCalled();

    await promise;

    expect(onFinished).toHaveBeenCalledExactlyOnceWith(undefined);
  });
});

describe("slideUp", () => {
  it("hides the element and resolves when the animation ends", async () => {
    const element = createElement();
    element.style.display = "block";
    const animate = vi.spyOn(element, "animate");
    const onFinished = vi.fn();

    const promise = slideUp(element, 123).then(onFinished);

    expect(animate).toHaveBeenCalledExactlyOnceWith(
      [
        { height: "50px", overflow: "hidden" },
        { height: "0", overflow: "hidden" },
      ],
      { duration: 123 },
    );
    expect(onFinished).not.toHaveBeenCalled();

    await promise;

    expect(element).not.toBeVisible();
    expect(onFinished).toHaveBeenCalledExactlyOnceWith(undefined);
  });
});
