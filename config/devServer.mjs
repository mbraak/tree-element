import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

// Serves the devserver and test pages on http://localhost:8080. A file is
// looked up in devserver first, then in the root. `pnpm devserver` starts it
// from the rollup config; Playwright runs this file directly.

const PORT = 8080;

const ROOTS = [path.resolve("devserver"), path.resolve(".")];

const CONTENT_TYPES = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
  ".map": "application/json",
};

const readFromRoots = async (urlPath) => {
  for (const root of ROOTS) {
    const filePath = path.join(root, urlPath);

    // Don't allow path traversal
    if (!filePath.startsWith(root + path.sep)) {
      continue;
    }

    try {
      return { content: await readFile(filePath), filePath };
    } catch {
      // Try the next root
    }
  }

  return null;
};

export const startServer = () => {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    const urlPath = decodeURIComponent(url.pathname);
    const file = await readFromRoots(
      urlPath.endsWith("/") ? `${urlPath}index.html` : urlPath,
    );

    if (!file) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    const contentType =
      CONTENT_TYPES[path.extname(file.filePath)] ?? "application/octet-stream";

    response.writeHead(200, { "Content-Type": contentType });
    response.end(file.content);
  });

  server.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
  });
};

if (import.meta.main) {
  startServer();
}
