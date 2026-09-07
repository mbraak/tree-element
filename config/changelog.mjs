import fs from "fs";

// Helpers for CHANGELOG.md, which follows Keep a Changelog. Two commands:
//
//   node config/changelog.mjs release <version> [date]
//     Move the "Unreleased" section under a "<version> - <date>" heading and
//     leave an empty "Unreleased" heading above it. Used by config/release.mjs.
//
//   node config/changelog.mjs notes <version>
//     Print the section of <version>, without its heading. Used by the release
//     workflow for the notes of the GitHub release.

const changelogFile = "CHANGELOG.md";

const isHeading = (line) => line.startsWith("## ");

const headingVersion = (line) => line.slice(3).trim().split(/\s+/)[0];

const readSections = () => {
  const lines = fs.readFileSync(changelogFile, "utf8").split("\n");
  const sections = [];
  let preamble = [];
  let current;

  for (const line of lines) {
    if (isHeading(line)) {
      current = { heading: line, lines: [] };
      sections.push(current);
    } else if (current) {
      current.lines.push(line);
    } else {
      preamble.push(line);
    }
  }

  return { preamble, sections };
};

const trimBlankLines = (lines) => {
  const result = [...lines];

  while (result.length && result[0].trim() === "") {
    result.shift();
  }

  while (result.length && result[result.length - 1].trim() === "") {
    result.pop();
  }

  return result;
};

const findSection = (sections, version) =>
  sections.find((section) => headingVersion(section.heading) === version);

const release = (version, date = new Date().toISOString().slice(0, 10)) => {
  if (!version) {
    throw new Error("Usage: changelog.mjs release <version> [date]");
  }

  const { preamble, sections } = readSections();
  const unreleased = findSection(sections, "Unreleased");

  if (!unreleased) {
    throw new Error(`No "## Unreleased" section in ${changelogFile}`);
  }

  if (trimBlankLines(unreleased.lines).length === 0) {
    throw new Error(`The "Unreleased" section of ${changelogFile} is empty`);
  }

  if (findSection(sections, version)) {
    throw new Error(`${changelogFile} already has a section for ${version}`);
  }

  const output = [
    ...preamble,
    "## Unreleased",
    "",
    `## ${version} - ${date}`,
    ...unreleased.lines,
    ...sections
      .filter((section) => section !== unreleased)
      .flatMap((section) => [section.heading, ...section.lines]),
  ];

  fs.writeFileSync(changelogFile, output.join("\n"));
  console.log(`Moved the unreleased changes in ${changelogFile} to ${version}`);
};

const notes = (version) => {
  if (!version) {
    throw new Error("Usage: changelog.mjs notes <version>");
  }

  const { sections } = readSections();
  const section = findSection(sections, version);

  if (!section) {
    throw new Error(`No section for ${version} in ${changelogFile}`);
  }

  console.log(trimBlankLines(section.lines).join("\n"));
};

const commands = { notes, release };
const [command, ...args] = process.argv.slice(2);

if (!(command in commands)) {
  console.error(
    "Usage: changelog.mjs release <version> [date] | notes <version>",
  );
  process.exit(1);
}

commands[command](...args);
