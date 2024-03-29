// eslint-disable-next-line @typescript-eslint/ban-ts-comment

import {
  template,
  type NodePath,
  type PluginObj,
  type PluginPass,
  BabelFile,
} from "@babel/core";
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

// TODO: mode: 'client' | 'server', emit proxies in server mode
// but in client mode, we should only reach this file if it's top-level "use server" --
// i guess we just error otherwise?

// TODO: encryption should be applied in top-level "use server" too, which means that we'll need a custom bind() after all...

// duplicated from packages/core/src/build/build.ts

const getHash = (s: string) =>
  crypto.createHash("sha1").update(s).digest().toString("hex");

// FIXME: this is can probably result in weird bugs --
// we're only looking at the name of the module,
// so we'll give it the same id even if the contents changed completely!
// this id should probably look at some kind of source-hash...
const getModuleIdHash = (file: BabelFile) => {
  const idUrl = getModuleIdUrl(file, true);
  return getHash(idUrl);
};

const getModuleIdUrl = (file: BabelFile, relative: boolean) => {
  const filePathForId =
    relative && file.opts.root
      ? "/__project__/" + getRelativePath(file.opts.root, file.opts.filename!)
      : file.opts.filename!;
  return pathToFileURL(filePathForId).href;
};

const BUILTIN_MODULE_ID_FUNCTIONS = {
  "file-url-root-relative": (file: BabelFile) => getModuleIdUrl(file, true),
  "file-url-absolute": (file: BabelFile) => getModuleIdUrl(file, false),
  "file-url-hash": (file: BabelFile) => getModuleIdHash(file),
};

type PluginInjected = {
  onActionFound?: (
    arg: { file: string | undefined } & ExtractedActionInfo
  ) => void;
  getModuleId?: (file: BabelFile) => string;
};

type ExtractedActionInfo = { localName?: string; exportedName: string };

type ThisExtras = {
  didSkip?: boolean;
  extractedActions: ExtractedActionInfo[];
  hasModuleLevelUseServerDirective: boolean;
  onAction(action: ExtractedActionInfo): void;
  addRSDWImport: () => t.Identifier;
  addCryptImport(): CryptImport | null;
  getActionModuleId: () => string;
  defineBoundArgsWrapperHelper(): t.Identifier;
  wrapBoundArgs(expr: t.Expression): t.Expression;
};

export type PluginOptions = {
  moduleIds?: "file-url-root-relative" | "file-url-absolute" | "file-url-hash";
  encryption: {
    importSource: string;
    encryptFn: string;
    decryptFn: string;
  } | null;
  runtime?: {
    registerServerReference: {
      importSource: string;
      name: string;
    };
  };
};

const DEFAULT_OPTIONS: Partial<PluginOptions> = {
  runtime: {
    registerServerReference: {
      importSource: "react-server-dom-webpack/server",
      name: "registerServerReference",
    },
  },
};

type ThisWithExtras = PluginPass & ThisExtras;

type CryptImport = {
  encryptFn: t.Identifier;
  decryptFn: t.Identifier;
};

const LAZY_WRAPPER_VALUE_KEY = "value";

// React doesn't like non-enumerable properties on serialized objects (see `isSimpleObject`),
// so we have to use closure scope for the cache (instead of a non-enumerable `this._cache`)
const _buildLazyWrapperHelper = template(`(thunk) => {
  let cache = undefined;
  return {
    get ${LAZY_WRAPPER_VALUE_KEY}() {
      if (!cache) {
        cache = thunk();
      }
      return cache;
    }
  }
}`);

const buildLazyWrapperHelper = () => {
  return (_buildLazyWrapperHelper({}) as t.ExpressionStatement).expression;
};

const getOrCreateInMap = <K, V>(
  map: Map<K, V>,
  key: K,
  create: () => V
): [value: V, didCreate: boolean] => {
  if (!map.has(key)) {
    const result = create();
    // console.log("getOrCreateInMap :: creating", key, result);
    map.set(key, result);
    return [result, true];
  } else {
    const result = map.get(key)!;
    // console.log("getOrCreateInMap :: reusing", key, result);
    return [result, false];
  }
};

