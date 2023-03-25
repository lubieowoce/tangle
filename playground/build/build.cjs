//@ts-check

const DependencyTemplate = require("webpack/lib/DependencyTemplate.js");

const { pathToFileURL } = require("node:url");
const { promisify } = require("node:util");

const path = require("node:path");
const { runWebpack } = require("../../build/run-webpack.cjs");
const { createContext } = require("../../build/loaders/shared-context.cjs");
const {
  Module,
  NormalModule,
  ExternalModule,
  dependencies,
  AsyncDependenciesBlock,
  Compilation,
  sources,
} = require("webpack");
const HarmonyImportSideEffectDependency = require("webpack/lib/dependencies/HarmonyImportSideEffectDependency");
const ModuleDependencyTemplateAsId = require("webpack/lib/dependencies/ModuleDependencyTemplateAsId");
const { ModuleDependency } = dependencies;

const rel = (/** @type {string} */ p) => path.resolve(__dirname, p);

const opts = {
  // client: {
  //   entry: rel("../src/client.tsx"),
  //   destDir: rel("../dist/client"),
  // },
  server: {
    entry: rel("../test/index.ts"),
    destDir: rel("../dist/server"),
  },
  moduleDir: rel("../src"),
  nodeModulesDir: rel("../../../node_modules"),
};

const CLIENT_COMPONENT_FOR_RSC_LOADER = require.resolve(
  path.resolve(__dirname, "../../build/loaders/client-component-for-rsc.cjs")
);

const CLIENT_COMPONENT_FOR_SSR_LOADER_ID = "client-component-for-ssr";

const CLIENT_COMPONENT_FOR_SSR_LOADER = require.resolve(
  path.resolve(
    __dirname,
    `../../build/loaders/${CLIENT_COMPONENT_FOR_SSR_LOADER_ID}.cjs`
  )
);

/**
 * @typedef {import('webpack').Configuration} Configuration
 */

/** @typedef {import('../../build/loaders/types.cjs').Ctx} Ctx */

const main = async () => {
  const moduleExtensions = [".ts", ".tsx", ".js", ".jsx", ".json"];
  // const moduleExtensionsRegex = /(ts|tsx|.js|jsx|json)$/;

  /** @type {Configuration} */
  const shared = {
    mode: "development",
    devtool: "source-map",
    resolve: {
      modules: [opts.moduleDir, opts.nodeModulesDir],
      extensions: moduleExtensions,
    },
    module: {
      rules: [
        {
          test: /\.(t|j)sx?$/,
          exclude: /node_modules/,
          use: {
            loader: "ts-loader",
            options: {
              transpileOnly: true,
            },
          },
        },
      ],
    },
  };

  // /** @type {import('react-server-dom-webpack/plugin').Options['clientReferences']} */
  // const clientReferences = [path.join(opts.moduleDir, "app/client-child.tsx")];
  // // const clientReferences = {
  // //   directory: opts.moduleDir,
  // //   include: moduleExtensionsRegex,
  // //   recursive: true,
  // // };

  // /** @type {Configuration} */
  // const clientConfig = {
  //   ...shared,
  //   entry: opts.client.entry,
  //   resolve: {
  //     ...shared.resolve,
  //   },
  //   module: {
  //     ...shared.module,
  //   },
  //   plugins: [
  //     new ReactFlightWebpackPlugin({
  //       isServer: false,
  //       clientManifestFilename: "client-manifest.json",
  //       ssrManifestFilename: "ssr-manifest.json",
  //       clientReferences,
  //       // clientReferences: opts.moduleDir,
  //       // clientReferences: opts.moduleDir + "/*",
  //     }),
  //   ],
  //   target: ["web", "es2020"],
  //   output: {
  //     path: opts.client.destDir,
  //     publicPath: "auto", // we don't know the public path statically
  //     clean: true,
  //   },
  // };
  // console.log("building client...");

  // await runWebpack(clientConfig);

  const ctx = createContext();

  console.log("building server...");
  /** @type {Configuration} */
  const serverConfig = {
    ...shared,
    entry: opts.server.entry,
    resolve: {
      ...shared.resolve,
    },
    module: {
      ...shared.module,
      rules: [
        {
          test: /\.(t|j)sx?$/,
          exclude: /node_modules/,
          use: [
            {
              // runs last
              loader: CLIENT_COMPONENT_FOR_RSC_LOADER,
              options: {
                ctx,
              },
            },
            {
              loader: "ts-loader",
              options: {
                transpileOnly: true,
              },
            },
          ],
        },
      ],
    },
    plugins: [new RSCPlugin({ ctx })],
    target: "node16",
    output: {
      path: opts.server.destDir,
      clean: true,
    },
    experiments: {
      layers: true,
    },
  };
  await runWebpack(serverConfig);
};

/** @typedef {import('webpack').Compiler} Compiler */

/** @typedef {{ ctx: Ctx }} RSCPluginOptions */
class RSCPlugin {
  static pluginName = "RSCPlugin";

