"use client";
import { useState } from "react";
import { Card, Text } from "./common";

export function Counter({ id }: { id: string }) {
  const [count, setCount] = useState(0);
  return (
    <Card>
      <Text>
        Client counter (#{id}): {count}
      </Text>
      <button type="button" onClick={() => setCount((c) => c + 1)}>
        +1
      </button>
      <button type="button" onClick={() => setCount((c) => c - 1)}>
        -1
      </button>
    </Card>
  );
}
