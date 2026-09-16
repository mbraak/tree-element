// Two source-level rewrites that terser does not do itself:
//
// - `const` becomes `let`. The keywords behave the same at runtime, since
//   TypeScript already rejects reassignment of a `const`, and `let` is two
//   characters shorter.
// - Class fields without an initializer are removed. Babel 8 emits
//   `private foo: Bar;` as a bare `foo;` field, which only defines the
//   property as undefined. Fields in the classes listed in `excludeClasses`
//   are kept unless they are private or protected, because a public field
//   shows up in `Object.keys` and `for ... in`, which `Node.getData` relies on.
export default function minifySyntax(_api, { excludeClasses = [] } = {}) {
  return {
    name: "minify-syntax",
    visitor: {
      ClassProperty(path) {
        const { node } = path;

        if (node.value || node.static) {
          return;
        }

        const isPrivate =
          node.accessibility === "private" ||
          node.accessibility === "protected";
        const className = path.parentPath.parentPath.node.id?.name;

        if (isPrivate || !excludeClasses.includes(className)) {
          path.remove();
        }
      },
      VariableDeclaration(path) {
        if (path.node.kind === "const") {
          path.node.kind = "let";
        }
      },
    },
  };
}
