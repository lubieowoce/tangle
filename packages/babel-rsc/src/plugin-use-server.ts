import { createPlugin, type PluginOptions } from "./babel-rsc-actions";

type Exported = ReturnType<typeof createPlugin> & {
  createPlugin: typeof createPlugin;
};

const plugin = createPlugin() as Exported;
plugin.createPlugin = createPlugin;

export type { PluginOptions };
export { createPlugin };
export default plugin;
// export = plugin;
