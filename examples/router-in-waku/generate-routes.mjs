// @ts-check
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";
import {
  findRoutes,
  normalizeRoutes,
  generateRoutesExport,
  // @ts-expect-error  not sure why this import is yelling in my editor, but it works at runtime
} from "@owoce/tangle-router/build";

// It'd be nice to generate the routes from within Vite somehow,
// but i don't wanna investigate that now, this script works well enough

const main = () => {
  const __dir = path.dirname(fileURLToPath(import.meta.url));
  const routesDirPath = path.resolve(__dir, "./src/routes");
  const routesFilePath = path.resolve(__dir, "./src/.generated/routes.ts");
  const fromRoutesFile = path.dirname(routesFilePath);

  const toExport = generateRoutesExport(
    normalizeRoutes(findRoutes(routesDirPath)),
    {
      /** @param {string} specifier */
      importLambda(specifier) {
        specifier = path
          .relative(fromRoutesFile, specifier)
          .replace(/\.(ts|tsx)$/, ".js");
        return `() => import("${specifier}")`;
      },
    }
  );

  const code = [
    `// this is a generated file.`,
    `// run 'npm run generate' after adding any new routes to rebuild it.`,
    ``,
    `import type { RouteDefinition } from "@owoce/tangle-router/server";`,
    ``,
    `const routes: RouteDefinition = ${toExport}`,
    ``,
    `export default routes;`,
    ``,
  ].join("\n");
  writeFileSync(routesFilePath, code);
};

main();
