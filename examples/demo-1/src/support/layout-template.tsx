import { PropsWithChildren } from "react";
import { Timestamp } from "../components/timestamp";

export const createRouteLayout =
  (name: string) =>
  ({
    params,
    children,
  }: PropsWithChildren<{ params: Record<string, string> }>) =>
    (
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
