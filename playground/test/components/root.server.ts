import { jsx } from "../create-element";
import One from "./one.server";
import Two from "./two.server";

export default function Root() {
  return jsx("body", {
    children: [jsx(One, {}), jsx(Two, { id: "a" }), jsx(Two, { id: "b" })],
  });
}
