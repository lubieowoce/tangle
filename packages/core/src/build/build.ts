/// <reference types="@owoce/react-server-dom-webpack" />

import { LAYERS, TangleConfig } from "./shared";

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";
import crypto from "node:crypto";

import ReactFlightWebpackPlugin, {
  Options as ReactFlightWebpackPluginOptions,
} from "react-server-dom-webpack/plugin";

import type { ServerManifest } from "react-server-dom-webpack/server";
import { ImportManifestEntry } from "react-server-dom-webpack/src/shared/ReactFlightImportMetadata";
import type { SSRModuleMap as SSRModuleMapUnbundled } from "react-server-dom-webpack/src/ReactFlightClientConfigBundlerNode";
import type { SSRManifest as SSRManifestBundled } from "react-server-dom-webpack/client";

import { runWebpack } from "./run-webpack";
import Webpack, {
  Configuration,
  Compiler,
  NormalModule,
  Module,
  NormalModuleReplacementPlugin,
  AsyncDependenciesBlock,
  Compilation,
  WebpackError,
  dependencies as webpackDependencies,
} from "webpack";
import { merge as mergeWebpackConfigs } from "webpack-merge";

import VirtualModulesPlugin from "webpack-virtual-modules";
import {
  MODULE_EXTENSIONS_GLOB,
  MODULE_EXTENSIONS_LIST,
  MODULE_EXTENSIONS_REGEX,
} from "./common";
import {
  findRoutes,
  generateRoutesExport,
  normalizeRoutes,
} from "@owoce/tangle-router/build";
import { stringLiteral } from "./codegen-helpers";

import { CachedInputFileSystem, ResolverFactory } from "enhanced-resolve";
import fs from "fs";
import MiniCssExtractPlugin from "mini-css-extract-plugin";

const rel = (p: string) => path.resolve(__dirname, p);

const getVirtualPathSSR = (p: string) =>
  p.replace(MODULE_EXTENSIONS_REGEX, ".__ssr__.$1"); // FIXME: kinda hacky... idk

const getVirtualPathRSC = (p: string) =>
  p.replace(MODULE_EXTENSIONS_REGEX, ".__rsc__.$1"); // FIXME: kinda hacky... idk

const isVirtualPath = (p: string) =>
  p.match(/\.(__ssr__|__rsc__)\.(.+)$/) !== null;

const isVirtualPathSSR = (p: string) => p.match(/\.__ssr__\.(.+)$/) !== null;
const isVirtualPathRSC = (p: string) => p.match(/\.__rsc__\.(.+)$/) !== null;

const getOriginalPathFromVirtual = (p: string) =>
  p.replace(/\.(__ssr__|__rsc__)\./, ".");

export type BuildReturn = { server: { path: string } };

const LOG_OPTIONS = {
  importRewrites: false,
  generatedCode: false,
  manifestRewrites: false,
  ssrManifest: false,
  reactResolutions: false,
};

const IMPORT_CONDITIONS_CLIENT = ["browser", "import", "require", "webpack"];
const IMPORT_CONDITIONS_SSR = ["node", "import", "require", "webpack"];
const IMPORT_CONDITIONS_RSC = ["react-server", ...IMPORT_CONDITIONS_SSR];

const IMPORT_CONDITIONS = {
  client: IMPORT_CONDITIONS_CLIENT,
  ssr: IMPORT_CONDITIONS_SSR,
  rsc: IMPORT_CONDITIONS_RSC,
};

const nullIfNotExists = (p: string) => {
  if (!fs.existsSync(p)) {
    return null;
  }
  return p;
};

