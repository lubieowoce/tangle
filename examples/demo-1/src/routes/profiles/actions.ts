"use server";

import { revalidatePath } from "@owoce/tangle/server";

import { DBContents, ProfileData, getDbClient } from "../../server/db";
import { zfd } from "zod-form-data";
import { slowdown } from "../../support/slowdown";

const profileFormSchema = zfd.formData({
  name: zfd.text(),
  description: zfd.text(),
});

export async function addNewProfile(form: FormData) {
  const data = profileFormSchema.parse(form);
  return addNewProfileFromObject(data);
}

export async function addNewProfileFromArgs(
  // name: ProfileData["name"],
  // description: ProfileData["description"]
  ...args: [name: ProfileData["name"], description: ProfileData["description"]]
) {
  const [name, description] = args;
  return addNewProfileFromObject({ name, description });
}

export async function addNewProfileFromObject(data: ProfileData) {
  const newId = await createProfile(data);
  revalidatePath("/profiles");
  revalidatePath(`/profile/${newId}`);
  return newId;
}

async function createProfile(data: ProfileData) {
  const dbClient = await getDbClient();
  const contents = await dbClient.read();
  const newId =
    Math.max(...Object.keys(contents.profiles).map((id) => parseInt(id))) + 1;

  const newProfile: ProfileData = {
    ...data,
  };
  console.log("creating new profile", newId, newProfile);
  const newContents: DBContents = {
    ...contents,
    profiles: { ...contents.profiles, [newId]: newProfile },
  };

  dbClient.write(newContents);
  await slowdown(1_000);
  return newId;
}
