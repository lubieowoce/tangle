#!/usr/bin/env node
import { spawn } from "child_process";
import chokidar, { WatchOptions } from "chokidar";
import path from "node:path";

import { build } from "../build/build";

const main = async () => {
  const args = process.argv.slice(2);
  const [command] = args;
  if (!command) {
    throw new Error("No command given");
  }
  const appPath = process.cwd();
  switch (command) {
    case "dev": {
      const [, serverRoot = "src/index.tsx", paths = "src/paths.ts"] = args;
      const runDev = async () => {
        const { server } = await build({
          appPath,
          serverRoot,
          paths,
        });
        return () => {
          const proc = spawnServer({ path: server.path, watchDir: appPath });
          return () => proc.kill();
        };
      };
      return runWithReload(runDev, {
        watchPath: appPath,
        ignored: path.join(appPath, "dist"),
      });
    }
    default: {
      throw new Error("Unknown command: " + command);
    }
  }
};

type TaskCleanup = () => void;

type RunningTask = { type: "running"; id: number; cleanup: TaskCleanup };
type ReadyTask = { type: "ready"; id: number; start: () => TaskCleanup };

const startTask = (task: ReadyTask): RunningTask => {
  return { type: "running", id: task.id, cleanup: task.start() };
};

const runWithReload = async (
  fn: () => Promise<() => TaskCleanup>,
  { watchPath, ...opts }: { watchPath: string } & WatchOptions
) => {
  let uid = 0;
  const getId = () => uid++;

  let currentTask: RunningTask = {
    type: "running",
    id: getId(),
    cleanup: (await fn())(),
  };

  const watcher = chokidar.watch(watchPath, opts);
  watcher.on("ready", () => {
    watcher.on("all", async (eventType, changedPath) => {
      console.log(
        `Change detected: ${changedPath} [${eventType}]. rebuilding...`
      );
      const newTaskPromise: Promise<ReadyTask> = fn().then((start) => ({
        type: "ready",
        id: getId(),
        start,
      }));
      newTaskPromise.then((task) => {
        if (currentTask.id > task.id) {
          return;
        }
        console.log("cleaning up currently running task...");
        currentTask.cleanup();
        console.log("starting new task...");
        currentTask = startTask(task);
      });
    });
  });
};

const spawnServer = (opts: { path: string; watchDir: string }) => {
  // return new Promise<void>((resolve, reject) => {
  const proc = spawn(process.argv[0], [opts.path], {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_OPTIONS: [
        process.env.NODE_OPTIONS || "",
        `--experimental-specifier-resolution node`,
        `--experimental-fetch`,
      ]
        .filter(Boolean)
        .join(" "),
    },
  });
  return proc;

  // proc.on("exit", (code) => {
  //   if (code !== 0) {
  //     return reject(
  //       Error(`server process exited with nonzero exit code: ${code}`)
  //     );
  //   }
  //   return resolve();
  // });
  // proc.on("error", (err) => {
  //   reject(err);
  // });
  // });
};

main();