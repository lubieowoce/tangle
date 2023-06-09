import { Link } from "@owoce/tangle/client";
import { getAllProfilesFromFb, getDbClient } from "../../server/db";

export default async function AllProfilesView(_props: { params: {} }) {
  const dbClient = await getDbClient();
  const profiles = await getAllProfilesFromFb(dbClient);
  const meta = <title>{`All profiles`}</title>;
  return (
    <>
      {meta}
      <div>
        {profiles.map(({ profileId, name }) => (
          <div
            key={profileId}
            style={{
              border: "2px solid black",
              borderRadius: "8px",
              padding: "8px",
            }}
          >
            <Link href={`/profile/${profileId}`}>
              <strong>{name}</strong>
            </Link>
          </div>
        ))}
      </div>
    </>
  );
}
