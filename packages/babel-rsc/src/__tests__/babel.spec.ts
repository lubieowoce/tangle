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
        console.log(inputPath);
        const inputCode = readFileSync(inputPath, "utf-8");

        const onActionFound = vi.fn();
        const inlineActionPLugin = createPlugin({ onActionFound });

        const runTransform = () =>
          transformSync(inputCode, {
            filename: inputPath,
            root: path.dirname(inputPath),
            plugins: [
              "@babel/plugin-syntax-jsx",
              // for some godforsaken reason, skipping the .bind makes the test reuse the same
              // instance of the plugin forever, messing up state.
              [inlineActionPLugin.bind(null), pluginOptions],
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

  test("custom getModuleId", () => {
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
          [inlineActionPLugin.bind(null), { encryption: null }],
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

  describe("plugin options", () => {
    const inputPath = "/wherever/test.jsx";
    const inputCode = `
"use server"
export async function test() {}
`;

    test("custom runtime replaces RSDW", () => {
      const spec = {
        importSource: "@my/package",
        name: "myCustomRegister",
      };

      const output = transformSync(inputCode, {
        filename: inputPath,
        root: path.dirname(inputPath),
        plugins: [
          "@babel/plugin-syntax-jsx",
          [
            createPlugin(),
            { encryption: null, runtime: { registerServerReference: spec } },
          ],
        ],
      });

      expect(output!.code).toContain(spec.importSource);
      expect(output!.code).toContain(spec.name);
      expect(output!.code).not.toContain("react-server-dom-webpack/server");
      expect(output!.code).not.toContain("registerServerReference");
    });

    describe("moduleIds", () => {
      it.each(["file-url-root-relative", "file-url-absolute", "file-url-hash"])(
        "%s",
        (moduleIdsOption) => {
          const spec = {
            importSource: "@my/package",
            name: "myCustomRegister",
          };

          const output = transformSync(inputCode, {
            filename: inputPath,
            root: path.dirname(inputPath),
            plugins: [
              "@babel/plugin-syntax-jsx",
              [
                createPlugin(),
                {
                  encryption: null,
                  runtime: { registerServerReference: spec },
                  moduleIds: moduleIdsOption,
                },
              ],
            ],
          });
          expect(output).toBeTruthy();
          expect(output!.code).toMatchSnapshot();
        }
      );
    });
  });

  describe("with commonjs", () => {
    // console.log(files);
    const filteredFiles = files.filter((file) => file.testName === "top-level");
    const pluginOptions = pluginOptionsVariants.find(
      (variant) => variant.name === "unencrypted"
    )!;
    test.each(filteredFiles)("$testName", async ({ inputPath }) => {
      const inputCode = readFileSync(inputPath, "utf-8");

      const onActionFound = vi.fn();
      const inlineActionPLugin = createPlugin({ onActionFound });

      const runTransform = () =>
        transformSync(inputCode, {
          filename: inputPath,
          root: path.dirname(inputPath),
          plugins: [
            "@babel/plugin-syntax-jsx",
            "@babel/plugin-transform-modules-commonjs",
            [inlineActionPLugin, pluginOptions],
          ],
        });

      const output = runTransform();
      expect(output).toBeTruthy();
      expect(output!.code).toMatchSnapshot();
    });
  });
});
