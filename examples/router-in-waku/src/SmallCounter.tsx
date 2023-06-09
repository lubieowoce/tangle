"use client";

import { useState } from "react";

export const SmallCounter = () => {
  const [count, setCount] = useState(0);
  return (
    <span
      style={{
        border: "1px blue dashed",
        display: "flex",
        alignItems: "center",
      }}
    >
      <span>Count: {count}</span>
      <button onClick={() => setCount((c) => c + 1)}>+1</button>
      <button onClick={() => setCount((c) => c - 1)}>-1</button>
    </span>
  );
};
