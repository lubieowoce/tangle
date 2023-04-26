import { Link } from "@owoce/tangle";
import { getProfileFromDb } from "../../../server/db";
import { Timestamp } from "../../../components/timestamp";

type Params = { profileId: string };

export default async function ProfileView({ params }: { params: Params }) {
  const profileId = Number(params.profileId ?? "0");
  const { profile, nextProfileId, prevProfileId } = await getProfileFromDb({
    profileId,
  });
  return (
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
      <Link href={`/profile/${profileId}/foo`}>Foo</Link>
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
  );
}
