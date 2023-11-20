"use client";
import { useFormState } from "react-dom";
import type { ProfileData } from "../../../server/db";
import { SubmitButton } from "../../profiles/button";
import { buttonStyles } from "../../../components/styles";

type FormState = { profile: ProfileData; message: string };

export function ProfileEditForm({
  data,
  action,
}: {
  data: ProfileData;
  action: (state: FormState, payload: FormData) => Promise<FormState>;
}) {
  const [state, dispatch] = useFormState<FormState, FormData>(action, {
    profile: data,
    message: "",
  });
  return (
    <div>
      <form action={dispatch}>
        <input name="name" type="text" defaultValue={state.profile.name} />
        <br />
        <textarea
          name="description"
          rows={4}
          defaultValue={state.profile.description}
        />
        <br />
        <SubmitButton type="submit" className={buttonStyles}>
          Update profile
        </SubmitButton>
      </form>
      {state.message && <div>{state.message}</div>}
    </div>
  );
}
