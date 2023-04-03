"use client";
import { useState } from "react";
import { Card, Stack, Text } from "./common";
import { colorSets } from "./theme";

export function Counter({ id }: { id: string }) {
  console.log(`rendering Counter (#${id})`);
  const [count, setCount] = useState(0);
  return (
    <Card {...colorSets.client}>
      <Stack direction="row" spacing="16px">
        <Text>
          Client counter (#{id}): <strong>{count}</strong>
        </Text>
        <Stack direction="row" spacing="8px">
          <button type="button" onClick={() => setCount((c) => c + 1)}>
            +1
          </button>
          <button type="button" onClick={() => setCount((c) => c - 1)}>
            -1
          </button>
        </Stack>
      </Stack>
    </Card>
  );
}
