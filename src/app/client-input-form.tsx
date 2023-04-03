"use client";
import { FormEvent, useState } from "react";
import { NavigateOptions, useNavigationContext } from "../navigation-context";

export function ClientInputForm({ input: initialInput }: { input: string }) {
  const { navigate, isNavigating } = useNavigationContext();
  const [inputState, setInputState] = useState(initialInput);

  const handleSubmit = (opts: Partial<NavigateOptions>) => (e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate({ input: inputState }, { noCache: true, ...opts });
  };
  return (
    <form
      onSubmit={handleSubmit({ instant: false })}
      style={{ display: "flex", gap: "16px", alignItems: "center" }}
    >
      <input
        type="text"
        value={inputState}
        onChange={(e) => setInputState(e.target.value)}
      />
      <input type="submit" value="Submit" />
      <button type="button" onClick={handleSubmit({ instant: true })}>
        Submit (no transition)
      </button>
      {isNavigating && "Loading..."}
    </form>
  );
}
