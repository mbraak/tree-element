import type TreeElement from "treeElement";

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

/*
The build renames every class member that is not public API to a `_` name,
which terser then mangles. That rename is decided per class by the babel
plugin, so a slip there would silently rename a public method and break every
caller of the library.

This checks the public API of TreeElement and Node on the debug bundle, which
is the production bundle before terser: every public member declared in the
source must be there under its own name, and nothing else may be left without
the prefix.

The debug bundle is built by `pnpm build-debug`, which `pnpm vitest` runs
first.
*/

const projectRoot = path.resolve(import.meta.dirname, "../..");

interface PublicApi {
  accessors: string[];
  methods: string[];
  properties: string[];
}

const isPublic = (node: ts.HasModifiers): boolean =>
  !(ts.getModifiers(node) ?? []).some(
    (modifier) =>
      modifier.kind === ts.SyntaxKind.PrivateKeyword ||
      modifier.kind === ts.SyntaxKind.ProtectedKeyword,
  );

const findClass = (
  sourceFile: ts.SourceFile,
  className: string,
): ts.ClassDeclaration => {
  let result: ts.ClassDeclaration | undefined;

  const visit = (node: ts.Node) => {
    if (ts.isClassDeclaration(node) && node.name?.text === className) {
      result = node;
    } else {
      ts.forEachChild(node, visit);
    }
  };

  visit(sourceFile);

  if (!result) {
    throw new Error(`Class ${className} not found in ${sourceFile.fileName}`);
  }

  return result;
};

// The public members a class declares in the source, by name.
const getPublicApi = (file: string, className: string): PublicApi => {
  const sourceFile = ts.createSourceFile(
    file,
    fs.readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const api: PublicApi = { accessors: [], methods: [], properties: [] };

  for (const member of findClass(sourceFile, className).members) {
    if (ts.isConstructorDeclaration(member)) {
      for (const parameter of member.parameters) {
        if (
          ts.isIdentifier(parameter.name) &&
          ts.isParameterPropertyDeclaration(parameter, member) &&
          isPublic(parameter)
        ) {
          api.properties.push(parameter.name.text);
        }
      }

      continue;
    }

    if (!ts.canHaveModifiers(member) || !isPublic(member)) {
      continue;
    }

    const name = member.name;

    if (!name || !ts.isIdentifier(name)) {
      continue;
    }

    if (ts.isMethodDeclaration(member)) {
      api.methods.push(name.text);
    } else if (ts.isPropertyDeclaration(member)) {
      api.properties.push(name.text);
    } else if (ts.isAccessor(member)) {
      api.accessors.push(name.text);
    }
  }

  return api;
};

const loadBundle = (): typeof TreeElement => {
  const file = path.join(projectRoot, "tree_element.debug.js");

  if (!fs.existsSync(file)) {
    throw new Error(
      "tree_element.debug.js is missing: run `pnpm build-debug` first",
    );
  }

  // The bundle is a classic script that defines the TreeElement global.
  return vm.runInThisContext(
    `${fs.readFileSync(file, "utf8")}\nTreeElement;`,
    { filename: file },
  ) as typeof TreeElement;
};

const isPrefixed = (name: string) => name.startsWith("_");

// The own names of an object that are not prefixed, so should be public API.
const getUnprefixedNames = (
  object: object,
  ignore: string[] = [],
): string[] =>
  Object.getOwnPropertyNames(object)
    .filter((name) => !isPrefixed(name) && !ignore.includes(name))
    .sort();

describe("the public API of the bundle", () => {
  const BundledTreeElement = loadBundle();
  const htmlElement = document.createElement("div");
  document.body.append(htmlElement);

  const treeElement = new BundledTreeElement({ htmlElement });
  const rootNode = treeElement.getTree();

  afterAll(() => {
    treeElement.deinit();
    htmlElement.remove();
  });

  describe.each([
    { className: "TreeElement", file: "src/index.ts", instance: treeElement },
    { className: "Node", file: "src/node.ts", instance: rootNode },
  ])("$className", ({ className, file, instance }) => {
    const api = getPublicApi(path.join(projectRoot, file), className);
    const prototype = Object.getPrototypeOf(instance) as Record<
      string,
      unknown
    >;
    const constructor = prototype.constructor as object;

    it("declares a public API in the source", () => {
      expect(api.methods).not.toBeEmpty();
    });

    it.each(api.methods)("has the method %s", (name) => {
      expect(prototype[name]).toBeFunction();
    });

    it.each(api.accessors)("has the accessor %s", (name) => {
      // An accessor descriptor has `get` and `set` where a data descriptor
      // has `value`.
      const descriptor = Object.getOwnPropertyDescriptor(prototype, name);

      expect(descriptor).toBeDefined();
      expect(descriptor).not.toHaveProperty("value");
    });

    it.each(api.properties)("has the property %s", (name) => {
      expect(instance).toHaveProperty(name);
    });

    it("has no other unprefixed members on the prototype", () => {
      const expected = [...api.methods, ...api.accessors].sort();

      expect(getUnprefixedNames(prototype, ["constructor"])).toStrictEqual(
        expected,
      );
    });

    it("has no other unprefixed properties on the instance", () => {
      const unexpected = getUnprefixedNames(instance).filter(
        (name) => !api.properties.includes(name),
      );

      expect(unexpected).toStrictEqual([]);
    });

    it("has no unprefixed static members", () => {
      expect(
        getUnprefixedNames(constructor, ["length", "name", "prototype"]),
      ).toStrictEqual([]);
    });
  });
});
