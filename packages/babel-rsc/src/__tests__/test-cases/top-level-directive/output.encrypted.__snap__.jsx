"babel-rsc/actions: {\"id\":\"c90d0c9037fc6688f68b459b16e90947f518beb4\",\"names\":[\"test1\",\"test2\",\"default\",\"test3\",\"test2a\"]}";
import { registerServerReference as _registerServerReference } from "react-server-dom-webpack/server";
import { doSomethingOnTheServer } from "../server-stuff";
const SOME_CONSTANT = "beep";
export const test1 = async formData => {
  return doSomethingOnTheServer([formData, SOME_CONSTANT]);
};
_registerServerReference(test1, "c90d0c9037fc6688f68b459b16e90947f518beb4", "test1")
export async function test2() {
  return doSomethingOnTheServer([SOME_CONSTANT]);
}
_registerServerReference(test2, "c90d0c9037fc6688f68b459b16e90947f518beb4", "test2")
export { test2 as default, test2 as test3 };
async function test2a(formData) {
  return doSomethingOnTheServer([formData, SOME_CONSTANT]);
}
_registerServerReference(test2a, "c90d0c9037fc6688f68b459b16e90947f518beb4", "test2a")
export { test2a };