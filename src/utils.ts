import streams from "node:stream";

export const createNoopStream = () =>
  new streams.Transform({
    transform(chunk: Buffer, _encoding, callback) {
      this.push(chunk);
      callback();
    },
  });