  /**
   * @param {RSCPluginOptions} options
   */
  constructor(options) {
    /** @type {RSCPluginOptions} */
    this.options = options;
    /** @type {string} */
    this.clientManifestFilename = "client-manifest.json";
    /** @type {string} */
    this.ssrManifestFilename = "ssr-manifest.json";
  }

  /**
   * @param {Compiler} compiler
   */
  apply(compiler) {
    compiler.hooks.thisCompilation.tap(
      RSCPlugin.pluginName,
      (compilation, { normalModuleFactory }) => {
        compilation.dependencyFactories.set(
          InjectedImportDependency,
          normalModuleFactory
        );
        compilation.dependencyTemplates.set(
          InjectedImportDependency,
          new InjectedImportDependency.Template()
          // new dependencies.NullDependency.Template()
          // new dependencies.HarmonyImportDependency.Template()
          // @ts-ignore
          // new HarmonyImportSideEffectDependency.Template()
        );

        // compilation.hooks.finishModules.tapPromise(
        compilation.hooks.optimizeDependencies.tap(
          RSCPlugin.pluginName,
          (finishedModsIter) => {
            const finishedMods = [...finishedModsIter];
            console.log("compilation > finishModules");
            // console.log(this.options.ctx.clientModules);

            // FIXME: dumb
            const entryMod = finishedMods.find(
              (m) => "resource" in m && m.resource === opts.server.entry
            );
            if (!entryMod) {
              throw new Error("Entry module not found");
            }

            // console.log("entry", entryMod);

            let i = 0;

            for (const clientModInfo of this.options.ctx.clientModules) {
              const proxyMod = finishedMods.find(
                (m) =>
                  m instanceof NormalModule &&
                  m.resource === clientModInfo.resourcePath
              );
              if (!proxyMod) {
                throw new Error(
                  `Cannot find module for path ${clientModInfo.resourcePath}`
                );
              }

              const realMod =
                /** @type {NormalModule | undefined} */
                (
                  finishedMods.find(
                    (m) =>
                      m instanceof NormalModule &&
                      m.request.startsWith(CLIENT_COMPONENT_FOR_SSR_LOADER)
                    // !!m.loaders.find(
                    //   (loaderItem) =>
                    //     loaderItem.loader === CLIENT_COMPONENT_FOR_SSR_LOADER_ID
                    // )
                  )
                );

              if (!realMod) {
                throw new Error("SSR module not found");
              }

              // messing around to see if i can figure out how to patch this stupid graph
              const depResources = (m) =>
                [
                  ...compilation.moduleGraph
                    .getOutgoingConnectionsByModule(m)
                    ?.keys(),
                ].map((m) => m.resource);

              console.log(
                `\n\n\n======================\nAdding a dependency on '${realMod.request}' to the entry...`,
                entryMod.context || compiler.context
              );
              const dep = new InjectedImportDependency(
                "!" + realMod.request
                // 1000 + i
              );
              dep.loc = { name: "generated import", index: 0 };
              // const res = await promisify((cb) =>
              //   compilation.addModuleChain(
              //     entryMod.context || compiler.context,
              //     dep,
              //     cb
              //   )
              // )();
              entryMod.addDependency(dep);

              // console.log("entry dependencies before", entryMod.dependencies);
              // const  =
              compilation.processModuleDependenciesNonRecursive(entryMod);
              // const res = await new Promise((resolve, reject) => {
              //   compilation.processModuleDependencies(entryMod, (err, res) => {
              //     if (err) return reject(err);
              //     return resolve(res);
              //   });
              // });
              console.log("new module?" /* res */);
              console.log("entry dependencies after", entryMod.dependencies);

              console.log("outgoingConnections", depResources(entryMod));

              // // // idk if this is right...
              // compilation.moduleGraph.setResolvedModule(entryMod, dep, realMod);
              // console.log({
              //   mgmEntry: compilation.moduleGraph._moduleMap.get(entryMod),
              //   mgmTarget: compilation.moduleGraph._moduleMap.get(realMod),
              // });
              // console.log(
              //   "connection",
              //   compilation.moduleGraph.getConnection(dep)
              // );
              // compilation.moduleGraph.updateModule(dep, realMod);

              // console.log(
              //   "resolved module for dep",
              //   compilation.moduleGraph.getResolvedModule(dep)
              // );

              i++;
            }
            // const rebuiltEntry = await promisify((cb) =>
            //   compilation.rebuildModule(entryMod, cb)
            // )();
            // console.log("rebuild", rebuiltEntry);
          }
        );
      }
    );

    const _this = this;

    compiler.hooks.make.tap(RSCPlugin.pluginName, (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: RSCPlugin.pluginName,
          stage: Compilation.PROCESS_ASSETS_STAGE_REPORT,
        },
        function () {
          // if (clientFileNameFound === false) {
          //   compilation.warnings.push(
          //     new WebpackError(
          //       `Client runtime at ${clientImportName} was not found. React Server Components module map file ${_this.clientManifestFilename} was not created.`
          //     )
          //   );
          //   return;
          // }

          /** @type {{
           *   [id: string]: {
           *     [exportName: string]: { specifier: string, name: string },
           *   },
           * }}
           * */
          const ssrManifest = {};
          const clientManifest = {};

          let _uniq = 0;
          const uniq = () => _uniq++;

          compilation.chunkGroups.forEach(function (chunkGroup) {
            const chunkIds = chunkGroup.chunks.map(function (c) {
              // return c.id;
              return "client-chunk-" + uniq(); // TOY
            });

            // $FlowFixMe[missing-local-annot]
            function recordModule(id, module) {
              // TODO: Hook into deps instead of the target module.
              // That way we know by the type of dep whether to include.
              // It also resolves conflicts when the same module is in multiple chunks.

              if (!/\.(js|ts)x?$/.test(module.resource)) {
                return;
              }

              const moduleProvidedExports = compilation.moduleGraph
                .getExportsInfo(module)
                .getProvidedExports();

              const href = pathToFileURL(module.resource).href;

              if (href !== undefined) {
                /** @type {{ [exportName: string]: { specifier: string, name: string } }} */
                const ssrExports = {};

                const ssrModInfo =
                  _this.options.ctx.getSSRModuleByManifestId(href);
                if (!ssrModInfo) {
                  return;
                }
                // console.log(ssrModInfo, module);
                const ssrImportSpecifier = ssrModInfo.importSpecifier;

                // const ssrImportSpecifier = module.resource;

                clientManifest[href] = {
                  id,
                  chunks: chunkIds,
                  name: "*",
                };
                ssrExports["*"] = {
                  // specifier: href,
                  specifier: ssrImportSpecifier,
                  name: "*",
                };
                clientManifest[href + "#"] = {
                  id,
                  chunks: chunkIds,
                  name: "",
                };
                ssrExports[""] = {
                  // specifier: href,
                  specifier: ssrImportSpecifier,
                  name: "",
                };

                if (Array.isArray(moduleProvidedExports)) {
                  moduleProvidedExports.forEach(function (name) {
                    clientManifest[href + "#" + name] = {
                      id,
                      chunks: chunkIds,
                      name: name,
                    };
                    ssrExports[name] = {
                      // specifier: href,
                      specifier: ssrImportSpecifier,
                      name: name,
                    };
                  });
                }

                ssrManifest[id] = ssrExports;
              }
            }

            chunkGroup.chunks.forEach(function (chunk) {
              const chunkModules =
                compilation.chunkGraph.getChunkModulesIterable(chunk);

              Array.from(chunkModules).forEach(function (module) {
                // const moduleId = compilation.chunkGraph.getModuleId(module);
                const moduleId = "client-module-" + uniq(); // TOY

                recordModule(moduleId, module);
                // If this is a concatenation, register each child to the parent ID.
                if ("modules" in module && module.modules) {
                  // @ts-ignore
                  module.modules.forEach((concatenatedMod) => {
                    recordModule(moduleId, concatenatedMod);
                  });
                }
              });
            });
          });

          const clientOutput = JSON.stringify(clientManifest, null, 2);
          compilation.emitAsset(
            _this.clientManifestFilename,
            new sources.RawSource(clientOutput, false)
          );
          const ssrOutput = JSON.stringify(ssrManifest, null, 2);
          compilation.emitAsset(
            _this.ssrManifestFilename,
            new sources.RawSource(ssrOutput, false)
          );
        }
      );
    });
  }
}

