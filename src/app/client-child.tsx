"use client";

import { PropsWithChildren, useEffect, useState } from "react";
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
      <Counter />
    </Card>
  );
};

const Counter = () => {
  const [count, setCount] = useState(0);
  return (
    <div
      style={{
        marginTop: "8px",
        display: "flex",
        gap: "8px",
        alignItems: "center",
        padding: "16px",
        border: "1px solid lightgrey",
        borderRadius: "8px",
      }}
    >
      <div>Interactive counter: {count}</div>
      <button type="button" onClick={() => setCount((c) => c + 1)}>
        +1
      </button>
      <button type="button" onClick={() => setCount((c) => c - 1)}>
        -1
      </button>
    </div>
  );
};
