import "server-only";

export async function getProfileFromDb({
  profileId,
}: {
  profileId: string | number;
}) {
  await sleep(500);
  const allProfileIds = Object.keys(db.profiles).sort();
  const index = allProfileIds.indexOf(profileId + "");

  if (index === -1) {
    throw new Error(`No profile with id: ${JSON.stringify(profileId)}`);
  }

  const prevProfileId = index !== 0 ? allProfileIds[index - 1] : null;
  const nextProfileId =
    index !== allProfileIds.length - 1 ? allProfileIds[index + 1] : null;

  const profile = db.profiles[profileId + ""];
  if (!profile) {
    throw new Error(`No profile with id: ${JSON.stringify(profileId)}`);
  }
  return { profile, prevProfileId, nextProfileId };
}

export async function getAllProfilesFromFb() {
  await sleep(700);
  return Object.entries(db.profiles).map(([profileId, profile]) => ({
    profileId,
    name: profile.name,
  }));
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

type ProfileData = { name: string; description: string };

const db = {
  profiles: {
    1: { name: "Alice", description: "Lorem ipsum" },
    2: { name: "Bob", description: "Dolor sit amet" },
    3: { name: "Camille", description: "Consectetur adipiscing elit" },
    4: { name: "Daniel", description: "Sed do eiusmod tempor incididunt" },
  } as Record<string, ProfileData>,
};
