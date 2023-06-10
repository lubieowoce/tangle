import { defineEntries } from "waku/server";

import generatedRoutes from "./src/.generated/routes.js";
import type { RouteDefinition } from "@owoce/tangle-router/server";

// We'll probably export some method to do this from tangle-router,
// idk if we want to keep the RouteDefiniton type stable/exposed
function getStaticPathsFromRoutes(route: RouteDefinition): string[] {
  const here = route.segment;
  // leaf -- nothing more to do
  if (here === "__PAGE__") {
    return [""];
  }
  // dynamic segment: no way to generate it currently,
  // so just skip this whole "branch" by returning `[]`
  if (here.match(/^\[\w+\]$/)) {
    return [];
  }
  if (!route.children) {
    return [here];
  }
  return route.children.flatMap((child) => {
    const below = getStaticPathsFromRoutes(child);
    return below.map((p) => here + "/" + p);
  });
}

/** A helper to enforce proper types across getEntry/getBuilder */
function typedEntry<TProps, TReturn = any>(
  id: string,
  importFn: () => Promise<{ default: (props: TProps) => TReturn }>
) {
  return {
    id,
    importFn,
    element: (props: TProps) => [id, props] as const,
  };
}

const ServerRouter = typedEntry(
  "ServerRouter",
  () => import("./src/server-router.js")
);

export default defineEntries(
  async function getEntry(id) {
    // FIXME: waku's types don't let us have required props
    type NoProps = {
      default: (props: {}) => any;
    };

    switch (id) {
      case ServerRouter.id: {
        return ServerRouter.importFn() as Promise<NoProps>;
      }
      default:
        return null;
    }
  },
  async function getBuilder(_root, _unstable_renderForBuild) {
    const paths = getStaticPathsFromRoutes(generatedRoutes);
    console.log(["Static paths:", ...paths.map((p) => `  - ${p}`)].join("\n"));
    return Object.fromEntries(
      paths.map((path) => [
        path,
        {
          elements: [ServerRouter.element({ path })],
        },
      ])
    );
  }
);
