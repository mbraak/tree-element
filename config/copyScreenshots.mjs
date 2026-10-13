import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

// Copy the screenshots of a CI run over the playwright snapshots.
//
//   node config/copyScreenshots.mjs [zip] [platform]
//
// The platform is darwin, linux or win32; macos and windows work too. The zip
// is the screenshots artifact of a CI job: the test-results folder, with a
// folder per failed test. Playwright shortens long folder and file names with
// a hash, so the snapshot name is derived from the test name in
// error-context.md instead.
//
// A snapshot is only written when the test already has a snapshot, for this
// platform or another one. Anything else is an error and nothing is copied,
// so a wrong name never adds a stray file.

const snapshotsDir = "playwright/playwright.test.ts-snapshots";

const platformAliases = { macos: "darwin", windows: "win32" };
const platforms = ["darwin", "linux", "win32"];

const [zipPath = "screenshots.zip", platformArg = "linux"] =
  process.argv.slice(2);
const platform = platformAliases[platformArg] ?? platformArg;

if (!platforms.includes(platform)) {
  console.error(
    `Unknown platform ${platformArg}; use ${platforms.join(", ")}, macos or windows`,
  );
  process.exit(1);
}

const snapshotSuffix = `-Chromium-${platform}.png`;

// The name of a snapshot without the platform: "with-rtl-...-left-1"
const knownSnapshots = new Set(
  fs
    .readdirSync(snapshotsDir)
    .map((fileName) => /^(.+)-Chromium-\w+\.png$/.exec(fileName)?.[1])
    .filter(Boolean),
);

// "playwright.test.ts >> with rtl >> displays the tree right-to-left"
// becomes "with-rtl-displays-the-tree-right-to-left", like Playwright does
const getSnapshotBaseName = (errorContext) => {
  const match = /^- Name: (.+)$/m.exec(errorContext);

  if (!match) {
    return undefined;
  }

  const titles = match[1].split(" >> ").slice(1);

  return titles
    .join(" ")
    .replaceAll(/[^\w-]+/g, "-")
    .replaceAll(/-+/g, "-")
    .replaceAll(/^-|-$/g, "");
};

const findCopies = (resultsDir) => {
  const copies = [];
  const errors = [];

  for (const entry of fs.readdirSync(resultsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const entryPath = path.join(resultsDir, entry.name);
    const actuals = fs
      .readdirSync(entryPath)
      .filter((fileName) => fileName.endsWith("-actual.png"));

    if (actuals.length === 0) {
      continue;
    }

    const contextPath = path.join(entryPath, "error-context.md");

    if (!fs.existsSync(contextPath)) {
      errors.push(`${entry.name}: no error-context.md`);
      continue;
    }

    const baseName = getSnapshotBaseName(fs.readFileSync(contextPath, "utf8"));

    if (!baseName) {
      errors.push(`${entry.name}: no test name in error-context.md`);
      continue;
    }

    for (const actual of actuals) {
      // The number of the screenshot within the test: "...-1-actual.png"
      const index = /-(\d+)-actual\.png$/.exec(actual)?.[1];
      const snapshotName = `${baseName}-${index}`;

      if (!index || !knownSnapshots.has(snapshotName)) {
        errors.push(
          `${entry.name}/${actual}: no snapshot ${snapshotName} for any platform`,
        );
        continue;
      }

      copies.push({
        source: path.join(entryPath, actual),
        target: path.join(snapshotsDir, `${snapshotName}${snapshotSuffix}`),
      });
    }
  }

  return { copies, errors };
};

if (!fs.existsSync(zipPath)) {
  console.error(`${zipPath} does not exist`);
  process.exit(1);
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "screenshots-"));

try {
  execFileSync("unzip", ["-q", zipPath, "-d", tempDir]);

  const { copies, errors } = findCopies(tempDir);

  if (errors.length > 0) {
    console.error(errors.join("\n"));
    console.error("Nothing is copied.");
    process.exitCode = 1;
  } else if (copies.length === 0) {
    console.log(`No screenshots for ${platform} in ${zipPath}`);
  } else {
    for (const { source, target } of copies) {
      fs.copyFileSync(source, target);
      console.log(target);
    }
  }
} finally {
  fs.rmSync(tempDir, { force: true, recursive: true });
}
