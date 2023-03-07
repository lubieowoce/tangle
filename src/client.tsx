import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { createFromFetch } from "react-server-dom-webpack/client.browser";
// import ServerRoot from "./app/server-root";
import { FLIGHT_REQUEST_HEADER, ROOT_DOM_NODE_ID } from "./shared";

import { ClientChild } from "./app/client-child";

ClientChild; // make sure it's in the bundle!

const root = createRoot(document.getElementById(ROOT_DOM_NODE_ID)!);

const fetchServer = () => {
  return createFromFetch<ReactNode>(
    fetch("/", { headers: { [FLIGHT_REQUEST_HEADER]: "true" } })
  );
};

const init = async () => {
  const serverTree = await fetchServer();
  root.render(serverTree);
};

init();
