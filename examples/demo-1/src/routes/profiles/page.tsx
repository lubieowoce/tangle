import { Link } from "@owoce/tangle/client";
import { getAllProfilesFromFb, getDbClient } from "../../server/db";
import { buttonStyles } from "../../components/styles";
import { addNewProfile, addNewProfileFromObject } from "./actions";
import { Button } from "./button";

console.log("AllProfilesView buttonStyles", buttonStyles);

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
            <div className="border-solid border-2 border-gray-300 rounded-lg p-2 mb-1 hover:bg-gray-200 transition-[background]">
              <strong>{name}</strong>
            </div>
          </Link>
        ))}
      </div>
      <div className="flex mt-2">
        <Button
          props={{ name: "Test name (from form)", description: "Lorem ipsum" }}
          className={buttonStyles}
          action={addNewProfile}
        >
          Create new profile (via form)
        </Button>
        <form>
          <button
            className={buttonStyles}
            // @ts-expect-error  missing 'formAction' prop
            formAction={addNewProfileFromObject.bind(null, {
              name: "Test name (from bind)",
              description: "Lorem ipsum",
            })}
          >
            Create new profile (via bind)
          </button>
        </form>
      </div>
    </>
  );
}
