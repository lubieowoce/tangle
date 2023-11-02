// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

/* eslint-disable @typescript-eslint/no-var-requires */
const { declare: declarePlugin } = require("@babel/helper-plugin-utils");
const { addNamed: addNamedImport } = require("@babel/helper-module-imports");

const crypto = require("node:crypto");
const { pathToFileURL } = require("node:url");
const { relative: getRelativePath } = require("node:path");

// duplicated from packages/core/src/build/build.ts

const getHash = (s) =>
  crypto.createHash("sha1").update(s).digest().toString("hex");

// FIXME: this is can probably result in weird bugs --
// we're only looking at the name of the module,
// so we'll give it the same id even if the contents changed completely!
// this id should probably look at some kind of source-hash...
const getServerActionModuleId = (resource) =>
  getHash(pathToFileURL(resource).href);

/** @typedef {import('./babel-types').FnPath} FnPath */

// /** @typedef {import('@babel/core').PluginPass} BabelState */
/** @typedef {any} BabelState */

/** @typedef {{ onActionFound?: (arg: { file: string, exportedName: string }) => void }} PluginOptions */

const createPlugin = (/** @type {PluginOptions} */ { onActionFound } = {}) =>
  declarePlugin((api) => {
    api.assertVersion(7);
    const { types: t } = api;

    const getFilename = (state) => state.file.opts.filename ?? "<unnamed>";

    const hasUseServerDirective = (/** @type {FnPath} */ path) => {
      const { body } = path.node;
      if (!t.isBlockStatement(body)) {
        return false;
      }
      if (
        !(
          body.directives.length >= 1 &&
          body.directives.some((d) => d.value.value === "use server")
        )
      ) {
        return false;
      }
      return true;
    };

    function extractInlineActionToTopLevel(
      /** @type {FnPath} */ path,
      /** @type {BabelState} */ state,
      { body, freeVariables, ctx: { addRSDWImport, getActionModuleId } }
    ) {
      let extractedFunctionParams;
      if (freeVariables.length === 0) {
        // no need to add a closure object if we're not closing over anything.
        extractedFunctionParams = [...path.node.params];
      } else {
        const freeVarsParam = t.objectPattern(
          freeVariables.map((variable, i) => {
            return t.objectProperty(
              t.identifier("_" + i),
              t.identifier(variable)
            );
          })
        );
        extractedFunctionParams = [freeVarsParam, ...path.node.params];
      }

      const wrapInRegister = (expr, exportedName) => {
        const actionModuleId = getActionModuleId();
        const registerServerReferenceId = addRSDWImport(path);

        return t.callExpression(registerServerReferenceId, [
          expr,
          t.stringLiteral(actionModuleId),
          t.stringLiteral(exportedName),
        ]);
      };

      const moduleScope = path.scope.getProgramParent();
      const extractedIdentifier =
        moduleScope.generateUidIdentifier("$$INLINE_ACTION");

      const extractedFunctionExpr = wrapInRegister(
        t.arrowFunctionExpression(
          extractedFunctionParams,
          t.blockStatement(body.body),
          true /* async */
        ),
        extractedIdentifier.name
      );

      // Create a top-level declaration for the extracted function.
      const bindingKind = "const";
      const functionDeclaration = t.exportNamedDeclaration(
        t.variableDeclaration(bindingKind, [
          t.variableDeclarator(extractedIdentifier, extractedFunctionExpr),
        ])
      );

      // TODO: this is cacheable, no need to recompute
      const programBody = moduleScope.path.get("body");
      const lastImportPath = findLast(
        Array.isArray(programBody) ? programBody : [programBody],
        (stmt) => stmt.isImportDeclaration()
      );

      const [inserted] = lastImportPath.insertAfter(functionDeclaration);
      moduleScope.registerBinding(bindingKind, inserted);
      inserted.addComment(
        "leading",
        " hoisted action: " + (path.node.id?.name ?? "<anonymous>"),
        true
      );

      return {
        extractedIdentifier,
        getReplacement: () =>
          getInlineActionReplacement({
            id: extractedIdentifier,
            freeVariables,
          }),
      };
    }

    const getInlineActionReplacement = ({ id, freeVariables }) => {
      if (freeVariables.length === 0) {
        return id;
      }
      return t.callExpression(t.memberExpression(id, t.identifier("bind")), [
        t.nullLiteral(),
        t.objectExpression(
          freeVariables.map((variable, i) => {
            // `get [variable]() { return variable }`
            return t.objectMethod(
              "get",
              t.identifier("_" + i),
              [],
              t.blockStatement([t.returnStatement(t.identifier(variable))])
            );
          })
        ),
      ]);
    };

    const assertIsAsyncFn = (/** @type {FnPath} */ path) => {
      if (!path.node.async) {
        throw path.buildCodeFrameError(
          `functions marked with "use server" must be async`
        );
      }
    };

    return {
      pre(file) {
        this.extractedActions = [];
        this.onAction = (args) => {
          onActionFound?.(args);
          this.extractedActions.push(args);
        };

        /** @type {import('@babel/types').Identifier | null} */
        let cachedImport = null;
        const addRSDWImport = (path) => {
          if (cachedImport) {
            return cachedImport;
          }
          return (cachedImport = addNamedImport(
            path,
            "registerServerReference",
            "react-server-dom-webpack/server"
          ));
        };

        this.addRSDWImport = addRSDWImport;

        let cachedActionModuleId = null;
        const getActionModuleId = () => {
          if (cachedActionModuleId) {
            return cachedActionModuleId;
          }
          const filePathForId = file.opts.root
            ? // prefer relative paths, because we hash those for usage as module ids
              "/__project__/" +
              getRelativePath(file.opts.root, file.opts.filename)
            : file.opts.filename;

          return (cachedActionModuleId =
            getServerActionModuleId(filePathForId));
        };

        this.getActionModuleId = getActionModuleId;
      },
      visitor: {
        // () => {}
        ArrowFunctionExpression(path, state) {
          const { body } = path.node;
          if (!t.isBlockStatement(body)) {
            return;
          }
          if (!hasUseServerDirective(path)) {
            return;
          }
          assertIsAsyncFn(path);

          const freeVariables = getFreeVariables(path);

          const { extractedIdentifier, getReplacement } =
            extractInlineActionToTopLevel(path, state, {
              freeVariables,
              body,
              ctx: this,
            });

          path.replaceWith(getReplacement());

          this.onAction({
            exportedName: extractedIdentifier.name,
            file: getFilename(state),
          });
        },
        FunctionDeclaration(path, state) {
          if (!hasUseServerDirective(path)) {
            return;
          }
          assertIsAsyncFn(path);

          const fnId = path.node.id;
          if (!fnId) {
            throw new Error(
              "Internal error: expected FunctionDeclaration to have a name"
            );
          }

          const freeVariables = getFreeVariables(path);
          const { extractedIdentifier, getReplacement } =
            extractInlineActionToTopLevel(path, state, {
              freeVariables,
              body: path.node.body,
              ctx: this,
            });

          const tlb = getTopLevelBinding(path);
          if (tlb) {
            // we're at the top level, and we might be enclosed within a `export` decl.
            // we have to keep the export in place, because it might be used elsewhere,
            // so we can't just remove this node.
            // replace the function decl with a (hopefully) equivalent var declaration
            // `var [name] = $$INLINE_ACTION_{N}`
            // TODO: this'll almost certainly break when using default exports,
            // but tangle's build doesn't support those anyway
            const bindingKind = "var";
            const [inserted] = path.replaceWith(
              t.variableDeclaration(bindingKind, [
                t.variableDeclarator(fnId, extractedIdentifier),
              ])
            );
            tlb.scope.registerBinding(bindingKind, inserted);
          } else {
            // note: if we do this *after* adding the new declaration, the bindings get messed up
            path.remove();
            // add a declaration in the place where the function decl would be hoisted to.
            // (this avoids issues with functions defined after `return`, see `test-cases/named-after-return.jsx`)
            path.scope.push({
              id: fnId,
              init: getReplacement(),
              kind: "var",
              unique: true,
            });
          }

          this.onAction({
            exportedName: extractedIdentifier.name,
            file: getFilename(state),
          });
        },
        FunctionExpression(path, state) {
          if (!hasUseServerDirective(path)) {
            return;
          }
          assertIsAsyncFn(path);

          const { body } = path.node;
          const freeVariables = getFreeVariables(path);

          // TODO: look for usages of the name (if present), that's technically possible
          // const fnId = path.node.id;

          const { extractedIdentifier, getReplacement } =
            extractInlineActionToTopLevel(path, state, {
              freeVariables,
              body,
              ctx: this,
            });

          path.replaceWith(getReplacement());
          this.onAction({
            exportedName: extractedIdentifier.name,
            file: getFilename(state),
          });
        },
      },
      post(state) {
        if (this.extractedActions.length === 0) {
          return;
        }
        console.log("extracted actions", this.extractedActions);
        const stashedData =
          "babel-plugin-inline-actions: " +
          JSON.stringify({
            id: this.getActionModuleId(),
            names: this.extractedActions.map((e) => e.exportedName),
          });

        state.path.node.body.unshift(
          t.expressionStatement(t.stringLiteral(stashedData))
        );

        // state.path.addComment("leading", stashedData);
        // console.log(state.path.node);
      },
    };
  });

