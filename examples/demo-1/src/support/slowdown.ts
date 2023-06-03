/// <reference types="react/next" />
import { cache } from "react";

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export const slowdown = cache(sleep);