class InjectedImportDependency extends dependencies.ModuleDependency {
  constructor(request) {
    super(request);
  }
  get category() {
    return "esm";
  }
  get type() {
    return "injected import";
  }
}

class InjectedImportDependencyTemplate extends dependencies.ModuleDependency
  .Template {
  /**
   * @param {import('webpack').Dependency} dep the dependency for which the template should be applied
   * @param {import('webpack').sources.ReplaceSource} source the current replace source which can be modified
   * @param {DependencyTemplateContext} templateContext the context object
   * @returns {void}
   */
  apply(dep, source, templateContext) {
    const { request } = /** @type {InjectedImportDependency} */ (dep);
    const moduleGraph = templateContext.moduleGraph;
    const connection = moduleGraph.getConnection(dep);

    if (!connection) {
      throw new Error(`Could not find connection ${request}`);
    }

    const { /* originModule, */ module: targetModule } = connection;

    const importCode = templateContext.importStatement({
      module: targetModule,
      importName: "default",
      request: targetModule.request,
    });

    const content = `${importCode}\n${source.source()}`;
    source.insert(0, content);
    console.log("**************************");
    console.log(
      "InjectedImportDependencyTemplate",
      "\n",
      source.source().toString()
    );
    console.log("**************************");
  }
}

InjectedImportDependency.Template = InjectedImportDependencyTemplate;

// @ts-ignore
// InjectedImportDependency.Template = ModuleDependencyTemplateAsId;

/** @typedef {import("../../build/loaders/types.cjs").ClientModuleInfo} ClientModuleInfo */

main();