const DEBUG = false;

const getFreeVariables = (/** @type {FnPath} */ path) => {
  /** @type {Set<string>} */
  const freeVariablesSet = new Set();
  const programScope = path.scope.getProgramParent();
  path.traverse({
    Identifier(innerPath) {
      const { name } = innerPath.node;

      const log = DEBUG
        ? (...args) =>
            console.log(
              `GFV(${path.node.id?.name})`,
              name,
              ...args,
              freeVariablesSet
            )
        : undefined;

      if (!innerPath.isReferencedIdentifier()) {
        log?.("skipping - not referenced");
        return;
      }

      if (freeVariablesSet.has(name)) {
        // we've already determined this name to be a free var. no point in recomputing.
        log?.("skipping - already registered");
        return;
      }

      const binding = innerPath.scope.getBinding(name);
      if (!binding) {
        // probably a global, or an unbound variable. ignore it.
        log?.("skipping - global or unbound, skipping");
        return;
      }
      if (binding.scope === programScope) {
        // module-level declaration. no need to close over it.
        log?.("skipping - module-level binding");
        return;
      }

      if (
        // function args or a var at the top-level of its body
        binding.scope === path.scope ||
        // decls from blocks within the function
        isChildScope({
          parent: path.scope,
          child: binding.scope,
          root: programScope,
        })
      ) {
        // the binding came from within the function = it's not closed-over, so don't add it.
        log?.("skipping - declared within function");
        return;
      }

      // we've (hopefully) eliminated all the other cases, so we should treat this as a free var.
      log?.("adding");
      freeVariablesSet.add(name);
    },
  });
  const freeVariables = [...freeVariablesSet].sort();
  return freeVariables;
};