export const build = async ({
  appPath,
  configPath,
}: {
  appPath: string;
  configPath: string | null;
}): Promise<BuildReturn> => {
  const DIST_PATH = path.join(appPath, "dist");
  const INTERNAL_CODE = rel("../runtime");

  const opts = {
    user: {
      routesDir: path.resolve(appPath, "src/routes"),
      tsConfig: path.resolve(appPath, "tsconfig.json"),
      globalCssFile: nullIfNotExists(path.resolve(appPath, "src/global.css")),
    },
    client: {
      entry: path.join(INTERNAL_CODE, "client.js"),
      destDir: path.join(DIST_PATH, "client"),
      generatedGlobalCssModule: path.join(
        INTERNAL_CODE,
        "generated/global-css.js"
      ),
    },
    server: {
      entry: path.join(INTERNAL_CODE, "server.js"),
      ssrModule: path.join(INTERNAL_CODE, "server-ssr.js"),
      rscModule: path.join(INTERNAL_CODE, "server-rsc.js"),
      actionSupportModule: path.join(
        INTERNAL_CODE,
        "support/encrypt-action-bound-args.js"
      ),
      generatedRoutesModule: path.join(INTERNAL_CODE, "generated/routes.js"),
      generatedActionHandlersModule: path.join(
        INTERNAL_CODE,
        "generated/action-handlers.js"
      ),
      destDir: path.join(DIST_PATH, "server"),
    },
    moduleDir: INTERNAL_CODE,
  };

  if (configPath) {
    console.log("importing user config", configPath);
  }
  const userConfig: TangleConfig =
    configPath !== null
      ? ((await import(configPath)).default as TangleConfig)
      : {};

  const withUserWebpackConfig = (config: Configuration) => {
    const userWebpackConfig = userConfig.webpackConfig;

    if (!userWebpackConfig) {
      return config;
    }

    return mergeWebpackConfigs(config, userWebpackConfig());
  };

  const BUILD_MODE =
    process.env.NODE_ENV === "production" ? "production" : "development";

  const TS_LOADER = {
    loader: "ts-loader",
    options: {
      transpileOnly: true,
      configFile: opts.user.tsConfig,
      compilerOptions: {
        moduleResolution: "node",
      },
    },
  };

  const NO_TERSER: Configuration["optimization"] = {
    minimize: false, // terser is breaking with `__name is not defined` for some reason...
  };

  const shared: Configuration = {
    mode: BUILD_MODE,
    // devtool: false,
    devtool: "source-map",
    resolve: {
      modules: [appPath, "node_modules"],
      extensions: MODULE_EXTENSIONS_LIST,
      fullySpecified: false, // annoying to deal with
    },
    module: {
      rules: [
        {
          test: /\.m?js/,
          type: "javascript/auto",
          resolve: {
            fullySpecified: false,
          },
        },
        {
          test: MODULE_EXTENSIONS_REGEX,
          exclude: [/node_modules/],
          use: [
            {
              // TODO: we're not applying this to node_modules, but we should...
              loader: "babel-loader",
              options: {
                plugins: [
                  [
                    "module:" + "@owoce/babel-rsc/plugin-use-server",
                    {
                      encryption: {
                        importSource:
                          "@owoce/tangle/dist/runtime/support/encrypt-action-bound-args",
                        encryptFn: "encryptActionBoundArgs",
                        decryptFn: "decryptActionBoundArgs",
                      },
                    } satisfies import("@owoce/babel-rsc/plugin-use-server").PluginOptions,
                  ],
                ],
              },
            },
            TS_LOADER,
          ],
        },
        { test: /\.json$/, type: "json" },
      ],
    },
  };

  const parsedRoutes = normalizeRoutes(
    findRoutes(opts.user.routesDir, {
      moduleExtensionsPattern: MODULE_EXTENSIONS_GLOB,
    })
  );

  const routesObjectCode = generateRoutesExport(parsedRoutes);

  const sharedPlugins = (): Configuration["plugins"] & unknown[] => {
    const teeLog = <T>(x: T): T => {
      LOG_OPTIONS.generatedCode && console.log(x);
      return x;
    };
    return [
      new VirtualModulesPlugin({
        [opts.server.generatedRoutesModule]: teeLog(
          `export default ${routesObjectCode};`
        ),
        [opts.client.generatedGlobalCssModule]: teeLog(
          opts.user.globalCssFile
            ? `import ${stringLiteral(opts.user.globalCssFile)};`
            : "export {}"
        ),
      }),
    ];
  };

  // =================
  // Analysis
  // =================

  const analysisCtx = createAnalysisContext();

  console.log("performing analysis...");

  // TODO: cheating a bit, because we're always resolving these to the server versions,
  // but we only really need that for inline "use server" which'll be in server files anyway
  const reactResolutionsAnalysis = await getReactPackagesResolutions({
    importer: opts.server.entry,
    conditionNames: IMPORT_CONDITIONS.rsc,
  });

  const analysisConfig: Configuration = withUserWebpackConfig(
    mergeWebpackConfigs(shared, {
      mode: BUILD_MODE,
      devtool: false,
      entry: { main: opts.server.entry },
      resolve: {
        alias: reactResolutionsAnalysis.aliases,
      },
      plugins: [...sharedPlugins(), new RSCAnalysisPlugin({ analysisCtx })],
      target: "node16", // TODO does this matter?
      experiments: { layers: true },
      output: {
        path: path.join(opts.server.destDir, "__analysis__"),
        clean: true,
      },
      optimization: {
        ...NO_TERSER,
      },
    })
  );
  await runWebpack(
    analysisConfig,
    // FIXME: the way we do the analysis is kinda wonky (ignoring conditions and such),
    // so it generates a ton of noise. hide the warnings until we figure out a better way to deal with it.
    { quiet: true }
  );

  console.log("analysis context");
  console.log(analysisCtx);

  // =================
  // Client
  // =================

  const clientReferences: ReactFlightWebpackPluginOptions["clientReferences"] =
    [...analysisCtx.modules.client.keys()];

  const INTERMEDIATE_SSR_MANIFEST = "ssr-manifest-intermediate.json";
  const reactResolutionsClient = await getReactPackagesResolutions({
    importer: opts.client.entry,
    conditionNames: IMPORT_CONDITIONS.client,
  });

  const CSS_RULES = {
    plugins: [
      new MiniCssExtractPlugin({
        filename: "[name].[contenthash].css",
        chunkFilename: "[id].[contenthash].css",
      }),
    ],
    module: {
      rules: [
        {
          test: /\.css$/,
          use: [MiniCssExtractPlugin.loader, "css-loader", "postcss-loader"],
        },
      ],
    },
  };

  const clientConfig: Configuration = withUserWebpackConfig(
    mergeWebpackConfigs(shared, CSS_RULES, {
      entry: opts.client.entry,
      resolve: {
        alias: reactResolutionsClient.aliases,
      },
      plugins: [
        ...sharedPlugins(),
        ...getReplaceMentsOfServerModules({ analysisCtx, isServer: false }),
        new ReactFlightWebpackPlugin({
          isServer: false,
          clientManifestFilename: "client-manifest.json",
          ssrManifestFilename: INTERMEDIATE_SSR_MANIFEST,
          clientReferences,
        }),
      ],
      target: ["web", "es2020"],
      output: {
        clean: true,
        path: opts.client.destDir,
        publicPath: "auto", // we don't know the public path statically
        filename: "[name].[contenthash].js",
        chunkFilename: "[id].[chunkhash].js",
      },
      optimization: {
        moduleIds: "deterministic",
        // ...NO_TERSER,
        // splitChunks: {
        //   chunks: "all",
        // },
      },
      cache: false, // FIXME
    })
  );
  console.log("building client...");

  await runWebpack(clientConfig);

  const ssrManifestPath = path.join(
    opts.client.destDir,
    INTERMEDIATE_SSR_MANIFEST
  );

  const ssrManifestFromRSDW: SSRManifestUnbundled = JSON.parse(
    readFileSync(ssrManifestPath, "utf-8")
  );

  // =================
  // Server
  // =================

  console.log("building server...");

  const reactResolutionsServer = {
    ssr: await getReactPackagesResolutions({
      importer: opts.server.ssrModule,
      conditionNames: IMPORT_CONDITIONS.ssr,
    }),
    rsc: await getReactPackagesResolutions({
      importer: opts.server.rscModule,
      conditionNames: IMPORT_CONDITIONS.rsc,
    }),
  };

  if (LOG_OPTIONS.reactResolutions) {
    console.log("react resolutions and aliases", {
      client: reactResolutionsClient,
      ...reactResolutionsServer,
    });
  }

  // module.rules for server stuff.
  // For some reason, we need to add this onto absolutely every `rules` entry,
  // otherwise the `conditionNames` don't come through
  // and `react-server-dom-webpack/server` is resolved incorrectly.
  // NOTE:
  //  technically we've got some redundancy here, because `aliases` already contains a resolved RSDW.
  //  but the `conditionNames` still need to be set correctly for other packages,
  //  so we need both.
  const SERVER_MODULE_RULES = {
    ssr: {
      resolve: {
        conditionNames: IMPORT_CONDITIONS.ssr,
        alias: reactResolutionsServer.ssr.aliases,
      },
    },
    rsc: {
      resolve: {
        conditionNames: IMPORT_CONDITIONS.rsc,
        alias: reactResolutionsServer.rsc.aliases,
      },
    },
  };

  const serverConfig: Configuration = withUserWebpackConfig(
    mergeWebpackConfigs(shared, {
      entry: { main: opts.server.entry },
      module: {
        rules: [
          {
            // assign modules to layers
            oneOf: [
              {
                test: opts.server.rscModule,
                layer: LAYERS.rsc,
                ...SERVER_MODULE_RULES.rsc,
              },
              {
                // everything imported from the main SSR module (including RSDW/client) goes into the SSR layer,
                // so that our NormalModuleReplacement function can rewrite the imports to `.__ssr__.EXT`...
                test: opts.server.ssrModule,
                layer: LAYERS.ssr,
                ...SERVER_MODULE_RULES.ssr,
              },
              {
                // ... and we make it transitive, so that it propagates through imports.
                // note that this may result in duplicating some shared modules.
                // TODO: figure out if we can solve that somehow
                issuerLayer: LAYERS.ssr,
                layer: LAYERS.ssr,
                ...SERVER_MODULE_RULES.ssr,
              },
              {
                test: opts.server.actionSupportModule,
                layer: LAYERS.rsc,
                ...SERVER_MODULE_RULES.rsc,
              },
            ],
          },
          {
            // assign import conditions per layer
            oneOf: [
              {
                issuerLayer: LAYERS.ssr,
                ...SERVER_MODULE_RULES.ssr,
              },
              {
                issuerLayer: LAYERS.rsc,
                ...SERVER_MODULE_RULES.rsc,
              },
              {
                issuerLayer: LAYERS.shared,
                ...SERVER_MODULE_RULES.rsc,
              },
            ],
          },
          ...(shared.module?.rules ?? []),
        ],
      },
      plugins: [
        ...sharedPlugins(),
        ...getModuleReplacementsForServer(analysisCtx),
        ...getActionHandlersModule(
          analysisCtx,
          opts.server.generatedActionHandlersModule
        ),
        createReferenceDependencyPlugin({
          analysisCtx,
          type: "client",
          chunkName: "ssr[index]",
          getVirtualPath: getVirtualPathSSR,
          rsdwFilePaths: RSDW_SPECIFIERS.client.map(
            (specifier) => reactResolutionsServer.ssr.resolutions[specifier]
          ),
        }),
        createReferenceDependencyPlugin({
          analysisCtx,
          type: "server",
          chunkName: "server-actions",
          getVirtualPath: getVirtualPathRSC,
          rsdwFilePaths: RSDW_SPECIFIERS.server.map(
            (specifier) => reactResolutionsServer.rsc.resolutions[specifier]
          ),
        }),
        new RSCServerPlugin({
          analysisCtx,
          ssrManifestFromClient: ssrManifestFromRSDW,
          ssrManifestFilename: "ssr-manifest.json",
          serverActionsManifestFilename: "server-actions-manifest.json",
        }),
      ],
      target: "node16",
      experiments: { layers: true },
      output: {
        path: opts.server.destDir,
        clean: true,
      },
      optimization: {
        ...NO_TERSER,
      },
      cache: false,
    })
  );
  await runWebpack(serverConfig);

  return { server: { path: path.join(opts.server.destDir, "main.js") } };
};

