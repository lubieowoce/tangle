"use client";
import "client-only"; // poisoned import test
import { PropsWithChildren, useEffect, useState } from "react";
import { Counter } from "./client-counter";
import { Card, Stack, Text } from "./common";
import { colorSets } from "./theme";

export const ClientChild = ({ children }: PropsWithChildren<{}>) => {
  console.log("rendering ClientChild");
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);
  const colorSet = isClient ? colorSets.client : colorSets.loading;
  return (
    <Card {...colorSet}>
      <Stack>
        {isClient ? (
          <Text>Client child hydrated!</Text>
        ) : (
          <Text>Client child not hydrated yet...</Text>
        )}
        {children}
        <Counter id="1" />
      </Stack>
    </Card>
  );
};
