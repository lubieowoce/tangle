"use client";

import { useState } from "react";

export const ExampleInput = ({
  initialState = "",
  placeholder,
}: {
  initialState?: string;
  placeholder?: string;
}) => {
  const [state, setState] = useState(initialState);
  return (
    <input
      placeholder={placeholder}
      value={state}
      onChange={(e) => setState(e.target.value)}
    />
  );
};
