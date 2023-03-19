"use client";

import { PropsWithChildren, useEffect, useState } from "react";
import { Counter } from "./client-counter";
import { Card, Text } from "./common";

export const ClientChild = ({ children }: PropsWithChildren<{}>) => {
  console.log("rendering ClientChild");
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);
  const color = isClient ? "tomato" : "#efa2a2";
  return (
    <Card borderColor={color}>
      {isClient ? (
        <Text color={color}>ClientChild hydrated!</Text>
      ) : (
        <Text color={color}>ClientChild not hydrated yet...</Text>
      )}
      {children}
      <Counter id="1" />
    </Card>
  );
};
