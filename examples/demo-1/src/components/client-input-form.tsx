"use client";
import { FormEvent, useState } from "react";
import { useNavigationContext } from "@owoce/tangle";
import { Card } from "./common";
import { colorSets } from "./theme";

// TODO: get server actions working

const SUBMIT_URL = `/`;

export function ClientInputForm({ input: initialInput }: { input: string }) {
  const { navigate, isNavigating } = useNavigationContext();
  const [inputState, setInputState] = useState(initialInput);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`${SUBMIT_URL}?input=${encodeURIComponent(inputState)}`);
  };
  return (
    <Card {...colorSets.client}>
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          gap: "16px",
          alignItems: "center",
          marginBottom: "unset",
        }}
      >
        <input
          type="text"
          value={inputState}
          onChange={(e) => setInputState(e.target.value)}
        />
        <input type="submit" value="Submit" />
        {isNavigating && "Loading..."}
      </form>
    </Card>
  );
}
