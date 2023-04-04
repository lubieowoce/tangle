// @ts-check
import { defineConfig } from "tsup";

export default defineConfig({
  target: "node16",
  format: "cjs",
  skipNodeModulesBundle: true,
  clean: true,
  outDir: "dist/bin",
  entry: {
    tangle: "src/bin/tangle.ts",
  },
});
