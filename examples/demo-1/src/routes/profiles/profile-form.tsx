"use client";

import { useState } from "react";
import { addNewProfileFromObject } from "./actions";
import { buttonStyles } from "../../components/styles";
import { useNavigationContext } from "@owoce/tangle";
import { twMerge } from "tailwind-merge";

const formInputStyles =
  "bg-gray-200 appearance-none border-2 border-gray-200 rounded w-full py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500";

export const ClientProfileForm = () => {
  const [isPending, setIsPending] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { refresh } = useNavigationContext();

  return (
    <form
      className="flex flex-col items-stretch gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsPending(true);
        try {
          await addNewProfileFromObject({ name, description });
          refresh();
        } finally {
          setIsPending(false);
        }
      }}
    >
      <input
        type="text"
        value={name}
        placeholder="Name"
        onChange={(e) => setName(e.target.value)}
        className={formInputStyles}
      />
      <input
        type="text"
        value={description}
        placeholder="Description"
        onChange={(e) => setDescription(e.target.value)}
        className={formInputStyles}
      />
      <button
        disabled={isPending}
        className={twMerge(buttonStyles, "mb-0")}
        type="submit"
      >
        Create profile (direct action call + refresh)
      </button>
    </form>
  );
};
