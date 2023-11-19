"use server";
import { doSomethingOnTheServer } from "./server-stuff";

const SOME_CONSTANT = "beep";

export const test1 = async (formData) => {
  return doSomethingOnTheServer([formData, SOME_CONSTANT]);
};

export async function test2() {
  return doSomethingOnTheServer([SOME_CONSTANT]);
}

// export default async () => {};

// async function test2a(formData) {
//   return doSomethingOnTheServer([formData, SOME_CONSTANT]);
// }

// export { test2a };

// const withAuth =
//   (fn) =>
//   async (...args) => {
//     "use server";
//     console.log("checking auth");
//     return fn(...args);
//   };

// export const test3 = withAuth(async (x) => {
//   "use server";
//   return doSomethingOnTheServer([x, SOME_CONSTANT]);
// });
