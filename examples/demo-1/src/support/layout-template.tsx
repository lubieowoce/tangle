import { PropsWithChildren } from "react";
import { Timestamp } from "../components/timestamp";
import { slowdown } from "./slowdown";

export const createRouteLayout = (
  name: string,
  opts: { delay?: boolean } = {}
) =>
  async function DummyLayout({
    params,
    children,
  }: PropsWithChildren<{ params: Record<string, string> }>) {
    if (opts.delay) {
      await slowdown(500);
    }
    return (
      <div
        style={{
          border: "2px solid lightgrey",
          borderRadius: "8px",
          padding: "8px",
        }}
      >
        <div style={{ marginBottom: "8px" }}>
          layout: {JSON.stringify(name)} {JSON.stringify(params)} <Timestamp />
        </div>
        {children}
      </div>
    );
  };

export const createRouteLoading = (name: string) =>
  function DummyLoading() {
    return <div style={{ color: "lightgrey" }}>Loading segment {name}...</div>;
  };
