import RequestUrl from "treeElement/requestUrl";

describe("RequestUrl", () => {
  describe("value", () => {
    it("returns a relative url unchanged", () => {
      expect(new RequestUrl("/test").value()).toBe("/test");
    });

    it("keeps the query string of a relative url", () => {
      expect(new RequestUrl("/test?a=1&b=2").value()).toBe("/test?a=1&b=2");
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
      const requestUrl = new RequestUrl("/test");
      requestUrl.setSearchParam("key", "value");

      expect(requestUrl.value()).toBe("/test?key=value");
    });

    it("adds a search parameter to an absolute url", () => {
      const requestUrl = new RequestUrl("https://example.com/test");
      requestUrl.setSearchParam("key", "value");

      expect(requestUrl.value()).toBe("https://example.com/test?key=value");
    });

    it("overwrites an existing search parameter", () => {
      const requestUrl = new RequestUrl("/test?key=old");
      requestUrl.setSearchParam("key", "new");

      expect(requestUrl.value()).toBe("/test?key=new");
    });

    it("encodes the value", () => {
      const requestUrl = new RequestUrl("/test");
      requestUrl.setSearchParam("key", "a b&c");

      expect(requestUrl.value()).toBe("/test?key=a+b%26c");
    });
  });
});
