import { Link } from "@owoce/tangle/client";
import { notFound } from "@owoce/tangle/server";
import { getDbClient, getProfileFromDb } from "../../../server/db";
import { Timestamp } from "../../../components/timestamp";

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
      <div
        style={{
          border: "2px solid green",
          borderRadius: "8px",
          padding: "8px",
        }}
      >
        <strong>{profile.name}</strong>
        <div>
          Profile id: {profileId} <Timestamp />
        </div>
        <p>{profile.description}</p>
        <Link href={`/profile/${profileId}/foo/bar`}>Foo</Link>
        <hr />
        <div style={{ display: "flex", gap: "16px", alignItems: "baseline" }}>
          {prevProfileId !== null ? (
            <Link href={`/profile/${prevProfileId}`}>← Prev</Link>
          ) : (
            <span style={{ color: "lightgrey" }}>← Prev</span>
          )}
          <Link href="/profiles">All</Link>
          {nextProfileId !== null ? (
            <Link href={`/profile/${nextProfileId}`}>Next →</Link>
          ) : (
            <span style={{ color: "lightgrey" }}>Next →</span>
          )}
        </div>
      </div>
    </>
  );
}
