import { describe, expect, it, vi } from "vitest";
import { fileURLToPath } from "node:url";
import { readFileSync, readdirSync } from "node:fs";
import * as path from "path";

import { transformSync } from "@babel/core";
import { createPlugin } from "../babel-plugin-inline-actions.cjs";

describe("babel transform", () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const inputsDir = path.join(here, "test-cases");
  const files = readdirSync(inputsDir).filter(
    (p) => p.endsWith(".jsx") && !p.endsWith(".out.jsx")
  );

  it.each(files)("case %s", async (inputFile) => {
    const inputPath = path.join(inputsDir, inputFile);
    const inputCode = readFileSync(inputPath, "utf-8");

    const onActionFound = vi.fn();
    const inlineActionPLugin = createPlugin({ onActionFound });

    const getResult = () =>
      transformSync(inputCode, {
        filename: inputPath,
        plugins: ["@babel/plugin-syntax-jsx", inlineActionPLugin],
      });

    if (inputPath.includes(".invalid.")) {
      let thrown: Error = undefined!;
      expect(() => {
        try {
          getResult();
        } catch (err) {
          thrown = err;
          throw err;
        }
      }).toThrow();
      const outputFile = inputPath.replace(".jsx", ".out.txt");
      const message = thrown.message["replaceAll"](inputPath, inputFile); // don't write the absolute path into the snapshot
      expect(message).toMatchFileSnapshot(outputFile);
    } else {
      const result = getResult();
      const { code: outputCode } = result!;
      const outputFile = inputPath.replace(".jsx", ".out.jsx");
      await expect(outputCode).toMatchFileSnapshot(outputFile);
      expect(onActionFound).toHaveBeenCalled();
    }
  });
});
