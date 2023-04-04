import {
  PropsWithChildren,
  startTransition,
  Suspense,
  // @ts-ignore
  use,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { hydrateRoot } from "react-dom/client";
import {
  createFromFetch,
  createFromReadableStream,
} from "react-server-dom-webpack/client.browser";
import type { Thenable } from "react__shared/ReactTypes";
import { HTMLPage } from "./page";
import {
  getKey,
  NavigateOptions,
  NavigationContext,
  NavigationContextValue,
  useNavigationContext,
} from "./navigation-context";
import { AnyServerRootProps, FLIGHT_REQUEST_HEADER } from "./shared";
import { pathToParams } from "./user/paths";

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

const createCache = () => new Map<string, Thenable<ReactNode>>();
type ServerResponseCache = ReturnType<typeof createCache>;

const ClientNavigationProvider = ({
  cache,
  initialProps,
  children,
}: PropsWithChildren<{
  cache: ServerResponseCache;
  initialProps: AnyServerRootProps;
}>) => {
  const [key, setKey] = useState(() => getKey(initialProps));
  const [isNavigating, startTransition] = useTransition();
  // TODO: handle popState, allow pushState
  const navigation = useMemo<NavigationContextValue>(
    () => ({
      key,
      isNavigating,
      navigate(
        newProps,
        { noCache = false, instant = false }: NavigateOptions = {}
      ) {
        const doNavigate = () => {
          let newKey = getKey(newProps);
          if (noCache) {
            newKey += "-" + Date.now();
          }
          setKey(newKey);

          const newUrl = new URL(window.location.href);
          newUrl.search = "?" + new URLSearchParams(newProps);
          window.history.replaceState(null, "", newUrl);

          if (cache.has(newKey)) return;
          cache.set(
            newKey,
            createFromFetch(
              fetch(newUrl, { headers: { [FLIGHT_REQUEST_HEADER]: "1" } }),
              {}
            )
          );
        };
        if (instant) {
          doNavigate();
        } else {
          startTransition(doNavigate);
        }
      },
    }),
    [key, isNavigating, cache]
  );
  return (
    <NavigationContext.Provider value={navigation}>
      {children}
    </NavigationContext.Provider>
  );
};

const ServerComponentWrapper = ({ cache }: { cache: ServerResponseCache }) => {
  const { key } = useNavigationContext();
  return use(cache.get(key));
};

const init = async () => {
  console.log("client-side init!");
  const initialStream = intoStream(__RSC_CHUNKS__);
  const initialServerTreeThenable =
    createFromReadableStream<ReactNode>(initialStream);
  const cache = createCache();

  const initialProps = pathToParams(new URL(window.location.href));
  const initialKey = getKey(initialProps);
  cache.set(initialKey, initialServerTreeThenable);

  console.log(cache);

  onDocumentLoad(() => {
    startTransition(() => {
      hydrateRoot(
        document,
        <ClientNavigationProvider cache={cache} initialProps={initialProps}>
          <HTMLPage>
            <Suspense>
              <ServerComponentWrapper cache={cache} />
            </Suspense>
          </HTMLPage>
        </ClientNavigationProvider>
      );
    });
  });
};

init();
