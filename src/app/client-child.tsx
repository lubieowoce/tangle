"use client";

import { PropsWithChildren, useEffect, useState } from "react";
import { Card, Text } from "./common";

export const ClientChild = ({ children }: PropsWithChildren<{}>) => {
  console.log("rendering ClientChild");
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);
  const color = isClient ? "tomato" : "lightgrey";
  return (
    <Card borderColor={color}>
      {isClient ? (
        <Text color={color}>ClientChild initialized!</Text>
      ) : (
        <Text color={color}>ClientChild not initialized yet...</Text>
      )}
      {children}
    </Card>
  );
};
