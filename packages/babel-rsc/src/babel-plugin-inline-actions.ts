// eslint-disable-next-line @typescript-eslint/ban-ts-comment

import type { NodePath, PluginObj, PluginPass } from "@babel/core";
import type * as t from "@babel/types";
import type { Scope as BabelScope } from "@babel/traverse";

import type { BabelAPI } from "@babel/helper-plugin-utils";
import { addNamed as addNamedImport } from "@babel/helper-module-imports";

import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { relative as getRelativePath } from "node:path";

type FnPath =
  | NodePath<t.ArrowFunctionExpression>
  | NodePath<t.FunctionDeclaration>
  | NodePath<t.FunctionExpression>;

// TODO: try capturing as little as possible i.e. if only `x.y` is used, don't pass all of `x`
// e.g.: `id4.x` here: packages/next-swc/crates/core/tests/fixture/server-actions/server/5/input.js

// TODO: change output to be
//   _ACTION.bind(null, { get value() { return _encryptActionBoundArgs([x, y, z]) } })
// and
//   const [x, y, z] = await _decryptActionBoundArgs($$CLOSURE.value)
// that way, encrypt/decrypt doesn't need to know about our value() hacks

// duplicated from packages/core/src/build/build.ts

const getHash = (s: string) =>
  crypto.createHash("sha1").update(s).digest().toString("hex");

// FIXME: this is can probably result in weird bugs --
// we're only looking at the name of the module,
// so we'll give it the same id even if the contents changed completely!
// this id should probably look at some kind of source-hash...
const getServerActionModuleId = (resource: string) =>
  getHash(pathToFileURL(resource).href);

type PluginOptions = {
  onActionFound?: (arg: { file: string } & ExtractedActionInfo) => void;
};

type ExtractedActionInfo = { exportedName: string };

type ThisExtras = {
  extractedActions: ExtractedActionInfo[];
  onAction(action: ExtractedActionInfo): void;
  addRSDWImport: () => t.Identifier;
  addCryptImport(): CryptImport;
  getActionModuleId: () => string;
};

type ThisWithExtras = PluginPass & ThisExtras;

type CryptImport = {
  encrypt: t.Identifier;
  decrypt: t.Identifier;
};

const createPlugin =
  ({ onActionFound }: PluginOptions = {}) =>
  (
    api: BabelAPI,
    _options: unknown,
    _dirname: string
  ): PluginObj<ThisWithExtras> => {
    api.assertVersion(7);
    const { types: t } = api;

    // const getFilename = (state: PluginPass) =>
    //   state.file.opts.filename ?? "<unnamed>";

    const hasUseServerDirective = (path: FnPath) => {
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

    const extractInlineActionToTopLevel = (
      path: FnPath,
      _state: PluginPass,
      {
        body,
        freeVariables,
        ctx: { addRSDWImport, getActionModuleId, addCryptImport },
      }: {
        body: t.BlockStatement;
        freeVariables: string[];
        ctx: ThisWithExtras;
      }
    ) => {
      let extractedFunctionParams = [...path.node.params];
      let extractedFunctionBody = body.body;
      if (freeVariables.length > 0) {
        // only add a closure object if we're not closing over anything.
        const closureParam = path.scope.generateUidIdentifier("$$CLOSURE");
        const freeVarsPat = t.arrayPattern(
          freeVariables.map((variable) => t.identifier(variable))
        );
        const closureExpr = t.memberExpression(
          t.parenthesizedExpression(
            t.awaitExpression(
              t.callExpression(t.identifier("_decryptActionBoundArgs"), [
                closureParam,
              ])
            )
          ),
          t.identifier("value")
        );

        extractedFunctionParams = [closureParam, ...path.node.params];
        extractedFunctionBody = [
          t.variableDeclaration("var", [
            t.variableDeclarator(t.assignmentPattern(freeVarsPat, closureExpr)),
          ]),
          ...extractedFunctionBody,
        ];

        addCryptImport();
      }

      const wrapInRegister = (expr: t.Expression, exportedName: string) => {
        const actionModuleId = getActionModuleId();
        const registerServerReferenceId = addRSDWImport();

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
          t.blockStatement(extractedFunctionBody),
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

      const [inserted] = lastImportPath!.insertAfter(functionDeclaration);
      moduleScope.registerBinding(bindingKind, inserted);
      inserted.addComment(
        "leading",
        " hoisted action: " + (getFnPathName(path) ?? "<anonymous>"),
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
    };

    const getInlineActionReplacement = ({
      id,
      freeVariables,
    }: {
      id: t.Identifier;
      freeVariables: string[];
    }) => {
      if (freeVariables.length === 0) {
        return id;
      }
      const lazyWrapper = (expr: t.Expression) =>
        t.objectExpression([
          t.objectMethod(
            "get",
            t.identifier("value"),
            [],
            t.blockStatement([t.returnStatement(expr)])
          ),
        ]);

      const _boundArgs = lazyWrapper(
        t.arrayExpression(
          freeVariables.map((variable) => t.identifier(variable))
        )
      );
      const boundArgs = t.callExpression(
        t.identifier("_encryptActionBoundArgs"),
        [_boundArgs]
      );
      return t.callExpression(t.memberExpression(id, t.identifier("bind")), [
        t.nullLiteral(),
        boundArgs,
      ]);
    };

    return {
      pre(file) {
        this.extractedActions = [];
        this.onAction = (info) => {
          onActionFound?.({ ...info, file: file.opts.filename! });
          this.extractedActions.push(info);
        };

        let cachedRSDWImport: t.Identifier | null = null;
        const addRSDWImport = () => {
          if (cachedRSDWImport) {
            return cachedRSDWImport;
          }
          return (cachedRSDWImport = addNamedImport(
            file.path,
            "registerServerReference",
            "react-server-dom-webpack/server"
          ));
        };

        this.addRSDWImport = addRSDWImport;

        let cachedCryptImport: CryptImport | null = null;
        const addCryptImport = () => {
          const path = file.path;
          if (cachedCryptImport) {
            return cachedCryptImport;
          }
          const importSource =
            "@owoce/tangle/dist/runtime/support/encrypt-action-bound-args";
          // "@owoce/tangle/server"

          const val = {
            encrypt: addNamedImport(
              path,
              "encryptActionBoundArgs",
              importSource
            ),
            decrypt: addNamedImport(
              path,
              "decryptActionBoundArgs",
              importSource
            ),
          };
          return (cachedCryptImport = val);
        };

        this.addCryptImport = addCryptImport;

        let cachedActionModuleId: string | null = null;
        const getActionModuleId = () => {
          if (cachedActionModuleId) {
            return cachedActionModuleId;
          }
          const filePathForId = file.opts.root
            ? // prefer relative paths, because we hash those for usage as module ids
              "/__project__/" +
              getRelativePath(file.opts.root, file.opts.filename!)
            : file.opts.filename;

          return (cachedActionModuleId = getServerActionModuleId(
            filePathForId!
          ));
        };

        this.getActionModuleId = getActionModuleId;
      },

      visitor: {
        // `() => {}`
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
          });
        },

        // `function foo() { ... }`
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
          });
        },

        // `const foo = function() { ... }`
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
          });
        },
      },

      post(file) {
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

        file.path.node.body.unshift(
          t.expressionStatement(t.stringLiteral(stashedData))
        );

        // state.path.addComment("leading", stashedData);
        // console.log(state.path.node);
      },
    };
  };

