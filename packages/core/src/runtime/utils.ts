import streams from "node:stream";
import type Express from "express";
import type { PipeableStream as PipeableStream1 } from "react-server-dom-webpack/server";
import type { PipeableStream as PipeableStream2 } from "react-dom/server";

export const readablefromPipeable = (
  stream: PipeableStream1 | PipeableStream2
): streams.Transform => (stream as any).pipe(createNoopStream());

export const createNoopStream = () =>
  new streams.Transform({
    transform(chunk: Buffer, _encoding, callback) {
      this.push(chunk);
      callback();
    },
  });

type AsyncReturn<Fn extends (...args: any[]) => any> = Fn extends (
  ...args: infer TArgs
) => infer TReturn
  ? (...args: TArgs) => Promise<TReturn>
  : never;

export const catchAsync =
  (handler: AsyncReturn<Express.Handler>): AsyncReturn<Express.Handler> =>
  async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (err) {
      console.error("catchAsync", err);
      next(err);
    }
  };
