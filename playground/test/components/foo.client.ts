"use client";

import { jsx, JSXChildren } from "../create-element";

export function Foo({ children }: { children: JSXChildren }) {
  return jsx("span", { children: ["Client Foo!", children] });
}
