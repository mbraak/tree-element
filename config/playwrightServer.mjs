import serve from "rollup-plugin-serve";

// Serves the test pages for Playwright. Creating the plugin starts the server.
// The bundle is built before the tests, so rollup doesn't run here: with
// rollup, the server already listens while tree_element.js is rewritten, so
// the first tests can load a partial file.
serve({
  contentBase: ["./devserver", "./"],
  port: 8080,
});
