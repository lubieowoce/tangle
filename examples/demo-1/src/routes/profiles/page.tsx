import { Link } from "@owoce/tangle/client";
import {
  ProfileData,
  getAllProfilesFromFb,
  getDbClient,
} from "../../server/db";
import { buttonStyles } from "../../components/styles";
import {
  addNewProfile,
  addNewProfileFromArgs,
  addNewProfileFromObject,
} from "./actions";
import { Button } from "./button";
import { ClientProfileForm } from "./profile-form";

export default async function AllProfilesView(_props: { params: {} }) {
  const dbClient = await getDbClient();
  const profiles = await getAllProfilesFromFb(dbClient);
  const meta = <title>{`All profiles`}</title>;

  const getExample = (nameSuffix = ""): ProfileData => {
    nameSuffix = nameSuffix ? " " + nameSuffix : "";
    return {
      name: "Example name" + nameSuffix,
      description: "Example description" + nameSuffix,
    };
  };
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
      <div className="mt-8" />
      <div>
        <ClientProfileForm />
      </div>
      <hr className="my-8" />
      <div className="flex flex-col items-stretch gap-2">
        <Button
          props={getExample("(form action)")}
          className={buttonStyles}
          action={addNewProfile}
        >
          Create new profile (via form action)
        </Button>
        <Button
          className={buttonStyles}
          action={addNewProfileFromObject.bind(
            null,
            getExample("(bind object)")
          )}
        >
          Create new profile (via form action + bind)
        </Button>
        {/* TODO: registerServerReference only supports one level of .bind(). Is that intentional? */}
        {/* {(() => {
          const data = getExample("(bind individual args)");
          return (
            <Button
              className={buttonStyles}
              action={addNewProfileFromArgs
                .bind(null, data.name)
                .bind(null, data.description)}
            >
              Create new profile (via form action + bind x2)
            </Button>
          );
        })()} */}
      </div>
    </>
  );
}
