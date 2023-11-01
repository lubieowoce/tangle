// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

/* eslint-disable @typescript-eslint/no-var-requires */
const { declare: declarePlugin } = require("@babel/helper-plugin-utils");
const { addNamed: addNamedImport } = require("@babel/helper-module-imports");

const crypto = require("node:crypto");
const { pathToFileURL } = require("node:url");

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

    const addRSDWImport = (path, state) => {
      return addNamedImport(
        path,
        "registerServerReference",
        "react-server-dom-webpack/server"
      );
    };

    // const addedImports = new Map();
    // const addRSDWImport = (path, state) => {
    //   const filename = getFilename(state);
    //   if (addedImports.has(filename)) {
    //     return addedImports.get(filename);
    //   }
    //   const id = addNamedImport(
    //     path,
    //     "registerServerReference",
    //     "react-server-dom-webpack/server"
    //   );
    //   addedImports.set(filename, id);
    //   return id;
    // };

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

    const getFreeVariables = (/** @type {FnPath} */ path) => {
      /** @type {Set<string>} */
      const freeVariablesSet = new Set();
      const programScope = path.scope.getProgramParent();
      path.traverse({
        Identifier(innerPath) {
          if (!innerPath.isReferencedIdentifier()) {
            return;
          }
          const { name } = innerPath.node;
          if (freeVariablesSet.has(name)) {
            // we've already determined this name to be a free var. no point in recomputing.
            return;
          }

          const binding = innerPath.scope.getBinding(name);
          if (!binding) {
            // probably a global, or an unbound variable. ignore it.
            return;
          }
          if (binding.scope === programScope) {
            // module-level declaration. no need to close over it.
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
            return;
          }

          // we've (hopefully) eliminated all the other cases, so we should treat this as a free var.
          freeVariablesSet.add(name);
        },
      });
      const freeVariables = [...freeVariablesSet];
      return freeVariables;
    };

    function extractInlineActionToTopLevel(
      /** @type {FnPath} */ path,
      /** @type {BabelState} */ state,
      { body, freeVariables }
    ) {
      const freeVarsParam = t.objectPattern(
        freeVariables.map((variable) => {
          return t.objectProperty(
            t.identifier(variable),
            t.identifier(variable)
          );
        })
      );

      const extractedFunctionExpr = t.arrowFunctionExpression(
        [freeVarsParam, ...path.node.params],
        t.blockStatement(body.body),
        true /* async */
      );

      const moduleScope = path.scope.getProgramParent();
      const extractedIdentifier =
        moduleScope.generateUidIdentifier("$$INLINE_ACTION");

      // Create a top-level declaration for the extracted function.
      const functionDeclaration = t.exportNamedDeclaration(
        t.variableDeclaration("const", [
          t.variableDeclarator(extractedIdentifier, extractedFunctionExpr),
        ])
      );

      // const filePath = getFilename(state);
      // const actionModuleId = getServerActionModuleId(filePath);
      // const registerServerReferenceId = addRSDWImport(path, state);
      // const registerStmt = t.expressionStatement(
      //   t.callExpression(registerServerReferenceId, [
      //     extractedIdentifier,
      //     t.stringLiteral(actionModuleId),
      //     t.stringLiteral(extractedIdentifier.name),
      //   ])
      // );

      // TODO: is this the best way to insert a top-level declaration...?
      moduleScope.block.body.push(functionDeclaration /* registerStmt */);
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
      return t.callExpression(t.memberExpression(id, t.identifier("bind")), [
        t.nullLiteral(),
        t.objectExpression(
          freeVariables.map((variable) => {
            // `get [variable]() { return variable }`
            return t.objectMethod(
              "get",
              t.identifier(variable),
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
      pre() {
        this.extractedActions = [];
        this.onAction = (args) => {
          onActionFound?.(args);
          this.extractedActions.push(args);
        };
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

          const freeVariables = getFreeVariables(path).filter(
            // TODO: why is `getFreeVariables` returning the function's name too?
            // TODO: if we're referencing other (named) inline actions, they'll end up in here, and do something stupid
            (name) => name !== fnId.name
          );
          const { extractedIdentifier, getReplacement } =
            extractInlineActionToTopLevel(path, state, {
              freeVariables,
              body: path.node.body,
            });

          path.replaceWith(
            t.variableDeclaration("var", [
              t.variableDeclarator(fnId, getReplacement()),
            ])
          );
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
          JSON.stringify(this.extractedActions.map((e) => e.exportedName));

        state.path.node.body.unshift(
          t.expressionStatement(t.stringLiteral(stashedData))
        );

        // state.path.addComment("leading", stashedData);
        // console.log(state.path.node);
      },
    };
  });

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

const plugin = createPlugin();
plugin.createPlugin = createPlugin;

module.exports = plugin;
// export = plugin;
// module.exports = { default: createPlugin(), createPlugin };
