import { jsx } from "../create-element";
import { Foo } from "./foo.client";

export default function One() {
  return jsx("main", {
    className: "one",
    children: jsx(Foo, { children: "Children from One: 1 1 1" }),
  });
}
