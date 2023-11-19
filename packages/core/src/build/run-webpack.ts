import { Configuration, Stats, StatsError, webpack } from "webpack";

type WebpackResult = { err: Error | undefined; stats: Stats | undefined };
type LogOpts = { quiet?: boolean };

export const runWebpack = async (config: Configuration, logOpts?: LogOpts) => {
  const pRes = new Promise<WebpackResult>((resolve) => {
    webpack(config, (err, stats) => {
      resolve({ err, stats });
    });
  });
  const { err, stats } = await pRes;
  const ok = report({ err, stats }, logOpts);
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
 */
const report = (
  { err, stats }: WebpackResult,
  { quiet = false }: LogOpts = {}
) => {
  // webpack crashed
  if (err) {
    console.error(err.stack || err);
    const castErr = err as Error & { details?: string };
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

  if (!quiet && stats.hasWarnings()) {
    logMany(info.warnings);
  }

  console.log(
    stats.toString({
      colors: true,
    })
  );
  return true;
};

const logMany = (items: StatsError[] | undefined) => {
  if (!items) return;
  for (const item of items) {
    console.log("message" in item ? item.message : item);
  }
};