//======================
// React resolutions
//======================

type ResolveAliasConfigObject = Required<
  Configuration["resolve"] & Record<string, any>
>["alias"] &
  Record<string, any>;

const RSDW_SPECIFIERS = {
  client: [
    "react-server-dom-webpack/client",
    "react-server-dom-webpack/client.node",
    "react-server-dom-webpack/client.edge",
    "react-server-dom-webpack/client.browser",
  ] as const,
  server: [
    "react-server-dom-webpack/server",
    "react-server-dom-webpack/server.node",
    "react-server-dom-webpack/server.edge",
    "react-server-dom-webpack/server.browser",
  ] as const,
};

const REACT_PACKAGES = [
  "react",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "react-dom",
  "react-dom/client",
  "react-dom/server",
  ...RSDW_SPECIFIERS.client,
  ...RSDW_SPECIFIERS.server,
] as const;

type ReactPackagesResolutions = Record<(typeof REACT_PACKAGES)[number], string>;

/** Get the config necessary to ensure that the bundle uses *our* version of react
 * over whatever the user has.
 *
 * NOTE: This can't just be a `require.resolve` call,
 * because we need to take `conditionNames` into account. */
const getReactPackagesResolutions = async ({
  importer,
  conditionNames,
}: {
  importer: string;
  conditionNames: string[];
}): Promise<{
  resolutions: ReactPackagesResolutions;
  aliases: ResolveAliasConfigObject;
}> => {
  const resolver = ResolverFactory.createResolver({
    fileSystem: new CachedInputFileSystem(fs, 4000),
    conditionNames,
  });

  const resolve = (specifier: string): Promise<string | false | undefined> =>
    new Promise((res, rej) => {
      resolver.resolve(
        {},
        path.dirname(importer),
        specifier,
        {},
        (err, filepath) => (err ? rej(err) : res(filepath))
      );
    });

  const resolutions = Object.fromEntries(
    await Promise.all(
      REACT_PACKAGES.map(async (specifier) => {
        const resolved = await resolve(specifier);
        if (typeof resolved !== "string") {
          throw new Error(
            `Could not resolve '${specifier}' with conditions ${JSON.stringify(
              conditionNames
            )}`
          );
        }
        return [specifier, resolved] as const;
      })
    )
  ) as ReactPackagesResolutions;

  const aliases = Object.fromEntries(
    Object.entries(resolutions)
      .map(([specifier, resolved]) => [`${specifier}$`, resolved] as const)
      .filter((e) => !!e)
      .map((e) => e!)
  );

  return { resolutions, aliases };
};