// ===================================================================================
// ===================================================================================

const DEBUG = false;

const getFreeVariables = (path: FnPath) => {
  const freeVariablesSet = new Set<string>();
  const programScope = path.scope.getProgramParent();
  path.traverse({
    Identifier(innerPath) {
      const { name } = innerPath.node;

      const log = DEBUG
        ? (...args: any[]) =>
            console.log(
              `GFV(${getFnPathName(path)})`,
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

const getFnPathName = (path: FnPath) => {
  if (path.isArrowFunctionExpression()) {
    return undefined;
  }
  return path.node!.id!.name;
};

const isChildScope = ({
  root,
  parent,
  child,
}: {
  root: BabelScope;
  parent: BabelScope;
  child: BabelScope;
}) => {
  let curScope = child;
  while (curScope !== root) {
    if (curScope.parent === parent) {
      return true;
    }
    curScope = curScope.parent;
  }
  return false;
};

function findLastIndex<T>(
  arr: T[],
  pred: (el: T) => boolean
): number | undefined {
  for (let i = arr.length - 1; i >= 0; i--) {
    const el = arr[i];
    if (pred(el)) {
      return i;
    }
  }
  return undefined;
}

function findLast<T>(arr: T[], pred: (el: T) => boolean): T | undefined {
  const index = findLastIndex(arr, pred);
  if (index === undefined) {
    return undefined;
  }
  return arr[index];
}

function findImmediatelyEnclosingDeclaration(path: FnPath) {
  let currentPath: NodePath = path;
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
    if (!currentPath.parentPath) {
      return null;
    }
    currentPath = currentPath.parentPath;
  }
  return null;
}

function getTopLevelBinding(path: FnPath) {
  const decl = findImmediatelyEnclosingDeclaration(path);
  if (!decl) {
    return null;
  }

  if (!("id" in decl.node) || !decl.node.id) {
    return null;
  }
  if (!("name" in decl.node.id)) {
    return null;
  }

  // console.log("id", decl.node.id.name);
  const declBinding = decl.scope.getBinding(decl.node.id.name);
  const isTopLevel = declBinding!.scope === path.scope.getProgramParent();

  // console.log("enclosing declaration", decl.type, decl.parent.type, {
  //   isTopLevel,
  //   // declBinding: declBinding.scope,
  // });
  return isTopLevel ? declBinding : null;
}

const assertIsAsyncFn = (path: FnPath) => {
  if (!path.node.async) {
    throw path.buildCodeFrameError(
      `functions marked with "use server" must be async`
    );
  }
};

export { createPlugin };
