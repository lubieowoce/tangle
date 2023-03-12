//@ts-check

const { webpack } = require("webpack");

/**
 * @typedef {import('webpack').Stats} Stats
 * @typedef {import('webpack').Configuration} Configuration
 * @typedef {{ err: Error | undefined; stats: Stats | undefined }} WebpackResult
 */

const runWebpack = async (/** @type {Configuration} */ config) => {
  /** @type {Promise<WebpackResult>} */
  const pRes = new Promise((resolve) => {
    webpack(config, (err, stats) => {
      resolve({ err, stats });
    });
  });
  const { err, stats } = await pRes;
  const ok = report({ err, stats });
  if (!ok) {
    throw new Error(
      "Encountered errors from webpack, aborting. See output above"
    );
  }
  if (!stats) {
    throw new Error("missing stats!");
  }
  return stats;
};

/**
 * based on https://webpack.js.org/api/node/#error-handling
 * @param {WebpackResult} result
 */
const report = ({ err, stats }) => {
  // webpack crashed
  if (err) {
    console.error(err.stack || err);
    const castErr = /** @type {Error & { details?: string }} */ (err);
    if (castErr.details) {
      console.error(castErr.details);
    }
    return false;
  }

  if (!stats) {
    throw new Error("missing stats!");
  }

  const info = stats.toJson();

  if (stats.hasErrors()) {
    logMany(info.errors);
    return false;
  }

  if (stats.hasWarnings()) {
    logMany(info.warnings);
  }

  console.log(
    stats.toString({
      colors: true,
    })
  );
  return true;
};

const logMany = (
  /** @type {import("webpack").StatsError[] | undefined} */ items
) => {
  if (!items) return;
  for (const item of items) {
    console.log("message" in item ? item.message : item);
  }
};

module.exports = { runWebpack };
