import {
  type ReadableWritablePair,
  type ReadableStream,
  TransformStream,
} from "node:stream/web";

// Based on
// https://github.com/unstubbable/mfng/blob/941ab3064f6d158bc5ab3144a6869476b16f0c39/packages/core/src/server/create-initial-rsc-response-transform-stream.ts

async function nextMacroTask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

const closingBodyHtmlText = `</body></html>`;

/** create a TransformStream that'll mix RSC chunks into the main stream.
 * NOTE: this assumes that any RSC bootstrap code (`getInitialRSCChunkContent`)
 * is added to bootsTrapScriptContent.
 */
export function createInitialRscResponseTransformStream(
  rscStream: ReadableStream<Uint8Array>,
  {
    transformRSCChunk,
    getFinalRSCChunk,
  }: {
    transformRSCChunk: (chunk: string) => string;
    getFinalRSCChunk: () => string;
  }
): ReadableWritablePair<Uint8Array, Uint8Array> {
  let removedClosingBodyHtmlText = false;
  let insertingRscStreamScripts: Promise<void> | undefined;
  let finishedInsertingRscStreamScripts = false;

  const textDecoder = new TextDecoder();
  const textEncoder = new TextEncoder();

  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      const text = textDecoder.decode(chunk, { stream: true });

      if (
        text.endsWith(closingBodyHtmlText) &&
        !finishedInsertingRscStreamScripts
      ) {
        const [withoutClosingBodyHtmlText] = text.split(closingBodyHtmlText);

        controller.enqueue(textEncoder.encode(withoutClosingBodyHtmlText));

        removedClosingBodyHtmlText = true;
      } else {
        controller.enqueue(chunk);
      }

      // eslint-disable-next-line no-async-promise-executor
      insertingRscStreamScripts ||= new Promise(async (resolve) => {
        const reader = rscStream.getReader();

        try {
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const result = await reader.read();

            if (result.done) {
              controller.enqueue(textEncoder.encode(getFinalRSCChunk()));
              finishedInsertingRscStreamScripts = true;

              if (removedClosingBodyHtmlText) {
                controller.enqueue(textEncoder.encode(closingBodyHtmlText));
              }

              return resolve();
            }

            await nextMacroTask();

            controller.enqueue(
              textEncoder.encode(
                transformRSCChunk(
                  textDecoder.decode(result.value, { stream: true })
                )
              )
            );
          }
        } catch (error) {
          controller.error(error);
        }
      });
    },

    async flush() {
      return insertingRscStreamScripts;
    },
  });
}