//=============================
// Client module proxy codegen
//=============================

const getManifestId = (resource: string) => pathToFileURL(resource);

const createProxyOfClientModule = ({
  resource,
  exports: modExports,
}: {
  resource: string;
  exports: string[];
}) => {
  const manifestIdUrl = getManifestId(resource);
  const manifestId = stringLiteral(manifestIdUrl.href);
  // NOTE: we don't need to call `registerClientReference`,
  // because when we access a property on the proxy, it gives us the appropriate reference
  // (and calls `registerClientReferenceImpl` internally)
  const generatedCode = [
    `import { createClientModuleProxy } from 'react-server-dom-webpack/server';`,
    ``,
    `const proxy = /*@__PURE__*/ createClientModuleProxy(${manifestId});`,
  ];
  const getProxyExpr = (exportName: string) => {
    const name = stringLiteral(exportName);
    return `(/*@__PURE__*/ proxy[${name}])`;
  };

  for (const exportName of modExports) {
    const expr = getProxyExpr(exportName);
    if (exportName === "default") {
      generatedCode.push(`export default ${expr};`);
    } else {
      generatedCode.push(`export const ${exportName} = ${expr};`);
    }
  }
  return generatedCode.join("\n");
};

//=================================
// Server reference codegen
//=================================

const getHash = (s: string) =>
  crypto.createHash("sha1").update(s).digest().toString("hex");

// NOTE: the "<id>#<exportedName>" structure is prescribed by RSDW --
// that's the id that `registerServerReference` will create if given an export name.
// (if we wanted to use a different scheme, we can pass `null` there, but why fight the convention?)
const getServerActionReferenceIdForModuleId = (id: string, name: string) =>
  id + "#" + name;

// FIXME: this is can probably result in weird bugs --
// we're only looking at the name of the module,
// so we'll give it the same id even if the contents changed completely!
// this id should probably look at some kind of source-hash...
const createServerActionModuleId = (resource: string) =>
  getHash(pathToFileURL(resource).href);

const createProxyOfServerModule = ({
  resource,
  exports,
  analysisCtx,
}: {
  resource: string;
  exports: string[];
  analysisCtx: RSCAnalysisCtx;
}) => {
  const CREATE_PROXY_MOD_PATH = path.resolve(
    __dirname,
    "../runtime/support/server-action-proxy-for-client"
  );

  const getActionId = (exportName: string) =>
    getActionIdFromCtx(analysisCtx, resource, exportName);

  const generatedCode = [
    `import { createServerActionProxy } from ${stringLiteral(
      CREATE_PROXY_MOD_PATH
    )};`,
    ``,
  ];

  const getProxyExpr = (exportName: string) => {
    const id = stringLiteral(getActionId(exportName));
    return `(/*@__PURE__*/ createServerActionProxy(${id}))`;
  };

  for (const exportName of exports) {
    const expr = getProxyExpr(exportName);
    if (exportName === "default") {
      generatedCode.push(`export default ${expr};`);
    } else {
      generatedCode.push(`export const ${exportName} = ${expr};`);
    }
  }
  return generatedCode.join("\n");
};

function getActionHandlersModule(
  analysisCtx: RSCAnalysisCtx,
  targetFilePath: string
) {
  const code = getActionHandlersModuleSource(analysisCtx);

  if (LOG_OPTIONS.generatedCode) {
    console.log("VirtualModule (action-handlers)", "\n" + code + "\n");
  }

  return [
    new VirtualModulesPlugin({
      [targetFilePath]: code,
    }),
  ];
}

