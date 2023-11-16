import streams from "node:stream";

import {
  decodeReply,
  renderToPipeableStream,
} from "react-server-dom-webpack/server";
import { createFromNodeStream } from "react-server-dom-webpack/client";

// TODO: can't do the thing next does because `client.edge` with `encodeReply` only got released 2 weeks ago
// and `client.browser` would need extra hacks
// (some kind of render div w/ action -> SSR -> createFromReadableStream dance to get the action fn into its `knownServerReferences`.)
// so skip that for now
import { encodeReply } from "react-server-dom-webpack/client.browser";

import { readablefromPipeable } from "../utils";

// TODO
type ReactClientValue = any;

const noClientReferences = new Proxy(
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
    renderToPipeableStream(arg, noClientReferences)
  );
  return streamToString(stream);
}

async function deserializeValue(decrypted: string): Promise<BoundArgs> {
  console.log("deserializeValue :: decrypted", decrypted);

  // Using Flight to deserialize the args from the string.
  const stream = new streams.Readable({
    read() {},
  });
  stream.push(Buffer.from(decrypted));
  stream.push(null);

  const deserialized = await createFromNodeStream<[ReactClientValue]>(
    stream,
    noClientReferences
  );
  console.log("deserializeValue :: deserialized", deserialized);

  // This extra step ensures that the server references are recovered.
  // const serverModuleMap = getServerModuleMap();
  const serverModuleMap = new Proxy(
    {},
    {
      get(_, id) {
        console.log("tried to get", id, "from serverModuleMap");
        throw new Error(
          `Not implemented: Cannot deserialize server reference ${id.toString()}`
        );
      },
      has(_, id) {
        console.log("checked if", id, "exists in serverModuleMap");
        return false;
      },
    }
  );
  const encoded = await encodeReply(deserialized);
  console.log("deserializeValue :: (reply trick) encoded", encoded);
  const transformed = await decodeReply(
    encoded as string | FormData,
    serverModuleMap
  );
  console.log(
    "deserializeValue :: (reply trick) decoded/transformed",
    transformed
  );

  // const transformed = deserialized;

  if (!Array.isArray(transformed)) {
    console.error("Deserialized value is not an array", transformed);
  }
  return transformed as ReactClientValue[];
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
