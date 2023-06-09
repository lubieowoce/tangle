import { startTransition, type ReactNode } from "react";
import { hydrateRoot } from "react-dom/client";
import { createFromReadableStream } from "react-server-dom-webpack/client";
import {
  ClientRouter,
  createEmptyLayoutCache,
  getPathFromDOMState,
} from "@owoce/tangle-router";
import { Use } from "./support/use";
import { __DEV__ } from "./support/is-dev";
import { fetchSubtree } from "./router-integration/index.client";

type InitialChunks = string[] & { isComplete?: boolean };

// eslint-disable-next-line no-var
declare var __RSC_CHUNKS__: InitialChunks;

const getStreamFromInitialChunks = (initialChunks: InitialChunks) => {
  // probably not the best way to do it (idk streams too well)
  // but it works so it's probably fine for now
  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();

  // RSDW epects the chunks to be encoded...
  // feels dumb that we have to reencode stuff, but what can you do
  const encoder = new TextEncoder();

  const onChunkReceived = (chunk: string) => {
    return writer.write(encoder.encode(chunk));
  };

  let isComplete = initialChunks.isComplete ?? false;

  const onStreamFinished = async () => {
    isComplete = true;
    await writer.close();
    if (!__DEV__) {
      // we don't need these anymore, so we can free the memory.
      clearArray(__RSC_CHUNKS__);
    }
  };

  // process everything that got written before this script loaded.

  for (const chunk of initialChunks) {
    console.log("processing initial RSC chunk\n", chunk);
    // TODO: could the `await` cause a race here?
    // i don't think so, because the chunks will still get written into the same array,
    // so i think we should process them here just fine. but who knows!

    // await onChunkReceived(chunk);
    onChunkReceived(chunk);
  }

  if (initialChunks.isComplete) {
    // the server told us that no more chunks are coming,
    // so we're done here.
    onStreamFinished();
  } else {
    // the server didn't set the `isComplete` flag yet,
    // so more chunks are coming.
    // intercept the Array.push and put them into the stream as well.
    Object.defineProperties(initialChunks, {
      push: {
        value: ((chunk: string) => {
          console.log("received RSC chunk after init\n", chunk);
          Array.prototype.push.call(initialChunks, chunk); // mostly for debugging
          onChunkReceived(chunk);
        }) as typeof Array.prototype.push,
      },
      isComplete: {
        get() {
          return isComplete;
        },
        set(_) {
          // there's no way to await a set but we don't really care
          onStreamFinished();
        },
      },
    });
  }

  return stream.readable;
};

const clearArray = (arr: any[]) => {
  while (arr.length > 0) {
    arr.pop();
  }
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
  const initialStream = getStreamFromInitialChunks(__RSC_CHUNKS__);
  const initialServerTreeThenable =
    createFromReadableStream<ReactNode>(initialStream);
  const layoutCache = createEmptyLayoutCache();
  const initialPath = getPathFromDOMState();
  // cache.set(initialKey, initialServerTreeThenable);

  onDocumentLoad(() => {
    startTransition(() => {
      hydrateRoot(
        document,
        <ClientRouter
          initialCache={layoutCache}
          initialPath={initialPath}
          fetchSubtree={fetchSubtree}
        >
          <Use thenable={initialServerTreeThenable} debugLabel={initialPath} />
        </ClientRouter>
      );
    });
  });
};

init();
