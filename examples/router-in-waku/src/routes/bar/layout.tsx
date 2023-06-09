import { PropsWithChildren } from "react";
import { ExampleInput } from "../../ExampleInput.js";

export default function BarLayout({ children }: PropsWithChildren) {
  return (
    <div
      style={{
        border: "2px dashed lightgrey",
        borderRadius: "8px",
        padding: "1em",
      }}
    >
      This is a nested layout for bar.
      <br />
      <br />
      <ExampleInput placeholder="this should persist" />
      <hr style={{ borderStyle: "solid" }} />
      {children}
    </div>
  );
}
