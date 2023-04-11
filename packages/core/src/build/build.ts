/// <reference types="../types/react-server-dom-webpack" />
// ^ not sure why TS doesn't pick this up automatically...

import { LAYERS } from "./shared.js";

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

import ReactFlightWebpackPlugin, {
  Options as ReactFlightWebpackPluginOptions,
} from "react-server-dom-webpack/plugin";

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
} from "webpack";

import VirtualModulesPlugin from "webpack-virtual-modules";

const rel = (p: string) => path.resolve(__dirname, p);

const rsdwSSRClientImportName = "react-server-dom-webpack/client.node";
// const clientImportName = "react-server-dom-webpack/client"; // TODO: handle others?
const rsdwSSRClientFileName = require.resolve(rsdwSSRClientImportName);

console.log({ rsdwSSRClientFileName });

const getVirtualPathSSR = (p: string) =>
  p.replace(MODULE_EXTENSIONS_REGEX, ".__ssr__.$1"); // FIXME: kinda hacky... idk

const isVirtualPathSSR = (p: string) => p.match(/\.__ssr__\.(.+)$/) !== null; // FIXME: use real module extensions

const getVirtualPathProxy = (p: string) =>
  p.replace(MODULE_EXTENSIONS_REGEX, ".__proxy__.$1"); // FIXME: kinda hacky... idk

const getOriginalPathFromVirtual = (p: string) =>
  p.replace(/\.(__ssr__|__proxy__)\./, ".");

const moduleExtensions = [".ts", ".tsx", ".js", ".jsx"];
const MODULE_EXTENSIONS_REGEX = /\.(ts|tsx|js|jsx)$/;
const REACT_MODULES_REGEX =
  /\/(react|react-server|react-dom|react-is|scheduler)\//;

