import type { PropsWithChildren } from "react";

export function Text({
  children,
  color,
}: PropsWithChildren<{ color?: string }>) {
  return (
    <div style={{ lineHeight: "1.5", fontFamily: "sans-serif", color }}>
      {children}
    </div>
  );
}

export function Card({
  children,
  borderColor = "lightgrey",
}: PropsWithChildren<{ borderColor?: string }>) {
  return (
    <div
      style={{
        padding: "16px",
        borderRadius: "8px",
        border: "2px dashed",
        borderColor,
      }}
    >
      {children}
    </div>
  );
}