/** @typedef {import('@babel/traverse').Scope} BabelScope */
const isChildScope = (
  /** @type {{ root: BabelScope, parent: BabelScope, child: BabelScope }} */ {
    root,
    parent,
    child,
  }
) => {
  let curScope = child;
  while (curScope !== root) {
    if (curScope.parent === parent) {
      return true;
    }
    curScope = curScope.parent;
  }
  return false;
};

/** @template T
 * @param {T[]} arr
 * @param {(el: T) => boolean} pred
 * @returns {number | undefined}
 */
const findLastIndex = (arr, pred) => {
  for (let i = arr.length - 1; i >= 0; i--) {
    const el = arr[i];
    if (pred(el)) {
      return i;
    }
  }
  return undefined;
};

/** @template T
 * @param {T[]} arr
 * @param {(el: T) => boolean} pred
 * @returns {T | undefined}
 */
const findLast = (arr, pred) => {
  const index = findLastIndex(arr, pred);
  if (index === undefined) {
    return undefined;
  }
  return arr[index];
};

const findImmediatelyEnclosingDeclaration = (/** @type {FnPath} */ path) => {
  /** @type {import('@babel/core').NodePath} */
  let currentPath = path;
  while (!currentPath.isProgram()) {
    if (
      // const foo = async () => { ... }
      //       ^^^^^^^^^^^^^^^^^^^^^^^^^
      currentPath.isVariableDeclarator() ||
      // async function foo() { ... }
      // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      currentPath.isDeclaration()
    ) {
      return currentPath;
    }
    // if we encounter an expression on the way, this isn't a top level decl, and needs to be hoisted.
    // e.g. `export const foo = withAuth(async () => { ... })`
    if (currentPath !== path && currentPath.isExpression()) {
      return null;
    }

    currentPath = currentPath.parentPath;
  }
  return null;
};

const getTopLevelBinding = (/** @type {FnPath} */ path) => {
  const decl = findImmediatelyEnclosingDeclaration(path);
  if (!decl) {
    return null;
  }

  // console.log("id", decl.node.id.name);
  const declBinding = decl.scope.getBinding(decl.node.id.name);
  const isTopLevel = declBinding.scope === path.scope.getProgramParent();

  // console.log("enclosing declaration", decl.type, decl.parent.type, {
  //   isTopLevel,
  //   // declBinding: declBinding.scope,
  // });
  return isTopLevel ? declBinding : null;
};

const plugin = createPlugin();
plugin.createPlugin = createPlugin;

module.exports = plugin;
// export = plugin;
// module.exports = { default: createPlugin(), createPlugin };
