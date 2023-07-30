/// <reference types="../types/react-server-dom-webpack" />

import { LAYERS, TangleConfig } from "./shared";

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";
import crypto from "node:crypto";

import ReactFlightWebpackPlugin, {
  Options as ReactFlightWebpackPluginOptions,
} from "react-server-dom-webpack/plugin";

import type {
  ServerManifest,
  ClientReferenceMetadata,
} from "react-server-dom-webpack/server";

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
          use: TS_LOADER,
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
  const analysisConfig: Configuration = withUserWebpackConfig(
    mergeWebpackConfigs(shared, {
      mode: BUILD_MODE,
      devtool: false,
      entry: { main: opts.server.entry },
      // resolve: {
      //   ...shared.resolve,
      //   // TODO: do we need react aliases here?
      //   // could we be missing some import conditions or something?
      // },
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
  await runWebpack(analysisConfig);

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

  const ssrManifestFromRSDW: SSRManifest = JSON.parse(
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
      .map(([specifier, resolved]) =>
        specifier.startsWith("react-server-dom-webpack")
          ? undefined
          : ([`${specifier}$`, resolved] as const)
      )
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
  const CREATE_PROXY_MOD_PATH = path.resolve(
    __dirname,
    "../runtime/support/client-module-proxy-for-server"
  );

  const manifestId = getManifestId(resource);
  const generatedCode = [
    `import { createProxy } from ${stringLiteral(CREATE_PROXY_MOD_PATH)};`,
    ``,
    `const proxy = /*@__PURE__*/ createProxy(${JSON.stringify(manifestId)});`,
  ];
  const proxyExpr = (exportName: string) =>
    `(/*@__PURE__*/ proxy[${stringLiteral(exportName)}])`;

  for (const exportName of modExports) {
    const expr = proxyExpr(exportName);
    if (exportName === "default") {
      generatedCode.push(`export default ${expr}`);
    } else {
      generatedCode.push(`export const ${exportName} = ${expr}`);
    }
  }
  return generatedCode.join("\n");
};

//=================================
// Server reference codegen
//=================================

const getHash = (s: string) =>
  crypto.createHash("sha1").update(s).digest().toString("hex");

// TODO: this is vulnerable to version drift (filename might stay the same, but hash would change)
const getServerActionId = (resource: string, name: string) =>
  name + "-" + getHash(pathToFileURL(resource).href);

const createProxyOfServerModule = ({
  resource,
  exports,
}: {
  resource: string;
  exports: string[];
}) => {
  const CREATE_PROXY_MOD_PATH = path.resolve(
    __dirname,
    "../runtime/support/server-action-proxy-for-client"
  );

  const getActionId = (name: string) => getServerActionId(resource, name);

  const generatedCode = [
    `import { createServerActionProxy } from ${stringLiteral(
      CREATE_PROXY_MOD_PATH
    )};`,
    ``,
  ];

  const proxyExpr = (exportName: string) =>
    `(/*@__PURE__*/ createServerActionProxy(${stringLiteral(
      getActionId(exportName)
    )}))`;

  for (const exportName of exports) {
    const expr = proxyExpr(exportName);
    if (exportName === "default") {
      generatedCode.push(`export default ${expr}`);
    } else {
      generatedCode.push(`export const ${exportName} = ${expr}`);
    }
  }
  return generatedCode.join("\n");
};

const enhanceUseServerModuleForServer = ({
  resource,
  originalSource,
  exports,
}: {
  resource: string;
  originalSource: string;
  exports: string[];
}) => {
  if (exports.includes("default")) {
    // if the export is a default export, we can't just use its name
    // in the addServerActionMetadata call.
    // we'd need to do some kind of babel transform to support that
    throw new Error(
      `Found default export in \n  ${originalSource}\n` +
        "Default exports from server actions are not supported yet. Please use a named export."
    );
  }
  const METADATA_MOD_PATH = path.resolve(
    __dirname,
    "../runtime/support/add-server-action-metadata"
  );

  const getActionId = (name: string) => getServerActionId(resource, name);

  const prefix = [
    `import { addServerActionMetadata } from ${stringLiteral(
      METADATA_MOD_PATH
    )};`,
    ``,
  ];

  const generatedCode: string[] = [];

  const metaStmt = (exportName: string) =>
    [
      `addServerActionMetadata(`,
      `  ${stringLiteral(getActionId(exportName))},`,
      `  (${exportName})`,
      `);`,
    ].join("\n");

  for (const exportName of exports) {
    const stmt = metaStmt(exportName);
    generatedCode.push(stmt);
  }

  return [...prefix, originalSource, ...generatedCode].join("\n");
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

function getActionHandlersModuleSource(analysisCtx: {
  modules: {
    client: Map<string, Webpack.NormalModule>;
    server: Map<string, Webpack.NormalModule>;
  };
  exports: { client: Map<string, string[]>; server: Map<string, string[]> };
  getTypeForModule(mod: Module): "client" | "server" | null;
  getTypeForResource(resource: string): "client" | "server" | null;
}) {
  let id = 0;
  const code: string[] = [];
  const handlersById: Record<string, string> = {};

  for (const [resource] of analysisCtx.modules.server.entries()) {
    const modExports = analysisCtx.exports.server.get(resource)!;
    const modImportedName = `mod${id++}`;
    code.push(
      `import * as ${modImportedName} from ${stringLiteral(resource)};`
    );

    for (const exportName of modExports) {
      const id = getServerActionId(resource, exportName);
      const expr = `${modImportedName}.${exportName}`;
      handlersById[id] = expr;
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
      ? enhanceUseServerModuleForServer({
          resource,
          exports: modExports,
          originalSource: getOriginalSource(mod),
        })
      : createProxyOfServerModule({
          resource,
          exports: modExports,
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

type SSRManifest = {
  [id: string]: {
    [exportName: string]: { specifier: string | number; name: string };
  };
};

type SSRManifestActual = {
  [id: string]: {
    [exportName: string]: ClientReferenceMetadata;
  };
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
            const isClientModule = program.body.some((node) => {
              return (
                node.type === "ExpressionStatement" &&
                node.expression.type === "Literal" &&
                node.expression.value === "use client"
              );
            });
            const isServerModule = program.body.some((node) => {
              return (
                node.type === "ExpressionStatement" &&
                node.expression.type === "Literal" &&
                node.expression.value === "use server"
              );
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
                const exports = compilation.moduleGraph.getExportsInfo(module);
                this.options.analysisCtx.exports[type].set(
                  module.resource,
                  [...exports.orderedExports].map((exp) => exp.name)
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
  ssrManifestFromClient: SSRManifest;
  ssrManifestFilename: string;
  serverActionsManifestFilename: string;
};

class RSCServerPlugin {
  static pluginName = "RSCServerPlugin";

  constructor(public options: RSCPluginOptions) {}

  apply(compiler: Compiler) {
    const ensureString = (id: string | number): string => id + "";

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
              const { analysisCtx } = this.options;
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
                  const actionId = getServerActionId(
                    moduleInfo.originalResource,
                    exportName
                  );
                  serverActionsManifest[actionId] = {
                    id: moduleId,
                    async: false,
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

          const finalSSRManifest: SSRManifestActual = {};
          const toRewrite = new Set(Object.keys(ssrManifestSpecifierRewrite));
          for (const [clientModuleId, moduleExportMap] of Object.entries(
            this.options.ssrManifestFromClient
          )) {
            for (const [exportName, exportInfo] of Object.entries(
              moduleExportMap
            )) {
              if (exportInfo.specifier in ssrManifestSpecifierRewrite) {
                const rewriteInfo =
                  ssrManifestSpecifierRewrite[exportInfo.specifier];
                const newExportInfo = {
                  name: exportName,
                  id: rewriteInfo.moduleId,
                  chunks: rewriteInfo.chunkIds, // TODO: these are server-side chunks, is this right...?
                  async: true, // TODO
                };
                finalSSRManifest[clientModuleId] ||= {};
                finalSSRManifest[clientModuleId][exportName] = newExportInfo;
                toRewrite.delete(ensureString(exportInfo.specifier));
              }
            }
          }

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
      const virtualPath = getVirtualPathRSC(resource);
      const source = enhanceUseServerModuleForServer({
        resource,
        exports: getExportsFromCtx(analysisCtx, resource, "server"),
        originalSource: getOriginalSource(mod),
      });
      if (LOG_OPTIONS.generatedCode) {
        console.log("VirtualModule (rsc):" + virtualPath, "\n" + source + "\n");
      }
      virtualModules[virtualPath] = source;
    }
  }

  return [
    new VirtualModulesPlugin(virtualModules),
    createImportRewritePlugin(
      (
        originalResource: string,
        resolveData: PartialResolveData
      ): string | null => {
        const type = analysisCtx.getTypeForResource(originalResource);
        if (type !== "client" && type !== "server") {
          return null;
        }

        const isSSR = resolveData.contextInfo.issuerLayer === LAYERS.ssr;

        const newResource = isSSR
          ? getVirtualPathSSR(originalResource)
          : getVirtualPathRSC(originalResource);
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
        return newResource;
      }
    ),
  ];
}

type PartialResolveData = {
  request: string | undefined;
  contextInfo: {
    laer?: string;
    issuerLayer?: string;
    issuer: string;
  };
  createData: {
    request: string;
    resource: string;
    userRequest: string;
  };
};

const createImportRewritePlugin = (
  assignModule: (
    originalResource: string,
    resolveData: PartialResolveData
  ) => string | null
) => {
  return new NormalModuleReplacementPlugin(
    MODULE_EXTENSIONS_REGEX,
    (resolveData: PartialResolveData) => {
      const originalResource: string | undefined =
        resolveData.createData.resource;

      if (!originalResource) return;

      const newResource = assignModule(originalResource, resolveData);

      if (newResource !== null) {
        resolveData.request = newResource;
        resolveData.createData.request = resolveData.createData.request.replace(
          originalResource,
          newResource
        );
        resolveData.createData.resource = newResource;
        resolveData.createData.userRequest = newResource;
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
