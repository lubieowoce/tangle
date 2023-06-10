// this is a generated file.
// run 'npm run generate' after adding any new routes to rebuild it.

import type { RouteDefinition } from "@owoce/tangle-router/server";

const routes: RouteDefinition = {
  segment: "",
  page: null,
  layout: () => import("../routes/layout.js"),
  loading: null,
  notFound: null,
  error: null,
  children: [
    {
      segment: "__PAGE__",
      page: () => import("../routes/page.js"),
      layout: null,
      loading: null,
      notFound: null,
      error: null,
      children: null,
    },
    {
      segment: "bar",
      page: null,
      layout: () => import("../routes/bar/layout.js"),
      loading: null,
      notFound: null,
      error: null,
      children: [
        {
          segment: "__PAGE__",
          page: () => import("../routes/bar/page.js"),
          layout: null,
          loading: null,
          notFound: null,
          error: null,
          children: null,
        },
        {
          segment: "nested",
          page: null,
          layout: null,
          loading: null,
          notFound: null,
          error: null,
          children: [
            {
              segment: "__PAGE__",
              page: () => import("../routes/bar/nested/page.js"),
              layout: null,
              loading: null,
              notFound: null,
              error: null,
              children: null,
            },
          ],
        },
      ],
    },
    {
      segment: "foo",
      page: null,
      layout: null,
      loading: () => import("../routes/foo/loading.js"),
      notFound: null,
      error: null,
      children: [
        {
          segment: "__PAGE__",
          page: () => import("../routes/foo/page.js"),
          layout: null,
          loading: () => import("../routes/foo/loading.js"),
          notFound: null,
          error: null,
          children: null,
        },
      ],
    },
  ],
};

export default routes;
