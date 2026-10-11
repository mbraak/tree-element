// Url of a request. A relative url is resolved against the page, like a link
// or `fetch` would, so it also works when the page is in a subdirectory.

class RequestUrl {
  private url: URL;

  constructor(inputUrl: string) {
    this.url = new URL(inputUrl, document.baseURI);
  }

  setSearchParam(key: string, value: string) {
    this.url.searchParams.set(key, value);
  }

  value() {
    return this.url.href;
  }
}

export default RequestUrl;
