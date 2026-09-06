import { execFileSync } from "child_process";
import fs from "fs";

// Release a new version. Usage:
//
//   pnpm release patch|minor|major|<version> [--skip-ci-check]
//
// This bumps the version in package.json (which regenerates src/version.ts),
// moves the unreleased changes in CHANGELOG.md to the new version, commits,
// tags v<version> and pushes. The Release workflow on GitHub then runs the
// checks, publishes to npm and creates the GitHub release.

const branch = "master";

const run = (command, args, options = {}) =>
  execFileSync(command, args, { encoding: "utf8", ...options }).trim();

const git = (...args) => run("git", args);

const fail = (message) => {
  console.error(`Error: ${message}`);
  process.exit(1);
};

const checkPreconditions = ({ skipCiCheck }) => {
  if (git("rev-parse", "--abbrev-ref", "HEAD") !== branch) {
    fail(`Releases are made from the ${branch} branch`);
  }

  if (git("status", "--porcelain")) {
    fail("The working tree is not clean, commit or stash your changes first");
  }

  git("fetch", "origin", branch, "--tags");

  if (git("rev-parse", "HEAD") !== git("rev-parse", `origin/${branch}`)) {
    fail(`${branch} is not in sync with origin/${branch}`);
  }

  if (skipCiCheck) {
    return;
  }

  const sha = git("rev-parse", "HEAD");
  const runs = JSON.parse(
    run("gh", [
      "run",
      "list",
      "--commit",
      sha,
      "--workflow",
      "Continuous integration",
      "--json",
      "status,conclusion,url",
      "--limit",
      "1",
    ]),
  );

  if (runs.length === 0) {
    fail(`No CI run found for ${sha}, push first or use --skip-ci-check`);
  }

  const [{ conclusion, status, url }] = runs;

  if (status !== "completed") {
    fail(`CI is still running for ${sha}: ${url}`);
  }

  if (conclusion !== "success") {
    fail(`CI did not succeed for ${sha} (${conclusion}): ${url}`);
  }
};

const readVersion = () =>
  JSON.parse(fs.readFileSync("package.json", "utf8")).version;

const restore = () => {
  git("checkout", "--", "package.json", "CHANGELOG.md", "src/version.ts");
};

const main = () => {
  const args = process.argv.slice(2);
  const skipCiCheck = args.includes("--skip-ci-check");
  const [bump] = args.filter((arg) => !arg.startsWith("--"));

  if (!bump) {
    fail("Usage: pnpm release patch|minor|major|<version> [--skip-ci-check]");
  }

  checkPreconditions({ skipCiCheck });

  const previousVersion = readVersion();
  let version;

  try {
    // The "version" script in package.json regenerates src/version.ts
    run("npm", ["version", bump, "--no-git-tag-version"], { stdio: "pipe" });
    version = readVersion();

    run("node", ["config/changelog.mjs", "release", version], {
      stdio: "inherit",
    });
  } catch (error) {
    restore();
    fail(error.message);
  }

  const tag = `v${version}`;

  git("add", "package.json", "CHANGELOG.md", "src/version.ts");
  git("commit", "--message", `Release ${tag}`);
  git("tag", "--annotate", tag, "--message", tag);

  console.log(`Committed and tagged ${tag} (was ${previousVersion})`);

  git("push", "origin", branch, tag);

  const repositoryUrl = git("remote", "get-url", "origin")
    .replace(/^git@github\.com:/, "https://github.com/")
    .replace(/\.git$/, "");

  console.log(`Pushed ${tag}. The Release workflow publishes it:`);
  console.log(`${repositoryUrl}/actions/workflows/release.yml`);
};

main();
