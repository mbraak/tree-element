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
  document.body.append(element);
  return element;
};

describe("slideDown", () => {
  it("shows the element and resolves when the animation ends", async () => {
    const element = createElement();
    const animate = vi.spyOn(element, "animate");
    const onFinished = vi.fn();

    const promise = slideDown(element, 123).then(onFinished);

    expect(animate).toHaveBeenCalledExactlyOnceWith(expect.any(Array), {
      duration: 123,
    });
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

    expect(animate).toHaveBeenCalledExactlyOnceWith(expect.any(Array), {
      duration: 123,
    });
    expect(onFinished).not.toHaveBeenCalled();

    await promise;

    expect(element).not.toBeVisible();
    expect(onFinished).toHaveBeenCalledExactlyOnceWith(undefined);
  });
});
