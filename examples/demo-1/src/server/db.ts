import "server-only";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

type DBContents = {
  profiles: Record<string, ProfileData>;
};

type UnPromise<PT> = PT extends Promise<infer T> ? T : never;

export type DBClient = UnPromise<ReturnType<typeof getDbClient>>;

const initialContents: DBContents = {
  profiles: {
    1: { name: "Alice", description: "Lorem ipsum" },
    2: { name: "Bob", description: "Dolor sit amet" },
    3: { name: "Camille", description: "Consectetur adipiscing elit" },
    4: { name: "Daniel", description: "Sed do eiusmod tempor incididunt" },
  },
};

// TODO: wrap this in react's `cache`?
export async function getDbClient({
  storagePath,
}: { storagePath?: string } = {}) {
  const storage = storagePath ?? path.join(os.tmpdir(), "tangle-demo-db.json");
  console.log("Storing profiles in", storage);

  async function read() {
    return JSON.parse(await fs.readFile(storage, "utf-8")) as DBContents;
  }

  async function write(contents: DBContents) {
    return fs.writeFile(storage, JSON.stringify(contents, null, 4));
  }

  try {
    await fs.access(storage, fs.constants.F_OK);
  } catch (_) {
    await write(initialContents);
  }

  return {
    read,
    write,
  };
}

export async function getProfileFromDb(
  dbClient: DBClient,
  {
    profileId,
  }: {
    profileId: string | number;
  }
) {
  await sleep(500);
  const data = await dbClient.read();
  const allProfileIds = Object.keys(data.profiles).sort();
  const index = allProfileIds.indexOf(profileId + "");

  if (index === -1) {
    throw new Error(`No profile with id: ${JSON.stringify(profileId)}`);
  }

  const prevProfileId = index !== 0 ? allProfileIds[index - 1] : null;
  const nextProfileId =
    index !== allProfileIds.length - 1 ? allProfileIds[index + 1] : null;

  const profile = data.profiles[profileId + ""];
  if (!profile) {
    throw new Error(`No profile with id: ${JSON.stringify(profileId)}`);
  }
  return { profile, prevProfileId, nextProfileId };
}

export async function getAllProfilesFromFb(dbClient: DBClient) {
  await sleep(700);
  const db = await dbClient.read();
  return Object.entries(db.profiles).map(([profileId, profile]) => ({
    profileId,
    name: profile.name,
  }));
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

type ProfileData = { name: string; description: string };
