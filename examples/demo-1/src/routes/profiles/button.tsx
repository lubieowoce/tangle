/// <reference types="react-dom/experimental" />

"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { twMerge } from "tailwind-merge";

type Action = (formData: FormData) => Promise<any>;

type ButtonProps = { action: Action } & ComponentProps<"button">;

function ButtonDisabledWhilePending({
  action,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const { pending } = useFormStatus();
  console.log("formStatus", { pending });
  return (
    <button disabled={disabled || pending} formAction={action} {...rest}>
      {children}
    </button>
  );
}

export function Button({
  action,
  props,
  children,
  className,
  ...rest
}: ButtonProps & { props?: Record<string, string> }) {
  return (
    <form>
      {props &&
        Object.entries(props).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      <ButtonDisabledWhilePending
        className={twMerge("w-full", className)}
        action={action}
        {...rest}
      >
        {children}
      </ButtonDisabledWhilePending>
    </form>
  );
}
