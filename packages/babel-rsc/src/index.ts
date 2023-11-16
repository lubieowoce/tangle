import BPIA = require("./babel-plugin-inline-actions");
const { createPlugin } = BPIA;

type Exported = ReturnType<typeof createPlugin> & {
  createPlugin: typeof createPlugin;
};

const plugin = createPlugin() as Exported;
plugin.createPlugin = createPlugin;

export = plugin;
