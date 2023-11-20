import streams from "node:stream";

import {
  ClientManifest,
  decodeReply,
  renderToPipeableStream,
} from "react-server-dom-webpack/server";
import type { SSRManifest } from "react-server-dom-webpack/client";

// We have to use the same client to deserialize + reencode, otherwise it won't know the server references.
// And as of "0.0.0-experimental-bbb9cb116-20231117", encodeReply is only available in client.edge
import {
  createFromReadableStream,
  encodeReply,
} from "react-server-dom-webpack/client.edge";

import { readablefromPipeable } from "../utils";

// TODO
type ReactClientValue = any;

const noClientReferencesDeserialize: SSRManifest = {
  moduleLoading: null,
  moduleMap: new Proxy(
    {},
    {
      get(_, key) {
        throw new Error(
          `Not implemented: Client references as action arguments (${key.toString()})`
        );
      },
    }
  ),
};

const noClientReferencesSerialize: ClientManifest = new Proxy(
  {},
  {
    get(_, key) {
      throw new Error(
        `Not implemented: Client references as action arguments (${key.toString()})`
      );
    },
  }
);

type BoundArgs = ReactClientValue[];
type BoundArgsToDeserialize = string;

export function encryptActionBoundArgs(
  args: BoundArgs,
  _actionModuleId: string,
  _actionName: string
): Promise<BoundArgsToDeserialize> {
  return serializeValue(args).then(encryptValue);
}

export async function decryptActionBoundArgs(
  raw: BoundArgsToDeserialize,
  _actionId: string,
  _actionName: string
): Promise<BoundArgs> {
  return decryptValue(raw).then(deserializeValue);
}

async function encryptValue(str: string): Promise<string> {
  // lol
  return Buffer.from(str).toString("base64");
}

async function decryptValue(str: string): Promise<string> {
  // lol
  return Buffer.from(str, "base64").toString("utf-8");
}

async function serializeValue(arg: ReactClientValue) {
  const stream = readablefromPipeable(
    renderToPipeableStream(arg, noClientReferencesSerialize)
  );
  return streamToString(stream);
}

async function deserializeValue(decrypted: string): Promise<BoundArgs> {
  // This is heavily based on NextJS's implementation of the same thing.
  // In order to properly recover server references, we need to do this complicated dance of:
  //
  // 1. deserialize into client (createFromReadableStream)
  // 2. reencode from client (encodeReply)
  // 3. decode from client (decodeReply)
  //
  // We have to do it because by encrypting the bound args, we've bypassed React's usual mechanism
  // that'd do all of this for us in `decodeReply` (in the main action handler).
  // so essentially we need to reprocess the reply AGAIN by doing a `encodeReply` from a fake client.

  // Using Flight to deserialize the args from the string.
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(decrypted));
      controller.close();
    },
  });

  const deserialized = await createFromReadableStream<[ReactClientValue]>(
    stream,
    { ssrManifest: noClientReferencesDeserialize }
  );

  // This extra step ensures that the server references are recovered.

  // @ts-expect-error hack
  const serverModuleMap = globalThis["__TANGLE_SERVER_ACTIONS_MANIFEST__"];

  const encoded = await encodeReply(deserialized);
  const decoded = await decodeReply(
    encoded as string | FormData,
    serverModuleMap
  );

  if (!Array.isArray(decoded)) {
    console.error("Deserialized value is not an array", decoded);
  }
  return decoded as ReactClientValue[];
}

async function streamToString(stream: streams.Transform) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    stream.on("error", (err) => {
      reject(err);
    });
    stream.on("end", () => {
      resolve(chunks.map((c) => c.toString("utf-8")).join(""));
    });
  });
}
