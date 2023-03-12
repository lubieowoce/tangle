//@ts-check

/**
 * @source https://stackoverflow.com/a/6969486
 * @param {string} str
 */
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

const stubModules = (/** @type {string[]} */ modules) => {
  const regexp = new RegExp(modules.map(escapeRegExp).join("|"));
  for (const mod of modules) {
    console.assert(regexp.test(mod), "Regex failed for '%s'", mod);
  }
  return regexp;
};
