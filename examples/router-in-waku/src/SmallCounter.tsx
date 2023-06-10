"use client";

import { useState } from "react";

export const SmallCounter = () => {
  const [count, setCount] = useState(0);
  return (
    <span
      style={{
        outline: "2px blue dashed",
        display: "flex",
        alignItems: "center",
        padding: "0.5em",
        gap: "1ch",
      }}
    >
      <span>Count: {count}</span>
      <button onClick={() => setCount((c) => c + 1)}>+1</button>
      <button onClick={() => setCount((c) => c - 1)}>-1</button>
    </span>
  );
};
