// @ts-check
import { defineConfig } from "tsup";

export default defineConfig({
  target: "es2022",
  format: "cjs",
  skipNodeModulesBundle: true,
  clean: true,
  outDir: "dist/server",
  entry: {
    server: "src/server.tsx",
  },
});
