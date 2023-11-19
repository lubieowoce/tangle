"babel-rsc/actions: {\"id\":\"173aba84aa3f77c287bc2b3ed4eef2dd4b1c9502\",\"names\":[\"test1\",\"test2\",\"default\",\"test3\",\"test2a\"]}";
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
_registerServerReference(test2, "173aba84aa3f77c287bc2b3ed4eef2dd4b1c9502", "test2")
export { test2 as default, test2 as test3 };
async function test2a(formData) {
  return doSomethingOnTheServer([formData, SOME_CONSTANT]);
}
_registerServerReference(test2a, "173aba84aa3f77c287bc2b3ed4eef2dd4b1c9502", "test2a")
export { test2a };