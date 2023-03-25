//@ts-check

/**
 * @source https://stackoverflow.com/a/6969486
 * @param {string} str
 */
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

module.exports = { escapeRegExp };
