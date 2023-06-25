import { PropsWithChildren } from "react";
import { Timestamp } from "../components/timestamp";
import { slowdown } from "./slowdown";

export const createRouteLayout = (
  name: string,
  opts: { delay?: boolean; className?: string } = {}
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
        className={
          opts.className ??
          "border-solid border-2 border-gray-300 rounded-lg p-4"
        }
      >
        <div className="mb-1">
          layout: {JSON.stringify(name)} {JSON.stringify(params)} <Timestamp />
        </div>
        {children}
      </div>
    );
  };

export const createRouteLoading = (
  name: string,
  opts: { className?: string } = {}
) =>
  function DummyLoading() {
    return (
      <div className={`text-gray-300 ${opts.className}`}>
        Loading segment {name}...
      </div>
    );
  };