function getActionHandlersModuleSource(analysisCtx: RSCAnalysisCtx) {
  let unique = 0;
  const code: string[] = [];
  const handlersById: Record<string, string> = {};

  for (const [resource] of analysisCtx.modules.server.entries()) {
    const modExports = analysisCtx.exports.server.get(resource)!;
    const modImportedName = `$mod${unique++}`;
    code.push(
      `import * as ${modImportedName} from ${stringLiteral(resource)};`
    );

    for (const exportName of modExports) {
      const actionId = getActionIdFromCtx(analysisCtx, resource, exportName);
      const expr = `${modImportedName}.${exportName}`;
      handlersById[actionId] = expr;
    }
  }

  code.push("export const serverActionHandlers = {");
  for (const [serverActionId, handlerExpr] of Object.entries(handlersById)) {
    code.push(` ${stringLiteral(serverActionId)}: ${handlerExpr},`);
  }
  code.push("};");

  return code.join("\n");
}

function getReplaceMentsOfServerModules({
  analysisCtx,
  isServer,
}: {
  analysisCtx: RSCAnalysisCtx;
  isServer: boolean;
}) {
  const virtualModules: Record<string, string> = {};
  for (const [resource, mod] of analysisCtx.modules.server.entries()) {
    const modExports = analysisCtx.exports.server.get(resource)!;

    const source = isServer
      ? analysisCtx.actionModuleIds.has(resource)
        ? // if we have a pre-generated id for this module, we've already transformed it in babel-rsc.
          getOriginalSource(mod)
        : (() => {
            throw new Error(
              `Internal error: Server module '${resource}' not found in analysisCtx.actionModuleIds`
            );
          })()
      : createProxyOfServerModule({
          resource,
          exports: modExports,
          analysisCtx,
        });
    if (LOG_OPTIONS.generatedCode) {
      console.log("VirtualModule (rsc): " + resource, "\n" + source + "\n");
    }
    virtualModules[resource] = source;
  }

  return [new VirtualModulesPlugin(virtualModules)];
}

//=========================
// Initial bundle analysis
//=========================

type SSRManifestUnbundled = {
  moduleLoading: unknown;
  moduleMap: SSRModuleMapUnbundled;
};

const createAnalysisContext = () => ({
  modules: {
    client: new Map<string, NormalModule>(),
    server: new Map<string, NormalModule>(),
  },
  exports: {
    client: new Map<string, string[]>(),
    server: new Map<string, string[]>(),
  },
  actionModuleIds: new Map<string, string>(),
  getTypeForModule(mod: Module) {
    if (mod instanceof NormalModule) {
      return this.getTypeForResource(mod.resource);
    }
    return null;
  },
  getTypeForResource(resource: string) {
    if (this.modules.client.has(resource)) {
      return "client" as const;
    }
    if (this.modules.server.has(resource)) {
      return "server" as const;
    }
    return null;
  },
});

type RSCAnalysisCtx = ReturnType<typeof createAnalysisContext>;

type RSCAnalysisPluginOptions = {
  analysisCtx: RSCAnalysisCtx;
};

class RSCAnalysisPlugin {
  static pluginName = "RSCAnalysisPlugin";
  constructor(public options: RSCAnalysisPluginOptions) {}

  apply(compiler: Compiler) {
    compiler.hooks.thisCompilation.tap(
      RSCAnalysisPlugin.pluginName,
      (compilation, { normalModuleFactory }) => {
        const onNormalModuleFactoryParser = (
          parser: Webpack.javascript.JavascriptParser
        ) => {
          parser.hooks.program.tap(RSCAnalysisPlugin.pluginName, (program) => {
            // TODO: WHY aren't we getting comments here? are they getting added onto the first statement or something?
            // (until we figure this out, the `babel-plugin-inline-actions:` info will have to be a string literal instead)

            // const allComments = [
            //   ...(program.leadingComments ?? []),
            //   ...(program.comments ?? []),
            //   ...(program.trailingComments ?? []),
            // ];
            // if (
            //   allComments.length > 0
            //   // allComments.some((c) =>
            //   //   c.value.includes("babel-plugin-inline-actions:")
            //   // )
            // ) {
            //   console.log(
            //     "====================== COMMENTS! ========================",
            //     allComments
            //   );
            // }
            // console.log("parser.hooks.program", allComments.length);

            const isClientModule = program.body.some((node) => {
              return (
                node.type === "ExpressionStatement" &&
                node.expression.type === "Literal" &&
                node.expression.value === "use client"
              );
            });

            type PrebuiltModuleInfo = { id: string; names: string[] };

            let prebuiltInfo: PrebuiltModuleInfo | null = null;

            const getStashedInfo = (str: string) => {
              const prefix = "babel-rsc/actions: ";
              if (!str.startsWith(prefix)) {
                return null;
              }
              return JSON.parse(str.slice(prefix.length)) as PrebuiltModuleInfo;
            };

            const isServerModule = program.body.some((node) => {
              if (
                !(
                  node.type === "ExpressionStatement" &&
                  node.expression.type === "Literal"
                )
              ) {
                return false;
              }
              if (typeof node.expression.value === "string") {
                const stashedInfo = getStashedInfo(node.expression.value);
                if (stashedInfo) {
                  prebuiltInfo = stashedInfo;
                  return true;
                }
              }
              if (node.expression.value === "use server") {
                return true;
              }
            });

            if (isServerModule && isClientModule) {
              throw new Error(
                "Cannot use both 'use server' and 'use client' in the same module " +
                  parser.state.module.resource
              );
            }

            if (!isServerModule && !isClientModule) {
              return;
            }

            if (isClientModule) {
              this.options.analysisCtx.modules.client.set(
                parser.state.module.resource,
                parser.state.module
              );
            } else {
              this.options.analysisCtx.modules.server.set(
                parser.state.module.resource,
                parser.state.module
              );
              // weird type stuff going on here
              const _prebuiltInfo = prebuiltInfo as PrebuiltModuleInfo | null;
              if (_prebuiltInfo) {
                this.options.analysisCtx.exports.server.set(
                  parser.state.module.resource,
                  _prebuiltInfo.names
                );
                this.options.analysisCtx.actionModuleIds.set(
                  parser.state.module.resource,
                  _prebuiltInfo.id
                );
              }
            }
          });
        };

        tapParserJS(
          normalModuleFactory,
          "HarmonyModulesPlugin",
          onNormalModuleFactoryParser
        );

        compilation.hooks.afterOptimizeModules.tap(
          RSCAnalysisPlugin.pluginName,
          (modules) => {
            for (const module of modules) {
              if (module instanceof NormalModule) {
                const type = this.options.analysisCtx.getTypeForModule(module);
                if (!type) continue;
                if (
                  // we may have prefilled this before using information from babel.
                  this.options.analysisCtx.exports[type].has(module.resource)
                ) {
                  continue;
                }

                const exports = compilation.moduleGraph.getExportsInfo(module);

                const exportNames = [...exports.orderedExports].map(
                  (exp) => exp.name
                );

                this.options.analysisCtx.exports[type].set(
                  module.resource,
                  exportNames
                );
              }
            }
          }
        );
      }
    );
  }
}

