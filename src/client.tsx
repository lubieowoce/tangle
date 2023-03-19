import {
  startTransition,
  Suspense,
  // @ts-ignore
  use,
  type ReactNode,
} from "react";
import { hydrateRoot } from "react-dom/client";
import {
  // createFromFetch,
  createFromReadableStream,
} from "react-server-dom-webpack/client.browser";
import { HTMLPage } from "./app/page";
// import ServerRoot from "./app/server-root";
// import { FLIGHT_REQUEST_HEADER, ROOT_DOM_NODE_ID } from "./shared";

// // make sure it's in the bundle!
import("./app/client-child");

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

// const root = createRoot(document.getElementById(ROOT_DOM_NODE_ID)!);

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
  const serverTreeThenable = createFromReadableStream<ReactNode>(initialStream);
  const ServerComponentWrapper = () => {
    return use(serverTreeThenable);
  };
  // TODO: loading order later
  onDocumentLoad(() => {
    startTransition(() => {
      hydrateRoot(
        document,
        <HTMLPage>
          <Suspense>
            <ServerComponentWrapper />
          </Suspense>
        </HTMLPage>
      );
    });
  });
};

init();
