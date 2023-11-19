"use server";

"babel-rsc/actions: {\"id\":\"173aba84aa3f77c287bc2b3ed4eef2dd4b1c9502\",\"names\":[\"test1\",\"test2\"]}";
import { registerServerReference as _registerServerReference } from "react-server-dom-webpack/server";
import { doSomethingOnTheServer } from "./server-stuff";
const SOME_CONSTANT = "beep";
export const test1 = async formData => {
  return doSomethingOnTheServer([formData, SOME_CONSTANT]);
};
_registerServerReference(test1, "173aba84aa3f77c287bc2b3ed4eef2dd4b1c9502", "test1")
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
_registerServerReference(test2, "173aba84aa3f77c287bc2b3ed4eef2dd4b1c9502", "test2")