import { doSomethingOnTheServer } from "./server-stuff";

const SOME_CONSTANT = "beep";

export const test1 = async (x) => {
  "use server";
  return doSomethingOnTheServer([x, SOME_CONSTANT]);
};

export async function test2(x) {
  "use server";
  return doSomethingOnTheServer([x, SOME_CONSTANT]);
}

async function test2a(x) {
  "use server";
  return doSomethingOnTheServer([x, SOME_CONSTANT]);
}

export { test2a };

const withAuth =
  (fn) =>
  async (...args) => {
    "use server";
    console.log("checking auth");
    return fn(...args);
  };

export const test3 = withAuth(async (x) => {
  "use server";
  return doSomethingOnTheServer([x, SOME_CONSTANT]);
});
