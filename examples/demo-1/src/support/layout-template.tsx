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
      <div className="border-solid border-2 border-gray-300 rounded-lg p-2">
        <div className="mb-1">
          layout: {JSON.stringify(name)} {JSON.stringify(params)} <Timestamp />
        </div>
        {children}
      </div>
    );
  };

export const createRouteLoading = (name: string) =>
  function DummyLoading() {
    return <div className="text-gray-300">Loading segment {name}...</div>;
  };
