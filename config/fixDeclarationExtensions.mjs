import fs from "node:fs";
import path from "node:path";

// Typescript emits relative imports in declaration files exactly as they are
// written in the source: without a file extension. That is fine for bundlers,
// but consumers on "moduleResolution": "node16" / "nodenext" need an explicit
// extension. Without it they silently fall back to "any" when skipLibCheck is
// on, so rewrite "./node" to "./node.js" (and "./nodeElement" to
// "./nodeElement/index.js") after the declarations are emitted.

const libDirectory = "lib";

const findDeclarationFiles = (directory) =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return findDeclarationFiles(entryPath);
    }

    return entry.name.endsWith(".d.ts") ? [entryPath] : [];
  });

const resolveSpecifier = (declarationFile, specifier) => {
  const target = path.resolve(path.dirname(declarationFile), specifier);

  if (fs.existsSync(`${target}.d.ts`)) {
    return `${specifier}.js`;
  }

  return fs.existsSync(path.join(target, "index.d.ts"))
    ? `${specifier}/index.js`
    : undefined;
};

const fixDeclarationFile = (declarationFile) => {
  const source = fs.readFileSync(declarationFile, "utf8");
  const unresolved = [];

  // Matches the module specifier of import/export ... from "..." statements.
  const fixed = source.replaceAll(
    /(\bfrom\s+")(\.[^"]*)(")/g,
    (match, before, specifier, after) => {
      if (path.extname(specifier)) {
        return match;
      }

      const resolved = resolveSpecifier(declarationFile, specifier);

      if (!resolved) {
        unresolved.push(specifier);
        return match;
      }

      return `${before}${resolved}${after}`;
    },
  );

  if (unresolved.length > 0) {
    throw new Error(
      `Cannot resolve ${unresolved.join(", ")} in ${declarationFile}`,
    );
  }

  if (fixed !== source) {
    fs.writeFileSync(declarationFile, fixed);
  }
};

for (const declarationFile of findDeclarationFiles(libDirectory)) {
  fixDeclarationFile(declarationFile);
}
