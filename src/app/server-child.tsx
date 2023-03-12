import { PropsWithChildren } from "react";
import { Card, Text } from "./common";

export async function ServerChild({
  color,
  children,
}: PropsWithChildren<{ color: string }>) {
  return (
    <Card borderColor={color}>
      <Text>Server child</Text>
      {children}
    </Card>
  );
}
