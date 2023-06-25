import type { ServerManifest } from "react-server-dom-webpack/server";

type ActionHandlers = Record<string, (...args: any[]) => Promise<any>>;

const dummy = () => {
  throw new Error(
    "Internal error: A action-handlers.js file should have replaced this file during the build process."
  );
};

export const serverActionHandlers: ActionHandlers = dummy();
export const serverActionsManifest: ServerManifest = dummy();
