/// <reference types="react/next" />
import { cache } from "react";

const sleep = (ms: number) => {
  console.log(`sleeping for ${ms}ms`, new Date().toISOString());
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
};

export const slowdown = cache(sleep);
