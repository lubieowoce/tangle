"use server";
import { doSomethingOnTheServer } from "../server-stuff";

const SOME_CONSTANT = "beep";

export default async (formData) => {
  return doSomethingOnTheServer([formData, SOME_CONSTANT]);
};
