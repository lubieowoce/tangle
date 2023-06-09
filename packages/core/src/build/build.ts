/// <reference types="../types/react-server-dom-webpack" />

import { LAYERS } from "./shared";

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

import ReactFlightWebpackPlugin, {
  Options as ReactFlightWebpackPluginOptions,
} from "react-server-dom-webpack/plugin";

import type { ClientReferenceMetadata } from "react-server-dom-webpack/src/ReactFlightClientWebpackBundlerConfig";

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

import VirtualModulesPlugin from "webpack-virtual-modules";
import { MODULE_EXTENSIONS_LIST, MODULE_EXTENSIONS_REGEX } from "./common";
import { findRoutes } from "./routes/find-routes";
import { stringLiteral } from "./codegen-helpers";
import {
  generateRoutesExport,
  normalizeRoutes,
} from "./routes/generate-routes";

import { CachedInputFileSystem, ResolverFactory } from "enhanced-resolve";
import fs from "fs";

const rel = (p: string) => path.resolve(__dirname, p);

const getVirtualPathSSR = (p: string) =>
  p.replace(MODULE_EXTENSIONS_REGEX, ".__ssr__.$1"); // FIXME: kinda hacky... idk

const isVirtualPathSSR = (p: string) => p.match(/\.__ssr__\.(.+)$/) !== null; // FIXME: use real module extensions

const getVirtualPathProxy = (p: string) =>
  p.replace(MODULE_EXTENSIONS_REGEX, ".__proxy__.$1"); // FIXME: kinda hacky... idk

const getOriginalPathFromVirtual = (p: string) =>
  p.replace(/\.(__ssr__|__proxy__)\./, ".");

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

