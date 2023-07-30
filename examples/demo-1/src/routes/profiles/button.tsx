"use client";

import type { ComponentProps } from "react";
import { experimental_useFormStatus as useFormStatus } from "react-dom";
import { twMerge } from "tailwind-merge";

// FIXME: we need to update '@types/react-dom'

declare module "react-dom" {
  // https://github.com/facebook/react/blob/8ec962d825fc948ffda5ab863e639cd4158935ba/packages/react-dom-bindings/src/shared/ReactDOMFormActions.js#L17-L31

  type FormStatusNotPending = {
    pending: false;
    data: null;
    method: null;
    action: null;
  };

  type FormStatusPending = {
    pending: true;
    data: FormData;
    method: string;
    action: string | ((formData: FormData) => void | Promise<void>);
  };

  export type FormStatus = FormStatusPending | FormStatusNotPending;
  export function experimental_useFormStatus(): FormStatus;
}

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
    <button
      disabled={disabled || pending}
      // @ts-expect-error missing type for 'formAction'
      formAction={action}
      {...rest}
    >
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