//=========================
// SSR Support for RSC
//=========================

type RSCPluginOptions = {
  analysisCtx: RSCAnalysisCtx;
  ssrManifestFromClient: SSRManifestUnbundled;
  ssrManifestFilename: string;
  serverActionsManifestFilename: string;
};

class RSCServerPlugin {
  static pluginName = "RSCServerPlugin";

  constructor(public options: RSCPluginOptions) {}

  apply(compiler: Compiler) {
    const ensureString = (id: string | number): string => id + "";
    const { analysisCtx } = this.options;

    // Rewrite the SSR manifest that RSDW generated to match the real moduleIds
    compiler.hooks.make.tap(RSCServerPlugin.pluginName, (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: RSCServerPlugin.pluginName,
          stage: Compilation.PROCESS_ASSETS_STAGE_REPORT,
        },
        () => {
          type Rewrites = {
            [id: string]: {
              moduleId: string;
              chunkIds: string[];
            };
          };
          const ssrManifestSpecifierRewrite: Rewrites = {};

          const serverActionsManifest: ServerManifest = {};

          const getGeneratedModuleInfo = (mod: Module) => {
            if (!(mod instanceof NormalModule)) {
              return undefined;
            }
            if (isVirtualPath(mod.resource)) {
              const originalResource = getOriginalPathFromVirtual(mod.resource);
              const type = analysisCtx.getTypeForResource(originalResource);
              if (type === null) {
                throw new Error(
                  `Internal error: Virtual module ${JSON.stringify(
                    mod.resource
                  )} has no type`
                );
              }
              return {
                type,
                originalResource,
                exports: getExportsFromCtx(analysisCtx, originalResource, type),
              };
              // && m.layer === LAYERS.ssr; // TODO: should we do something like this??
            }
            return undefined;
          };

          compilation.chunkGroups.forEach((chunkGroup) => {
            const chunkIds = chunkGroup.chunks
              .map((c) => c.id)
              .filter((id) => id !== null)
              .map((id) => ensureString(id!)); // we want numeric ids to be strings.

            const visitModule = (
              mod: Module & { modules?: Module[] },
              parentModuleId?: string | number
            ) => {
              // If this is a concatenation, register each child to the parent ID.
              if (mod.modules) {
                const moduleId =
                  parentModuleId ?? compilation.chunkGraph.getModuleId(mod);

                mod.modules.forEach((concatenatedMod) => {
                  visitModule(concatenatedMod, moduleId);
                });
                return;
              }

              const moduleInfo = getGeneratedModuleInfo(mod);
              if (!moduleInfo) return;

              const moduleId = ensureString(
                parentModuleId ?? compilation.chunkGraph.getModuleId(mod)
              );

              if (!(mod instanceof NormalModule)) {
                throw new Error(
                  `Expected generated module ${moduleId} to be a NormalModule`
                );
              }

              if (moduleInfo.type === "client") {
                if (!isVirtualPathSSR(mod.resource)) {
                  return;
                }
                // Assumption: RSDW uses file:// ids to identify SSR modules
                const currentIdInSSRManifest = getManifestId(
                  moduleInfo.originalResource
                ).href;

                ssrManifestSpecifierRewrite[currentIdInSSRManifest] = {
                  moduleId,
                  chunkIds,
                };
              } else {
                if (!isVirtualPathRSC(mod.resource)) {
                  return;
                }
                for (const exportName of moduleInfo.exports) {
                  const resource = moduleInfo.originalResource;
                  const actionId = getActionIdFromCtx(
                    analysisCtx,
                    resource,
                    exportName
                  );
                  serverActionsManifest[actionId] = {
                    id: moduleId,
                    chunks: chunkIds,
                    name: exportName,
                  };
                }
              }
            };

            chunkGroup.chunks.forEach(function (chunk) {
              const chunkModules =
                compilation.chunkGraph.getChunkModulesIterable(chunk);

              Array.from(chunkModules).forEach((mod) => {
                visitModule(mod);
              });
            });
          });

          const finalSSRModuleMap: SSRManifestBundled["moduleMap"] = {};
          const toRewrite = new Set(Object.keys(ssrManifestSpecifierRewrite));
          for (const [clientModuleId, moduleExportMap] of Object.entries(
            this.options.ssrManifestFromClient.moduleMap!
          )) {
            for (const [exportName, exportInfo] of Object.entries(
              moduleExportMap
            )) {
              if (exportInfo.specifier in ssrManifestSpecifierRewrite) {
                const rewriteInfo =
                  ssrManifestSpecifierRewrite[exportInfo.specifier];
                const newExportInfo: ImportManifestEntry = {
                  name: exportName,
                  id: rewriteInfo.moduleId,
                  chunks: rewriteInfo.chunkIds.flatMap((id) => [
                    id,
                    `<no filename: ${id}>`, // Seemingly unused by react, but `preloadModule` breaks if not supplied
                  ]),
                  // we used to have this, not sure why it's not in the types anymore
                  // async: true,
                };
                finalSSRModuleMap[clientModuleId] ||= {};
                finalSSRModuleMap[clientModuleId][exportName] = newExportInfo;
                toRewrite.delete(ensureString(exportInfo.specifier));
              }
            }
          }
          const finalSSRManifest: SSRManifestBundled = {
            moduleLoading: null,
            moduleMap: finalSSRModuleMap,
          };

          if (LOG_OPTIONS.manifestRewrites) {
            console.log("manifest rewrites", ssrManifestSpecifierRewrite);
          }
          if (LOG_OPTIONS.ssrManifest) {
            console.log("final ssr manifest", finalSSRManifest);
          }

          if (toRewrite.size > 0) {
            throw new Error(
              "INTERNAL ERROR: Not all modules rewritten:\n" +
                [...toRewrite].join("\n")
            );
          }

          const emitJson = (
            filename: string,
            toStringify: Record<string, any>
          ) => {
            const output = JSON.stringify(toStringify, null, 2);
            compilation.emitAsset(
              filename,
              new Webpack.sources.RawSource(output, false)
            );
          };

          emitJson(this.options.ssrManifestFilename, finalSSRManifest);
          emitJson(
            this.options.serverActionsManifestFilename,
            serverActionsManifest
          );
        }
      );
    });
  }
}