export const build = async ({
  appPath,
  serverRoot,
  paths: pathsFile,
}: {
  appPath: string;
  serverRoot: string;
  paths: string;
}) => {
  const DIST_PATH = path.join(appPath, "dist");
  const INTERNAL_CODE = rel("../runtime");

  const opts = {
    user: {
      rootComponentModule: path.resolve(appPath, serverRoot),
      pathsModule: path.resolve(appPath, pathsFile),
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
      rootComponentModule: path.join(INTERNAL_CODE, "user/server-root.js"),
      pathsModule: path.join(INTERNAL_CODE, "user/paths.js"),
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
      extensions: moduleExtensions,
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

  const sharedPlugins = (): Configuration["plugins"] & unknown[] => {
    return [
      new VirtualModulesPlugin({
        [opts.server.rootComponentModule]: [
          `import ServerRoot from ${JSON.stringify(
            opts.user.rootComponentModule
          )};`,
          `export default ServerRoot;`,
        ].join("\n"),
        [opts.server.pathsModule]: [
          `export { pathToParams, paramsToPath } from ${JSON.stringify(
            opts.user.pathsModule
          )};`,
        ].join("\n"),
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

  console.log(analysisCtx);

  // =================
  // Client
  // =================

  const clientReferences: ReactFlightWebpackPluginOptions["clientReferences"] =
    [...analysisCtx.modules.client.keys()];

  const INTERMEDIATE_SSR_MANIFEST = "ssr-manifest-intermediate.json";

  const clientConfig: Configuration = {
    ...shared,
    entry: opts.client.entry,
    resolve: {
      ...shared.resolve,
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

  const serverImportConditions = ["node", "import", "require"];

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
              test: REACT_MODULES_REGEX,
              layer: LAYERS.shared,
            },
            {
              test: opts.server.rscModule,
              layer: LAYERS.rsc,
            },
            {
              // everything imported from the main SSR module (including RSDW/client) goes into the SSR layer,
              // so that our NormalModuleReplacement function can rewrite the imports to `.__ssr__.EXT`...
              test: opts.server.ssrModule,
              layer: LAYERS.ssr,
            },
            {
              // ... and we make it transitive, so that it propagates through imports.
              // note that this may result in duplicating some shared modules.
              // TODO: figure out if we can solve that somehow
              issuerLayer: LAYERS.ssr,
              layer: LAYERS.ssr,
            },
          ],
        },
        {
          // assign import conditions per layer
          oneOf: [
            {
              issuerLayer: LAYERS.shared,
              resolve: {
                conditionNames: serverImportConditions,
              },
            },
            {
              issuerLayer: LAYERS.ssr,
              resolve: {
                conditionNames: serverImportConditions,
              },
            },
            {
              issuerLayer: LAYERS.rsc,
              resolve: {
                conditionNames: ["react-server", ...serverImportConditions],
              },
            },
          ],
        },
        ...(shared.module?.rules ?? []),
      ],
    },
    plugins: [
      ...sharedPlugins(),
      ...moduleReplacements(analysisCtx),
      createSSRDependencyPlugin(analysisCtx),
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
    `import { createProxy } from ${JSON.stringify(CREATE_PROXY_MOD_PATH)};`,
    ``,
    `const proxy = /*@__PURE__*/ createProxy(${JSON.stringify(manifestId)});`,
  ];
  const proxyExpr = (exportName: string) =>
    `(/*@__PURE__*/ proxy[${JSON.stringify(exportName)}])`;

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

type SSRManifest = {
  [id: string]: {
    [exportName: string]: { specifier: string | number; name: string };
  };
};

type SSRManifestActual = {
  [id: string]: {
    [exportName: string]: {
      id: string | number;
      name: string;
      chunks: (string | number)[];
      async: boolean;
    };
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

const tapParserJS = (
  nmf: /* Webpack.NormalModuleFactory */ any,
  name: string,
  onParse: (parser: Webpack.javascript.JavascriptParser) => void
) => {
  nmf.hooks.parser.for("javascript/auto").tap(name, onParse);
  nmf.hooks.parser.for("javascript/dynamic").tap(name, onParse);
  nmf.hooks.parser.for("javascript/esm").tap(name, onParse);
};

type RSCPluginOptions = {
  // ctx: Ctx;
  ssrManifestFromClient: SSRManifest;
  ssrManifestFilename: string;
};

class RSCServerPlugin {
  static pluginName = "RSCServerPlugin";

  constructor(public options: RSCPluginOptions) {}

  apply(compiler: Compiler) {
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
              moduleId: string | number;
              chunkIds: (string | number)[];
            };
          };
          const ssrManifestSpecifierRewrite: Rewrites = {};

          const isGeneratedModule = (mod: Module) =>
            mod instanceof NormalModule && isVirtualPathSSR(mod.resource);
          // && m.layer === LAYERS.ssr; // TODO: should we do something like this??

          compilation.chunkGroups.forEach((chunkGroup) => {
            const chunkIds = chunkGroup.chunks
              .map((c) => c.id)
              .filter((id) => id !== null) as (string | number)[];

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
                moduleId,
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
                toRewrite.delete(exportInfo.specifier + "");
              }
            }
          }

          console.log("manifest rewrites", ssrManifestSpecifierRewrite);
          console.log("final ssr manifest", finalSSRManifest);

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
      console.log("VirtualModule (ssr):" + virtualPath, "\n" + source + "\n");
      virtualModules[virtualPath] = source;
    }
    {
      const virtualPath = getVirtualPathProxy(resource);
      const source = createProxyModule({
        resource,
        exports: analysisCtx.exports.client.get(resource)!,
      });
      console.log(
        "VirtualModule (proxy): " + virtualPath,
        "\n" + source + "\n"
      );
      virtualModules[virtualPath] = source;
    }
  }

  return [
    new VirtualModulesPlugin(virtualModules),
    new NormalModuleReplacementPlugin(
      MODULE_EXTENSIONS_REGEX,
      (resolveData /*: ResolveData */) => {
        const originalResource = resolveData.createData.resource;

        if (analysisCtx.getTypeForResource(originalResource) === "client") {
          // console.log("replacement", resolveData);
          const isSSR = resolveData.contextInfo.issuerLayer === LAYERS.ssr;
          const newResource = isSSR
            ? getVirtualPathSSR(originalResource)
            : getVirtualPathProxy(originalResource);

          const label = `(${isSSR ? "ssr" : "proxy"})`;
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

const createSSRDependencyPlugin = (analysisCtx: RSCAnalysisCtx) =>
  function AddSSRDependencyPlugin(compiler: Webpack.Compiler) {
    const pluginName = "AddSSRDependency";
    const SSR_CHUNK_NAME = "ssr[index]";

    let clientFileNameFound = false;

    const dependencies = Webpack.dependencies;

    class ClientReferenceDependency extends dependencies.ModuleDependency {
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
          new dependencies.NullDependency.Template()
        );

        tapParserJS(normalModuleFactory, pluginName, (parser) => {
          parser.hooks.program.tap(pluginName, () => {
            const module = parser.state.module;

            if (module.resource !== rsdwSSRClientFileName) {
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
                `Client runtime at ${rsdwSSRClientImportName} was not found.`
              )
            );
            return;
          }
        }
      );
    });
  };
