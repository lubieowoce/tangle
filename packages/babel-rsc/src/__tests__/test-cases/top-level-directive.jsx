"use server";
import { doSomethingOnTheServer } from "./server-stuff";

const SOME_CONSTANT = "beep";

export const test1 = async (formData) => {
  return doSomethingOnTheServer([formData, SOME_CONSTANT]);
};

export async function test2() {
  return doSomethingOnTheServer([SOME_CONSTANT]);
}

export { test2 as default, test2 as test3 };

async function test2a(formData) {
  return doSomethingOnTheServer([formData, SOME_CONSTANT]);
}

export { test2a };
