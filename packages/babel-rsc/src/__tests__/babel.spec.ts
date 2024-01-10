import { describe, expect, it, vi, test } from "vitest";
import { fileURLToPath } from "node:url";
import { readFileSync, readdirSync, statSync } from "node:fs";
import * as path from "path";

import { transformSync } from "@babel/core";
import { createPlugin, PluginOptions } from "../babel-rsc-actions.js";

const pluginOptionsVariants: { name: string; options: PluginOptions }[] = [
  {
    name: "encrypted",
    options: {
      encryption: {
        importSource: "@example/my-framework/encryption",
        encryptFn: "encryptActionBoundArgs",
        decryptFn: "decryptActionBoundArgs",
      },
    },
  },
  {
    name: "unencrypted",
    options: {
      encryption: null,
    },
  },
];

type Result<T, E = Error> =
  | { type: "ok"; value: T }
  | { type: "err"; error: E };

const asResult = <T>(fn: () => T): Result<T> => {
  try {
    return { type: "ok", value: fn() };
  } catch (err) {
    return { type: "err", error: err as Error };
  }
};

describe("babel transform", () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const inputsDir = path.join(here, "test-cases");
  const files = readdirSync(inputsDir)
    .map((p) => path.join(inputsDir, p))
    .filter((p) => statSync(p).isDirectory())
    .map((p) => ({
      testName: path.basename(p),
      inputPath: path.join(p, "input.jsx"),
    }));

  describe.each(files)("$testName", async ({ inputPath }) => {
    it.each(pluginOptionsVariants)(
      "$name",
      async ({ options: pluginOptions, name: optionsVariantName }) => {
        const inputCode = readFileSync(inputPath, "utf-8");

        const onActionFound = vi.fn();
        const inlineActionPLugin = createPlugin({ onActionFound });

        const runTransform = () =>
          transformSync(inputCode, {
            filename: inputPath,
            root: path.dirname(inputPath),
            plugins: [
              "@babel/plugin-syntax-jsx",
              [inlineActionPLugin, pluginOptions],
            ],
          });

        const result = asResult(() => runTransform());

        if (result.type === "err") {
          const outputFile = path.join(
            path.dirname(inputPath),
            `error.${optionsVariantName}.__snap__.txt`
          );
          console.log("out", outputFile);
          const inputFileRelative = path.basename(inputPath);
          // don't write the absolute path into the snapshot
          const message = result.error.message["replaceAll"](
            inputPath,
            inputFileRelative
          );
          expect(message).toMatchFileSnapshot(outputFile);
        } else {
          const result = runTransform();
          const { code: outputCode } = result!;
          const outputFile = path.join(
            path.dirname(inputPath),
            `output.${optionsVariantName}.__snap__.jsx`
          );
          await expect(outputCode).toMatchFileSnapshot(outputFile);
          expect(onActionFound).toHaveBeenCalled();
        }
      }
    );
  });

  test.only("custom getModuleId", () => {
    const TEST_MODULE_ID = "test-id";
    const inlineActionPLugin = createPlugin({
      getModuleId() {
        return TEST_MODULE_ID;
      },
    });

    const inputPath = "/wherever/test.jsx";
    const inputCode = `
"use server"
export async function test() {}
`;

    const runTransform = () =>
      transformSync(inputCode, {
        filename: inputPath,
        root: path.dirname(inputPath),
        plugins: [
          "@babel/plugin-syntax-jsx",
          [inlineActionPLugin, { encryption: null }],
        ],
      });

    const { code: outputCode } = runTransform()!;
    const [header] = outputCode!.split("\n", 1);
    expect(header).toEqual(
      `"babel-rsc/actions: ${JSON.stringify({
        id: TEST_MODULE_ID,
        names: ["test"],
      }).replaceAll('"', '\\"')}";`
    );
  });
});