function getModuleReplacementsForServer(analysisCtx: RSCAnalysisCtx) {
  // TODO: use .apply() instead of just putting these in the plugin array

  const virtualModules: Record<string, string> = {};

  // for client modules, SSR gets the original source, and RSC gets a proxy
  for (const [resource, mod] of analysisCtx.modules.client.entries()) {
    {
      const virtualPath = getVirtualPathSSR(resource);
      const source = getOriginalSource(mod);
      if (LOG_OPTIONS.generatedCode) {
        console.log("VirtualModule (ssr):" + virtualPath, "\n" + source + "\n");
      }
      virtualModules[virtualPath] = source;
    }
    {
      const virtualPath = getVirtualPathRSC(resource);
      const source = createProxyOfClientModule({
        resource,
        exports: getExportsFromCtx(analysisCtx, resource, "client"),
      });
      if (LOG_OPTIONS.generatedCode) {
        console.log(
          "VirtualModule (rsc): " + virtualPath,
          "\n" + source + "\n"
        );
      }
      virtualModules[virtualPath] = source;
    }
  }

  // for server modules, it's the opposite -- SSR gets a proxy, and RSC gets the original source (but enhanced)
  for (const [resource, mod] of analysisCtx.modules.server.entries()) {
    {
      const virtualPath = getVirtualPathSSR(resource);
      const source = createProxyOfServerModule({
        resource,
        exports: getExportsFromCtx(analysisCtx, resource, "server"),
        analysisCtx,
      });
      if (LOG_OPTIONS.generatedCode) {
        console.log(
          "VirtualModule (ssr): " + virtualPath,
          "\n" + source + "\n"
        );
      }
      virtualModules[virtualPath] = source;
    }
    {
      // "use server" modules should already be transformed by babel-rsc.
      const virtualPath = getVirtualPathRSC(resource);
      if (!analysisCtx.actionModuleIds.has(resource)) {
        throw new Error(
          `Internal error: Server module '${resource}' not found in analysisCtx.actionModuleIds`
        );
      }
      const source = getOriginalSource(mod);
      virtualModules[virtualPath] = source;
    }
  }

  return [
    new VirtualModulesPlugin(virtualModules),
    createImportRewritePlugin(
      (originalResource: string, resolveData: PartialResolveData) => {
        const issuerLayer = resolveData.contextInfo.issuerLayer;

        // make DOUBLE sure we're assigning the correct layer
        if (isVirtualPath(originalResource)) {
          if (isVirtualPathSSR(originalResource)) {
            return { request: originalResource, layer: LAYERS.ssr };
          }
          if (isVirtualPathRSC(originalResource)) {
            return { request: originalResource, layer: LAYERS.rsc };
          }
        }

        const type = analysisCtx.getTypeForResource(originalResource);
        if (type !== "client" && type !== "server") {
          return null;
        }

        const isSSR = issuerLayer === LAYERS.ssr;

        const [newResource, newLayer] = isSSR
          ? [getVirtualPathSSR(originalResource), LAYERS.ssr]
          : [getVirtualPathRSC(originalResource), LAYERS.rsc];
        const label = `(${isSSR ? "ssr" : "proxy"})`;

        if (LOG_OPTIONS.importRewrites) {
          console.log(
            `${label} preparing replacement: `,
            resolveData.createData.resource
          );
          console.log(
            `${label} issued from: ${resolveData.contextInfo.issuer} (${resolveData.contextInfo.issuerLayer})`
          );
          console.log(`${label} rewriting request to`, newResource);
          console.log();
        }
        return { request: newResource, layer: newLayer };
      }
    ),
  ];
}

