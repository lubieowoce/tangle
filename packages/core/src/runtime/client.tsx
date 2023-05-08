import {
  startTransition,
  Suspense,
  type ReactNode,
  // @ts-ignore use exists!
  use,
} from "react";
import { hydrateRoot } from "react-dom/client";
import { createFromReadableStream } from "react-server-dom-webpack/client.browser";
import { HTMLPage } from "./page";
import {
  ClientRouter,
  createLayoutCacheRoot,
  getPathFromDOMState,
} from "./router/client-router";

declare var __RSC_CHUNKS__: string[];

const intoStream = (initialChunks: string[]) => {
  // probably not the best way to do it (idk streams too well)
  // but it works so it's probably fine for now
  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();

  // RSDW epects the chunks to be encoded...
  // feels dumb that we have to reencode stuff, but what can you do
  const encoder = new TextEncoder();

  const onChunkReceived = (chunk: string) => {
    writer.write(encoder.encode(chunk));
  };
  for (const chunk of initialChunks) {
    console.log("processing initial RSC chunk\n", chunk);
    onChunkReceived(chunk);
  }

  initialChunks.push = ((chunk: string) => {
    console.log("received RSC chunk after init\n", chunk);
    onChunkReceived(chunk);
  }) as typeof Array.prototype.push;
  return stream.readable;
};

const onDocumentLoad = (fn: () => void) => {
  if (document.readyState !== "loading") {
    setTimeout(fn);
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      fn();
    });
  }
};

const init = async () => {
  console.log("client-side init!");
  const initialStream = intoStream(__RSC_CHUNKS__);
  const initialServerTreeThenable =
    createFromReadableStream<ReactNode>(initialStream);
  // const cache = createCache();
  const layoutCache = createLayoutCacheRoot();
  Object.defineProperty(window, "LAYOUT_CACHE", { get: () => layoutCache });

  const initialPath = getPathFromDOMState();
  const initialKey = initialPath;
  // cache.set(initialKey, initialServerTreeThenable);

  // console.log(cache);

  const Root = () => {
    return use(initialServerTreeThenable);
  };

  onDocumentLoad(() => {
    startTransition(() => {
      hydrateRoot(
        document,
        // TODO: ClientRouter renders a segment context, and that intercepts children... iffy
        <ClientRouter cache={layoutCache} initialPath={initialPath}>
          <HTMLPage>
            <Suspense fallback="Loading... (global boundary)">
              <Root />
            </Suspense>
          </HTMLPage>
        </ClientRouter>
      );
    });
  });
};

init();
