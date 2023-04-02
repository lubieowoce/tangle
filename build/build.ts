/// <reference types="../types/react-server-dom-webpack" />

import { LAYERS } from "./shared.js";

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

// not sure why TS doesn't pick this up automatically...
import ReactFlightWebpackPlugin, {
  Options as ReactFlightWebpackPluginOptions,
} from "react-server-dom-webpack/plugin";

import { runWebpack } from "./run-webpack.js";
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

const opts = {
  client: {
    entry: rel("../src/client.tsx"),
    destDir: rel("../dist/client"),
  },
  server: {
    entry: rel("../src/server.tsx"),
    ssrModule: rel("../src/server-ssr.tsx"),
    destDir: rel("../dist/server"),
  },
  moduleDir: rel("../src"),
  nodeModulesDir: rel("../node_modules"),
};

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

const moduleExtensions = [".ts", ".tsx", ".js", ".jsx", ".json"];
const MODULE_EXTENSIONS_REGEX = /\.(ts|tsx|js|jsx)$/;

const main = async () => {
  const TS_LOADER = {
    loader: "ts-loader",
    options: {
      transpileOnly: true,
    },
  };

  const shared: Configuration = {
    mode: "development",
    devtool: "source-map",
    resolve: {
      modules: [opts.moduleDir, opts.nodeModulesDir],
      extensions: moduleExtensions,
    },
    module: {
      rules: [
        {
          test: MODULE_EXTENSIONS_REGEX,
          exclude: /node_modules/,
          use: TS_LOADER,
        },
      ],
    },
  };

  // =================
  // Analysis
  // =================

  const analysisCtx = createAnalysisContext();

  console.log("performing analysis...");
  const analysisConfig: Configuration = {
    ...shared,
    entry: { main: opts.server.entry /* , layer: LAYERS.default */ },
    resolve: {
      ...shared.resolve,
    },
    module: {
      ...shared.module,
      rules: [
        {
          test: MODULE_EXTENSIONS_REGEX,
          exclude: /node_modules/,
          use: [TS_LOADER],
        },
      ],
    },
    plugins: [new RSCAnalysisPlugin({ analysisCtx })],
    target: "node16", // TODO does this matter?
    experiments: { layers: true },
    output: {
      path: path.join(opts.server.destDir, "__analysis__"),
      clean: true,
    },
  };
  await runWebpack(analysisConfig);

  console.log(analysisCtx);

  // =================
  // Client
  // =================

  const clientReferences: ReactFlightWebpackPluginOptions["clientReferences"] =
    [path.join(opts.moduleDir, "app/client-child.tsx")];
  // const clientReferences = {
  //   directory: opts.moduleDir,
  //   include: moduleExtensionsRegex,
  //   recursive: true,
  // };

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
      new ReactFlightWebpackPlugin({
        isServer: false,
        clientManifestFilename: "client-manifest.json",
        ssrManifestFilename: "ssr-manifest-intermediate.json",
        clientReferences,
        // clientReferences: opts.moduleDir,
        // clientReferences: opts.moduleDir + "/*",
      }),
    ],
    target: ["web", "es2020"],
    output: {
      path: opts.client.destDir,
      publicPath: "auto", // we don't know the public path statically
      clean: true,
    },
  };
  console.log("building client...");

  await runWebpack(clientConfig);

  const ssrManifestPath = path.join(
    opts.client.destDir,
    "ssr-manifest-intermediate.json"
  );

  const ssrManifestFromRSDW: SSRManifest = JSON.parse(
    readFileSync(ssrManifestPath, "utf-8")
  );

  // =================
  // Server
  // =================

  console.log("building server...");

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
          oneOf: [
            {
              test: /\/(react|react-dom|react-is|scheduler)\//,
              layer: LAYERS.shared,
            },
            {
              // everything imported from the main SSR module (including RSDW/client) goes into the SSR layer,
              // so that our NormalModuleReplacement function can rewrite the imports to `.__ssr__.EXT`...
              test: opts.server.ssrModule,
              layer: LAYERS.ssr,
            },
            {
              // ... and we make it transitive, so that it propagates through imports
              issuerLayer: LAYERS.ssr,
              layer: LAYERS.ssr,
            },
          ],
        },
        ...(shared.module?.rules ?? []),
      ],
    },
    plugins: [
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
      new VirtualModulesPlugin({
        ...Object.fromEntries(
          [...analysisCtx.modules.client.entries()].map(([resource, mod]) => {
            const virtualPath = getVirtualPathSSR(resource);
            const source = mod.originalSource()!.buffer().toString("utf-8");
            console.log(
              "VirtualModule (ssr):" + virtualPath,
              "\n" + source + "\n"
            );
            return [virtualPath, source];
          })
        ),
        ...Object.fromEntries(
          [...analysisCtx.modules.client.entries()].map(([resource]) => {
            const virtualPath = getVirtualPathProxy(resource);
            const source = createProxyModule({
              resource,
              exports: analysisCtx.exports.client.get(resource)!,
            });
            console.log(
              "VirtualModule (proxy): " + virtualPath,
              "\n" + source + "\n"
            );
            return [virtualPath, source];
          })
        ),
      }),
      function AddSSRDependency(compiler) {
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
      },
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
    cache: false,
  };
  await runWebpack(serverConfig);
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
    "./support/client-module-proxy-for-server"
  );

  const manifestId = getManifestId(resource);
  const generatedCode = [
    `import { createProxy } from ${JSON.stringify(CREATE_PROXY_MOD_PATH)};`,
    ``,
    // `// HACK: inject real module into the moduleGraph`,
    // `if (Math.random() < 0) import(/* webpackMode: "eager" */ ${JSON.stringify(
    //   realModuleRequest
    // )});`,
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

          const isGeneratedModule = (m: Module) =>
            m instanceof NormalModule && isVirtualPathSSR(m.resource);
          // && m.layer === LAYERS.ssr; // TODO: should we do something like this??

          compilation.chunkGroups.forEach((chunkGroup) => {
            const chunkIds = chunkGroup.chunks
              .map((c) => c.id)
              .filter((id) => id !== null) as (string | number)[];

            chunkGroup.chunks.forEach(function (chunk) {
              const chunkModules =
                compilation.chunkGraph.getChunkModulesIterable(chunk);

              Array.from(chunkModules).forEach((mod) => {
                if (!isGeneratedModule(mod)) return;
                const moduleId = compilation.chunkGraph.getModuleId(mod);
                if (!(mod instanceof NormalModule)) {
                  throw new Error(
                    `Expected generated module ${moduleId} to be a NormalModule`
                  );
                }
                // Assumption: RSDW uses file:// ids to identify SSR modules
                const currentIdInSSRManifest = pathToFileURL(
                  getOriginalPathFromVirtual(mod.resource)
                ).href;
                ssrManifestSpecifierRewrite[currentIdInSSRManifest] = {
                  moduleId,
                  chunkIds,
                };
              });
            });
          });

          const finalSSRManifest: SSRManifestActual = {};
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
              }
            }
          }
          console.log("manifest rewrites", ssrManifestSpecifierRewrite);
          console.log("final ssr manifest", finalSSRManifest);
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

main();