type PartialResolveData = {
  request: string | undefined;
  contextInfo: {
    layer?: string;
    issuerLayer?: string | null;
    issuer: string;
  };
  createData: {
    layer?: string | null;
    request: string;
    resource: string;
    userRequest: string;
  };
};

const createImportRewritePlugin = (
  assignModule: (
    originalResource: string,
    resolveData: PartialResolveData
  ) => string | null | { request: string; layer: string }
) => {
  return new NormalModuleReplacementPlugin(
    MODULE_EXTENSIONS_REGEX,
    (resolveData: PartialResolveData) => {
      const originalResource: string | undefined =
        resolveData.createData.resource;

      if (!originalResource) return;

      const _rewrite = assignModule(originalResource, resolveData);
      const rewrite: { request: string | null; layer: string | null } =
        _rewrite === null
          ? { request: null, layer: null }
          : typeof _rewrite === "string"
          ? { request: _rewrite, layer: null }
          : _rewrite;

      if (rewrite.request !== null) {
        resolveData.request = rewrite.request;
        resolveData.createData.request = resolveData.createData.request.replace(
          originalResource,
          rewrite.request
        );
        resolveData.createData.resource = rewrite.request;
        resolveData.createData.userRequest = rewrite.request;
      }
      if (rewrite.layer !== null) {
        resolveData.createData.layer = rewrite.layer;
      }
    }
  );
};

const createReferenceDependencyPlugin = ({
  analysisCtx,
  rsdwFilePaths,
  type,
  chunkName,
  getVirtualPath,
}: {
  analysisCtx: RSCAnalysisCtx;
  type: "client" | "server";
  rsdwFilePaths: string[];
  chunkName: string;
  getVirtualPath: (originalPath: string) => string;
}) =>
  function ReferenceDependencyPlugin(compiler: Webpack.Compiler) {
    const pluginName = `AddArtificialDependency(${type})`;

    let rsdwFound = false;
    const rsdwPathsSet = new Set(rsdwFilePaths);

    class ManifestReferenceDependency extends webpackDependencies.ModuleDependency {
      constructor(request: string) {
        super(request);
      }

      get type(): string {
        return `${type}-reference`;
      }
    }

    compiler.hooks.thisCompilation.tap(
      pluginName,
      (compilation, { normalModuleFactory }) => {
        compilation.dependencyFactories.set(
          ManifestReferenceDependency,
          normalModuleFactory
        );
        compilation.dependencyTemplates.set(
          ManifestReferenceDependency,
          new webpackDependencies.NullDependency.Template()
        );

        tapParserJS(normalModuleFactory, pluginName, (parser) => {
          parser.hooks.program.tap(pluginName, () => {
            const mod = parser.state.module;

            if (!rsdwPathsSet.has(mod.resource)) {
              return;
            }

            rsdwFound = true;

            const allModules = Array.from(analysisCtx.modules[type].keys());

            for (const referencedModuleResource of allModules) {
              const dep = new ManifestReferenceDependency(
                // this kicks off the imports for some SSR modules, so they might not go through
                // our SSR/proxy resolution hacks in NormalModuleReplacementPlugin
                getVirtualPath(referencedModuleResource)
              );

              const block = new AsyncDependenciesBlock(
                {
                  name: chunkName,
                },
                undefined,
                dep.request
              );

              block.addDependency(dep);
              mod.addBlock(block);
            }
          });
        });
      }
    );

    compiler.hooks.make.tap(pluginName, (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: pluginName,
          stage: Compilation.PROCESS_ASSETS_STAGE_REPORT,
        },
        function () {
          if (rsdwFound === false) {
            compilation.warnings.push(
              new WebpackError(
                `React ${type} runtime was not found. Possible imports: ${JSON.stringify(
                  rsdwFilePaths,
                  null,
                  2
                )}`
              )
            );
            return;
          }
        }
      );
    });
  };

//=========================
// Misc
//=========================

const tapParserJS = (
  nmf: /* Webpack.NormalModuleFactory */ any,
  name: string,
  onParse: (parser: Webpack.javascript.JavascriptParser) => void
) => {
  nmf.hooks.parser.for("javascript/auto").tap(name, onParse);
  nmf.hooks.parser.for("javascript/dynamic").tap(name, onParse);
  nmf.hooks.parser.for("javascript/esm").tap(name, onParse);
};

const getOriginalSource = (mod: NormalModule): string => {
  const source = mod.originalSource()!;
  if (!source) {
    throw new Error(
      "Cannot get original source for module: " + JSON.stringify(mod.resource)
    );
  }
  return source.buffer().toString("utf-8");
};

const getExportsFromCtx = (
  analysisCtx: RSCAnalysisCtx,
  resource: string,
  type: "client" | "server"
) => {
  const res = analysisCtx.exports[type].get(resource);
  if (!res) {
    throw new Error(
      "Internal Error: No exports info gathered for " + JSON.stringify(resource)
    );
  }
  return res;
};

const getActionIdFromCtx = (
  analysisCtx: RSCAnalysisCtx,
  resource: string,
  exportName: string
) => {
  const moduleId =
    analysisCtx.actionModuleIds.get(resource) ??
    createServerActionModuleId(resource);
  return getServerActionReferenceIdForModuleId(moduleId, exportName);
};
