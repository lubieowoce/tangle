import streams from "node:stream";
import type Express from "express";

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
      next(err);
    }
  };