export const build = async ({
  appPath,
}: {
  appPath: string;
}): Promise<BuildReturn> => {
  const DIST_PATH = path.join(appPath, "dist");
  const INTERNAL_CODE = rel("../runtime");

  const opts = {
    user: {
      routesDir: path.resolve(appPath, "src/routes"),
      tsConfig: path.resolve(appPath, "tsconfig.json"),
    },
    client: {
      entry: path.join(INTERNAL_CODE, "client.js"),
      destDir: path.join(DIST_PATH, "client"),
    },
    server: {
      entry: path.join(INTERNAL_CODE, "server.js"),
      ssrModule: path.join(INTERNAL_CODE, "server-ssr.js"),
      rscModule: path.join(INTERNAL_CODE, "server-rsc.js"),
      genratedRoutesModule: path.join(INTERNAL_CODE, "generated/routes.js"),
      destDir: path.join(DIST_PATH, "server"),
    },
    moduleDir: INTERNAL_CODE,
  };

  console.log(opts);

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
    findRoutes(opts.user.routesDir, opts.user.routesDir)
  );

  const sharedPlugins = (): Configuration["plugins"] & unknown[] => {
    const teeLog = <T>(x: T): T => {
      LOG_OPTIONS.generatedCode && console.log(x);
      return x;
    };
    return [
      new VirtualModulesPlugin({
        [opts.server.genratedRoutesModule]: teeLog(
          `export default ${generateRoutesExport(parsedRoutes)};`
        ),
      }),
    ];
  };

  // =================
  // Analysis
  // =================

  const analysisCtx = createAnalysisContext();

  console.log("performing analysis...");
  const analysisConfig: Configuration = {
    ...shared,
    mode: BUILD_MODE,
    devtool: false,
    entry: { main: opts.server.entry },
    resolve: {
      ...shared.resolve,
      // TODO: do we need react aliases here?
      // could we be missing some import conditions or something?
    },
    module: {
      ...shared.module,
      // rules: [
      //   {
      //     test: MODULE_EXTENSIONS_REGEX,
      //     exclude: /node_modules/,
      //     use: [TS_LOADER],
      //   },
      // ],
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
  };
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

  const clientConfig: Configuration = {
    ...shared,
    entry: opts.client.entry,
    resolve: {
      ...shared.resolve,
      alias: reactResolutionsClient.aliases,
    },
    module: {
      ...shared.module,
    },
    plugins: [
      ...sharedPlugins(),
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
  };
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

  const serverConfig: Configuration = {
    ...shared,
    entry: { main: opts.server.entry /* ssr: virtualPath("ssr-entry.js") */ },
    resolve: {
      ...shared.resolve,
    },
    module: {
      ...shared.module,
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
      ...moduleReplacements(analysisCtx),
      createSSRDependencyPlugin({
        analysisCtx,
        rsdwSSRClientFilePaths: RSDW_CLIENT_SPECIFIERS.map(
          (specifier) => reactResolutionsServer.ssr.resolutions[specifier]
        ),
      }),
      new RSCServerPlugin({
        // ctx,
        ssrManifestFromClient: ssrManifestFromRSDW,
        ssrManifestFilename: "ssr-manifest.json",
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
  };
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

const RSDW_CLIENT_SPECIFIERS = [
  "react-server-dom-webpack/client",
  "react-server-dom-webpack/client.node",
  "react-server-dom-webpack/client.edge",
  "react-server-dom-webpack/client.browser",
] as const;

const REACT_PACKAGES = [
  "react",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "react-dom",
  "react-dom/client",
  "react-dom/server",
  "react-server-dom-webpack/server",
  "react-server-dom-webpack/server.node",
  "react-server-dom-webpack/server.edge",
  "react-server-dom-webpack/server.browser",
  ...RSDW_CLIENT_SPECIFIERS,
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

//=========================
// Module proxy codegen
//=========================

const getManifestId = (resource: string) => pathToFileURL(resource);

const createProxyModule = ({
  resource,
  exports,
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
  // ctx: Ctx;
  ssrManifestFromClient: SSRManifest;
  ssrManifestFilename: string;
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

          const isGeneratedModule = (mod: Module) =>
            mod instanceof NormalModule && isVirtualPathSSR(mod.resource);
          // && m.layer === LAYERS.ssr; // TODO: should we do something like this??

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

              if (!isGeneratedModule(mod)) return;
              const moduleId =
                parentModuleId ?? compilation.chunkGraph.getModuleId(mod);
              if (!(mod instanceof NormalModule)) {
                throw new Error(
                  `Expected generated module ${moduleId} to be a NormalModule`
                );
              }
              // Assumption: RSDW uses file:// ids to identify SSR modules
              const currentIdInSSRManifest = getManifestId(
                getOriginalPathFromVirtual(mod.resource)
              ).href;
              ssrManifestSpecifierRewrite[currentIdInSSRManifest] = {
                moduleId: ensureString(moduleId),
                chunkIds,
              };
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

          const ssrOutput = JSON.stringify(finalSSRManifest, null, 2);
          compilation.emitAsset(
            this.options.ssrManifestFilename,
            new Webpack.sources.RawSource(ssrOutput, false)
          );
        }
      );
    });
  }
}

function moduleReplacements(analysisCtx: RSCAnalysisCtx) {
  // TODO: use .apply() instead of just putting these in the plugin array

  const virtualModules: Record<string, string> = {};
  for (const [resource, mod] of analysisCtx.modules.client.entries()) {
    {
      const virtualPath = getVirtualPathSSR(resource);
      const source = mod.originalSource()!.buffer().toString("utf-8");
      if (LOG_OPTIONS.generatedCode) {
        console.log("VirtualModule (ssr):" + virtualPath, "\n" + source + "\n");
      }
      virtualModules[virtualPath] = source;
    }
    {
      const virtualPath = getVirtualPathProxy(resource);
      const source = createProxyModule({
        resource,
        exports: analysisCtx.exports.client.get(resource)!,
      });
      if (LOG_OPTIONS.generatedCode) {
        console.log(
          "VirtualModule (proxy): " + virtualPath,
          "\n" + source + "\n"
        );
      }
      virtualModules[virtualPath] = source;
    }
  }

  return [
    new VirtualModulesPlugin(virtualModules),
    new NormalModuleReplacementPlugin(
      MODULE_EXTENSIONS_REGEX,
      (resolveData /*: ResolveData */) => {
        const originalResource: string | undefined =
          resolveData.createData.resource;

        if (!originalResource) return;

        if (analysisCtx.getTypeForResource(originalResource) === "client") {
          // console.log("replacement", resolveData);
          const isSSR = resolveData.contextInfo.issuerLayer === LAYERS.ssr;
          const newResource = isSSR
            ? getVirtualPathSSR(originalResource)
            : getVirtualPathProxy(originalResource);

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
            // console.log(resolveData);
            console.log();
          }

          resolveData.request = newResource;
          resolveData.createData.request =
            resolveData.createData.request.replace(
              originalResource,
              newResource
            );
          resolveData.createData.resource = newResource;
          resolveData.createData.userRequest = newResource;
          // console.log(resolveData);
        }
      }
    ),
  ];
}

const createSSRDependencyPlugin = ({
  analysisCtx,
  rsdwSSRClientFilePaths,
}: {
  analysisCtx: RSCAnalysisCtx;
  rsdwSSRClientFilePaths: string[];
}) =>
  function AddSSRDependencyPlugin(compiler: Webpack.Compiler) {
    const pluginName = "AddSSRDependency";
    const SSR_CHUNK_NAME = "ssr[index]";

    let clientFileNameFound = false;
    const rsdwSSRClientFilePathsSet = new Set(rsdwSSRClientFilePaths);

    class ClientReferenceDependency extends webpackDependencies.ModuleDependency {
      constructor(request: string) {
        super(request);
      }

      get type(): string {
        return "client-reference";
      }
    }

    compiler.hooks.thisCompilation.tap(
      pluginName,
      (compilation, { normalModuleFactory }) => {
        compilation.dependencyFactories.set(
          ClientReferenceDependency,
          normalModuleFactory
        );
        compilation.dependencyTemplates.set(
          ClientReferenceDependency,
          new webpackDependencies.NullDependency.Template()
        );

        tapParserJS(normalModuleFactory, pluginName, (parser) => {
          parser.hooks.program.tap(pluginName, () => {
            const module = parser.state.module;

            if (!rsdwSSRClientFilePathsSet.has(module.resource)) {
              return;
            }

            clientFileNameFound = true;

            for (const [
              clientModuleResource,
            ] of analysisCtx.modules.client.entries()) {
              const dep = new ClientReferenceDependency(
                // this kicks off the imports for some SSR modules, so they might not go through
                // our SSR/proxy resolution hacks in NormalModuleReplacementPlugin
                getVirtualPathSSR(clientModuleResource)
              );

              const block = new AsyncDependenciesBlock(
                {
                  name: SSR_CHUNK_NAME,
                },
                undefined,
                dep.request
              );

              block.addDependency(dep);
              module.addBlock(block);
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
          if (clientFileNameFound === false) {
            compilation.warnings.push(
              new WebpackError(
                `React client runtime was not found. Possible imports: ${JSON.stringify(
                  rsdwSSRClientFilePaths,
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
