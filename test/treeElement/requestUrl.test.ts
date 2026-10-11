import RequestUrl from "treeElement/requestUrl";

const setBase = (href: string) => {
  const base = document.createElement("base");
  base.href = href;
  document.head.append(base);
};

describe("RequestUrl", () => {
  afterEach(() => {
    document.head.querySelectorAll("base").forEach((base) => {
      base.remove();
    });
  });

  describe("value", () => {
    it("resolves a path against the origin of the page", () => {
      setBase("https://example.com/site/page.html");

      expect(new RequestUrl("/test").value()).toBe("https://example.com/test");
    });

    it("resolves a relative url against the page", () => {
      setBase("https://example.com/site/page.html");

      expect(new RequestUrl("api/nodes.json").value()).toBe(
        "https://example.com/site/api/nodes.json",
      );
      expect(new RequestUrl("./api/nodes.json").value()).toBe(
        "https://example.com/site/api/nodes.json",
      );
      expect(new RequestUrl("../api/nodes.json").value()).toBe(
        "https://example.com/api/nodes.json",
      );
    });

    it("keeps the query string of a relative url", () => {
      setBase("https://example.com/");

      expect(new RequestUrl("/test?a=1&b=2").value()).toBe(
        "https://example.com/test?a=1&b=2",
      );
    });

    it("returns an absolute url unchanged", () => {
      expect(new RequestUrl("https://example.com/test").value()).toBe(
        "https://example.com/test",
      );
    });

    it("keeps the query string of an absolute url", () => {
      expect(new RequestUrl("https://example.com/test?a=1").value()).toBe(
        "https://example.com/test?a=1",
      );
    });
  });

  describe("setSearchParam", () => {
    it("adds a search parameter to a relative url", () => {
      setBase("https://example.com/site/");

      const requestUrl = new RequestUrl("tree.json");
      requestUrl.setSearchParam("key", "value");

      expect(requestUrl.value()).toBe(
        "https://example.com/site/tree.json?key=value",
      );
    });

    it("adds a search parameter to an absolute url", () => {
      const requestUrl = new RequestUrl("https://example.com/test");
      requestUrl.setSearchParam("key", "value");

      expect(requestUrl.value()).toBe("https://example.com/test?key=value");
    });

    it("overwrites an existing search parameter", () => {
      const requestUrl = new RequestUrl("https://example.com/test?key=old");
      requestUrl.setSearchParam("key", "new");

      expect(requestUrl.value()).toBe("https://example.com/test?key=new");
    });

    it("encodes the value", () => {
      const requestUrl = new RequestUrl("https://example.com/test");
      requestUrl.setSearchParam("key", "a b&c");

      expect(requestUrl.value()).toBe("https://example.com/test?key=a+b%26c");
    });
  });
});
