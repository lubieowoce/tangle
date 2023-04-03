import type { PropsWithChildren } from "react";

export type TextProps = PropsWithChildren<{
  as?: "div" | "span" | "small" | "strong" | "em";
  color?: string;
  fontWeight?: string;
  style?: React.CSSProperties;
}>;

export function Text({
  as: AsComponent = "div",
  children,
  color,
  fontWeight,
  style,
}: TextProps) {
  return (
    <AsComponent
      style={{
        ...style,
        lineHeight: "1.5",
        fontFamily: "sans-serif",
        color,
        fontWeight,
      }}
    >
      {children}
    </AsComponent>
  );
}

export type CardProps = PropsWithChildren<{
  color?: string;
  borderColor?: string;
  backgroundColor?: string;
  borderStyle?: string;
}>;

export function Card({
  children,
  color,
  borderColor = "lightgrey",
  backgroundColor = "unset",
  borderStyle = "solid",
}: CardProps) {
  return (
    <div
      style={{
        padding: "16px",
        borderRadius: "8px",
        border: `2px ${borderStyle}`,
        color,
        borderColor,
        backgroundColor,
      }}
    >
      {children}
    </div>
  );
}

export function Stack({
  children,
  spacing = "16px",
  direction = "column",
}: PropsWithChildren<{ spacing?: string; direction?: "row" | "column" }>) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: direction,
        gap: spacing,
        alignItems: "stretch",
      }}
    >
      {children}
    </div>
  );
}
