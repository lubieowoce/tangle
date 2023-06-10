// this should work, but crashes the build...
// TODO: change this when https://github.com/dai-shi/waku/pull/71 is released
// import "server-only";

import { Link } from "@owoce/tangle-router/client";
import { PropsWithChildren } from "react";
import { SmallCounter } from "../SmallCounter.js";

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <div style={{ fontFamily: "sans-serif" }}>
      <nav
        style={{
          display: "flex",
          gap: "1em",
          alignItems: "center",
          backgroundColor: "#eee",
          padding: "1em",
        }}
      >
        <div>My cool root layout</div>
        <span
          style={{ borderRight: "1px solid lightgray", alignSelf: "stretch" }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1em",
          }}
        >
          <Link href="/">Home</Link>
          <Link href="/foo">Foo</Link>
          <Link href="/bar">Bar</Link>
          <Link href="/bar/nested">Bar/Nested</Link>
          <SmallCounter />
        </div>
      </nav>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>{children}</div>
    </div>
  );
}
