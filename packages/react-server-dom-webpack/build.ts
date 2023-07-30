import * as path from "node:path";
import * as fs from "node:fs";

const srcDir = path.resolve("./src");
const outDir = path.resolve("./dist");

// https://gist.github.com/lovasoa/8691344?permalink_comment_id=3299018#gistcomment-3299018
const walkSync = (
  dir: string,
  callback: (path: string, stats: fs.Stats) => void
) => {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filepath = path.join(dir, file);
    const stats = fs.statSync(filepath);
    if (stats.isDirectory()) {
      walkSync(filepath, callback);
    } else if (stats.isFile()) {
      callback(filepath, stats);
    }
  });
};

const files: string[] = [];
walkSync(srcDir, (path) => {
  if (path.endsWith(".d.ts")) {
    files.push(path);
  }
});
files.sort();

console.log(files);

const INTERNAL_PREFIX = "react-server-dom-webpack/__/";

const getSpecifier = (filePath: string) => {
  const specifier = path.relative(srcDir, filePath).replace(/\.d\.ts$/, "");
  // we don't want to ambiently declare internal react packages that aren't actually available.
  // but we also can't do much to hide them...
  // as a workaround, prefix them with something hard to type accidentally.
  if (
    specifier.startsWith("shared/") ||
    specifier.startsWith("react-client/") ||
    specifier.startsWith("react-server/")
  ) {
    return INTERNAL_PREFIX + specifier;
  }
  return specifier;
};

const resultParts: string[] = [];
for (const filePath of files) {
  let contents = fs.readFileSync(filePath, "utf-8");
  const patterns = [
    /(?<= from ")([^"]+)(?=")/g, // import|export from "...",
    /(?<= require\(")([^"]+)(?="\))/g, // require("..."),
  ];
  for (const pattern of patterns) {
    contents = contents.replace(pattern, (match) => {
      let requestAbsPath: string;
      if (match.startsWith("./") || match.startsWith("../")) {
        requestAbsPath = path.resolve(path.dirname(filePath), match + ".d.ts");
      } else {
        // FIXME: this also matches packages like "busboy".
        // doesn't matter much though, because we turn getSpecifier unwraps the incorrect path
        requestAbsPath = path.resolve(srcDir, match + ".d.ts");
      }

      const requestSpecifier = getSpecifier(requestAbsPath);

      console.log(
        path.relative(srcDir, filePath),
        match,
        "==>",
        requestSpecifier
      );
      return requestSpecifier;
      return match;
    });
  }

  // `declare function` is illegal in ambient declaration files (like our output)
  contents = contents.replace(/\bdeclare function /g, "function ");
  // triple-slash directives are ignored within `declare module {}`,
  // and we add one at the top of the file instead
  contents = contents.replaceAll(
    '/// <reference types="react/experimental" />',
    ""
  );

  const specifier = getSpecifier(filePath);
  const stripTrailingNewline = (s: string) => {
    if (s.at(-1) === "\n") {
      return s.slice(0, -1);
    }
    return s;
  };

  const finalContents =
    [
      `declare module "${specifier}" {`,
      ...stripTrailingNewline(contents)
        .split("\n")
        .map((line) => "  " + line),
      `}`,
    ].join("\n") + "\n";

  resultParts.push(finalContents);
}

const prelude = [
  `/// <reference types="react/experimental" />`,
  "",
  `// NOTE: the '${INTERNAL_PREFIX}*' modules are not actually there.`,
  `// They exist only in the react github repo (without the prefix) and disappear as part of their build process.`,
  `// We include them here only because mirroring the structure makes maintaining the definitions easier.`,
  "",
];

resultParts.unshift(...prelude);

const results = resultParts.join("\n");

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "index.d.ts"), results);
