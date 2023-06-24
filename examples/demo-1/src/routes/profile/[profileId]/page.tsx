import { Link } from "@owoce/tangle/client";
import { notFound } from "@owoce/tangle/server";
import { getDbClient, getProfileFromDb } from "../../../server/db";
import { Timestamp } from "../../../components/timestamp";
import { linkStyles } from "../../../components/styles";

type Params = { profileId: string };

export default async function ProfileView({ params }: { params: Params }) {
  const profileId = Number(params.profileId ?? "0");
  const dbClient = await getDbClient();
  const { profile, nextProfileId, prevProfileId } = await getProfileFromDb(
    dbClient,
    {
      profileId,
    }
  ).catch(() => {
    console.log("failed to fetch profile " + profileId + ", throwing notFound");
    notFound();
  });
  const meta = <title>{`Profile: ${profile.name}`}</title>;
  return (
    <>
      {meta}
      <div className="border-solid border-2 border-green-600 p-2 rounded-lg">
        <strong>{profile.name}</strong>
        <div>
          Profile id: {profileId} <Timestamp />
        </div>
        <p>{profile.description}</p>
        <Link href={`/profile/${profileId}/foo/bar`} className={linkStyles}>
          Foo
        </Link>
        <hr className="my-1" />
        <div className="flex gap-4 items-baseline">
          {prevProfileId !== null ? (
            <Link href={`/profile/${prevProfileId}`} className={linkStyles}>
              ← Prev
            </Link>
          ) : (
            <span className="text-gray-400">← Prev</span>
          )}
          <Link href="/profiles" className={linkStyles}>
            All
          </Link>
          {nextProfileId !== null ? (
            <Link href={`/profile/${nextProfileId}`} className={linkStyles}>
              Next →
            </Link>
          ) : (
            <span className="text-gray-400">Next →</span>
          )}
        </div>
      </div>
    </>
  );
}
