import { jsx } from "../create-element";
import { Foo } from "./foo.client";

export default function Two({ id }: { id?: string }) {
  return jsx("aside", {
    className: id ? `two id-${id}` : "two",
    children: jsx(Foo, { children: "children from Two: 2 2 2" }),
  });
}
