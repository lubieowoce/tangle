import { Link } from "@owoce/tangle";
import { getAllProfilesFromFb } from "../../server/db";

export default function AllProfilesView({ params }: { params: {} }) {
  const profiles = getAllProfilesFromFb();
  return (
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
  );
}
