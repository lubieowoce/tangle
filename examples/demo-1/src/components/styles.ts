import clsx from "clsx";

export const linkStyles =
  "font-medium text-blue-600 dark:text-blue-500 hover:underline";

export const buttonStyles = clsx(
  "text-white",
  "font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2",
  "bg-blue-700 hover:bg-blue-800",
  "dark:bg-blue-600 dark:hover:bg-blue-700",
  "[&[disabled]]:bg-blue-200 [&[disabled]]:cursor-not-allowed",
  "focus:ring focus:ring-blue-300",
  "focus:outline-none dark:focus:ring-blue-800"
);

export const contentWrapperStyles = "max-w-prose mx-auto p-4";
