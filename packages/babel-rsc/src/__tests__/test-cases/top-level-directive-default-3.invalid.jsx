"use server";
import { doSomethingOnTheServer } from "./server-stuff";

const SOME_CONSTANT = "beep";

async function test(formData) {
  return doSomethingOnTheServer([formData, SOME_CONSTANT]);
}

export default test;
