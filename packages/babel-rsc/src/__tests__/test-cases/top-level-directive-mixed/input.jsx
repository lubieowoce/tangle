"use server";
import { doSomethingOnTheServer } from "../server-stuff";

const SOME_CONSTANT = "beep";

export const test1 = async (formData) => {
  return doSomethingOnTheServer(["top-level", formData, SOME_CONSTANT]);
};

const withAuth =
  (fn) =>
  async (...args) => {
    "use server";
    console.log("checking auth");
    return fn(...args);
  };

export const test4 = withAuth(async (x) => {
  "use server";
  return doSomethingOnTheServer(["inline-wrapped", x, SOME_CONSTANT]);
});
