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
          <Link key={profileId} href={`/profile/${profileId}`}>
            <div className="border-solid border-2 border-gray-600 rounded-lg p-2 mb-1 hover:bg-gray-200 transition-[background]">
              <strong>{name}</strong>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