const createAddNamedImportOnce = (t: BabelAPI["types"]) => {
  const addedImportsCache = new Map<string, Map<string, t.Identifier>>();
  return function addNamedImportOnce(
    path: NodePath<t.Node>,
    name: string,
    source: string
  ) {
    const [sourceCache] = getOrCreateInMap(
      addedImportsCache,
      source,
      () => new Map<string, t.Identifier>()
    );
    const [identifier, didCreate] = getOrCreateInMap(sourceCache, name, () =>
      addNamedImport(path, name, source)
    );
    // for cached imports, we need to clone the resulting identifier, because otherwise
    // '@babel/plugin-transform-modules-commonjs' won't replace the references to the import for some reason.
    // this is a helper for that.
    return didCreate ? identifier : t.cloneNode(identifier);
  };
};

const createPlugin =
  ({ onActionFound, getModuleId: maybeGetModuleId }: PluginInjected = {}) =>
  (
    api: BabelAPI,
    rawOptions: unknown = {},
    _dirname: string
  ): PluginObj<ThisWithExtras> => {
    api.assertVersion(7);
    const { types: t } = api;
    const options = { ...DEFAULT_OPTIONS, ...(rawOptions as PluginOptions) }; // FIXME: zod

    const getModuleId =
      (options.moduleIds
        ? BUILTIN_MODULE_ID_FUNCTIONS[options.moduleIds]
        : undefined) ??
      maybeGetModuleId ??
      BUILTIN_MODULE_ID_FUNCTIONS["file-url-hash"];

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
        ctx,
      }: {
        body: t.BlockStatement;
        freeVariables: string[];
        ctx: ThisWithExtras;
      }
    ) => {
      const actionModuleId = ctx.getActionModuleId();
      const moduleScope = path.scope.getProgramParent();
      const extractedIdentifier =
        moduleScope.generateUidIdentifier("$$INLINE_ACTION");

      let extractedFunctionParams = [...path.node.params];
      let extractedFunctionBody = body.body;
      if (freeVariables.length > 0) {
        // only add a closure object if we're not closing over anything.
        // const [x, y, z] = await _decryptActionBoundArgs(await $$CLOSURE.value);

        const encryption = ctx.addCryptImport();

        const closureParam = path.scope.generateUidIdentifier("$$CLOSURE");
        const freeVarsPat = t.arrayPattern(
          freeVariables.map((variable) => t.identifier(variable))
        );

        const closureExpr = encryption
          ? t.awaitExpression(
              t.callExpression(encryption.decryptFn, [
                t.awaitExpression(
                  t.memberExpression(
                    closureParam,
                    t.identifier(LAZY_WRAPPER_VALUE_KEY)
                  )
                ),
                t.stringLiteral(actionModuleId),
                t.stringLiteral(extractedIdentifier.name),
              ])
            )
          : t.memberExpression(
              closureParam,
              t.identifier(LAZY_WRAPPER_VALUE_KEY)
            );

        extractedFunctionParams = [closureParam, ...path.node.params];
        extractedFunctionBody = [
          t.variableDeclaration("var", [
            t.variableDeclarator(t.assignmentPattern(freeVarsPat, closureExpr)),
          ]),
          ...extractedFunctionBody,
        ];
      }

      const wrapInRegister = (expr: t.Expression, exportedName: string) => {
        const registerServerReferenceId = ctx.addRSDWImport();

        return t.callExpression(registerServerReferenceId, [
          expr,
          t.stringLiteral(actionModuleId),
          t.stringLiteral(exportedName),
        ]);
      };

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
            ctx,
          }),
      };
    };

    const getInlineActionReplacement = ({
      id,
      freeVariables,
      ctx,
    }: {
      id: t.Identifier;
      freeVariables: string[];
      ctx: ThisWithExtras;
    }) => {
      if (freeVariables.length === 0) {
        return id;
      }
      const encryption = ctx.addCryptImport();

      const actionModuleId = ctx.getActionModuleId();
      const capturedVarsExpr = t.arrayExpression(
        freeVariables.map((variable) => t.identifier(variable))
      );
      const boundArgs = ctx.wrapBoundArgs(
        encryption
          ? t.callExpression(encryption.encryptFn, [
              capturedVarsExpr,
              t.stringLiteral(actionModuleId),
              t.stringLiteral(id.name),
            ])
          : capturedVarsExpr
      );

      // _ACTION.bind(null, { get value() { return _encryptActionBoundArgs([x, y, z]) } })

      return t.callExpression(t.memberExpression(id, t.identifier("bind")), [
        t.nullLiteral(),
        boundArgs,
      ]);
    };

    return {
      name: "babel-rsc-actions",
      pre(file) {
        if (!file.code.includes("use server")) {
          this.didSkip = true;
          file.path.skip();
          return;
        }

        this.extractedActions = [];
        this.hasModuleLevelUseServerDirective = false;

        this.onAction = (info) => {
          onActionFound?.({ file: file.opts.filename ?? undefined, ...info });
          this.extractedActions.push(info);
        };

        const addNamedImportOnce = createAddNamedImportOnce(t);

        this.addRSDWImport = () => {
          return addNamedImportOnce(
            file.path,
            options.runtime!.registerServerReference.name,
            options.runtime!.registerServerReference.importSource
          );
        };
        // this.addRSDWImport = () => {
        //   return addNamedImportOnce(
        //     file.path,
        //     options.runtime!.registerServerReference.name,
        //     options.runtime!.registerServerReference.importSource
        //   );
        // };

        this.addCryptImport = () => {
          if (!options.encryption) {
            return null;
          }
          const path = file.path;

          return {
            encryptFn: addNamedImportOnce(
              path,
              options.encryption.encryptFn,
              options.encryption.importSource
            ),
            decryptFn: addNamedImportOnce(
              path,
              options.encryption.decryptFn,
              options.encryption.importSource
            ),
          };
        };

        this.getActionModuleId = once(() => {
          return getModuleId(file);
        });

        this.defineBoundArgsWrapperHelper = once(() => {
          const id =
            this.file.path.scope.generateUidIdentifier("wrapBoundArgs");
          this.file.path.scope.push({
            id,
            kind: "var",
            init: buildLazyWrapperHelper(),
          });
          return id;
        });

        this.wrapBoundArgs = (expr) => {
          const wrapperFn = t.cloneNode(this.defineBoundArgsWrapperHelper());
          return t.callExpression(wrapperFn, [
            t.arrowFunctionExpression([], expr),
          ]);
        };
      },

      visitor: {
        Program(path) {
          if (
            path.node.directives.some((d) => d.value.value === "use server")
          ) {
            this.hasModuleLevelUseServerDirective = true;
            // remove the directive so that downstream consumers don't transform the module again.
            path.node.directives = path.node.directives.filter(
              (d) => d.value.value !== "use server"
            );
          }
        },

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
          const tlb = getTopLevelBinding(path);

          const { extractedIdentifier, getReplacement } =
            extractInlineActionToTopLevel(path, state, {
              freeVariables,
              body,
              ctx: this,
            });

          path.replaceWith(getReplacement());

          this.onAction({
            localName: tlb?.identifier.name,
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
            localName: tlb?.identifier.name,
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

          const tlb = getTopLevelBinding(path);

          path.replaceWith(getReplacement());
          this.onAction({
            localName: tlb?.identifier.name,
            exportedName: extractedIdentifier.name,
          });
        },

        // Top-level "use server"

        // ExportDeclaration(path) {
        //   // TODO: i guess this can be either default or named. maybe worth unifying some of the code for default & named
        //   // when we implement default exports?
        // },

        ExportDefaultDeclaration(path) {
          if (!this.hasModuleLevelUseServerDirective) {
            return;
          }
          // TODO
          throw path.buildCodeFrameError(
            `Not implemented: 'export default' declarations in "use server" files. Try using 'export { name as default }' instead.`
          );
        },

        ExportNamedDeclaration(path) {
          if (!this.hasModuleLevelUseServerDirective) {
            return;
          }

          const registerServerReferenceId = this.addRSDWImport();
          const actionModuleId = this.getActionModuleId();

          const createRegisterCall = (
            identifier: t.Identifier,
            exported: t.Identifier | t.StringLiteral = identifier
          ) => {
            const exportedName = t.isIdentifier(exported)
              ? exported.name
              : exported.value;
            return t.callExpression(registerServerReferenceId, [
              identifier,
              t.stringLiteral(actionModuleId),
              t.stringLiteral(exportedName),
            ]);
          };

          if (path.node.specifiers.length > 0) {
            for (const specifier of path.node.specifiers) {
              // `export * as ns from './foo';`
              if (t.isExportNamespaceSpecifier(specifier)) {
                throw path.buildCodeFrameError(
                  "Not implemented: Namespace exports"
                );
              } else if (t.isExportDefaultSpecifier(specifier)) {
                // `export default foo;`
                throw path.buildCodeFrameError(
                  "Not implemented (ExportDefaultSpecifier in ExportNamedDeclaration)"
                );
              } else if (t.isExportSpecifier(specifier)) {
                // `export { foo };`
                // `export { foo as [bar|default] };`
                const localName = specifier.local.name;
                const exportedName = t.isIdentifier(specifier.exported)
                  ? specifier.exported.name
                  : specifier.exported.value;

                // if we're reexporting an existing action under a new name, we shouldn't register() it again.
                if (
                  !this.extractedActions.some(
                    (info) => info.localName === localName
                  )
                ) {
                  // referencing the function's local identifier here *should* be safe (w.r.t. TDZ) because
                  // 1. if it's a `export async function foo() {}`, the declaration will be hoisted,
                  //    so it's safe to reference no matter how the declarations are ordered
                  // 2. if it's an `export const foo = async () => {}`, then the standalone `export { foo }`
                  //    has to follow the definition, so we can reference it right before the export decl as well
                  path.insertBefore(
                    createRegisterCall(specifier.local, specifier.exported)
                  );
                }

                this.onAction({ localName, exportedName });
              } else {
                throw path.buildCodeFrameError(
                  "Not implemented: whatever this is"
                );
              }
            }
            return;
          }

          if (!path.node.declaration) {
            throw path.buildCodeFrameError(
              `Internal error: Unexpected 'ExportNamedDeclaration' without declarations `
            );
          }

          const identifiers: t.Identifier[] = (() => {
            const innerPath = path.get("declaration");
            if (innerPath.isVariableDeclaration()) {
              return innerPath.get("declarations").map((d) => {
                // TODO: insert `typeof <identifier> === 'function'` check -- it's a variable, so it could be anything
                const id = d.node.id;
                if (!t.isIdentifier(id)) {
                  // TODO
                  throw innerPath.buildCodeFrameError(
                    "Not implemented: whatever this is"
                  );
                }
                return id;
              });
            } else if (innerPath.isFunctionDeclaration()) {
              if (!innerPath.get("async")) {
                throw innerPath.buildCodeFrameError(
                  `Functions exported from "use server" files must be async.`
                );
              }
              return [innerPath.get("id").node!];
            } else {
              throw innerPath.buildCodeFrameError(
                `Not implemented (or possibly unsupported): whatever is being exported here`
              );
            }
          })();

          path.insertAfter(
            identifiers.map((identifier) => createRegisterCall(identifier))
          );
          for (const identifier of identifiers) {
            this.onAction({
              localName: identifier.name,
              exportedName: identifier.name,
            });
          }
        },
      },

      post(file) {
        if (this.didSkip) {
          return;
        }
        if (this.extractedActions.length === 0) {
          return;
        }
        DEBUG && console.log("extracted actions", this.extractedActions);
        const payload = {
          id: this.getActionModuleId(),
          names: this.extractedActions.map((e) => e.exportedName),
        };
        const stashedData = "babel-rsc/actions: " + JSON.stringify(payload);

        file.path.node.body.unshift(
          t.expressionStatement(t.stringLiteral(stashedData))
        );

        file.path.node.extra ??= {};
        file.path.node.extra["babel-rsc/actions"] = payload;

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

const once = <T>(fn: () => T) => {
  type Cache<T> = { has: true; value: T } | { has: false; value: undefined };
  let cache: Cache<T> = { has: false, value: undefined };
  const wrapped = (): T => {
    if (cache.has) {
      return cache.value;
    }
    const value = fn();
    cache = { has: true, value };
    return value;
  };
  return wrapped;
};

export { createPlugin };
