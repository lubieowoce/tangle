/* eslint-disable max-statements */
import { Link } from "@owoce/tangle/client";
import {
  ProfileData,
  getAllProfilesFromFb,
  getDbClient,
} from "../../server/db";
import { buttonStyles } from "../../components/styles";
import { addNewProfile, addNewProfileFromObject } from "./actions";
import { Button } from "./button";
import { ClientProfileForm } from "./profile-form";

const getExampleProfile = (nameSuffix = ""): ProfileData => {
  nameSuffix = nameSuffix ? " " + nameSuffix : "";
  return {
    name: "Example name" + nameSuffix,
    description: "Example description" + nameSuffix,
  };
};

export default async function AllProfilesView(_props: { params: {} }) {
  const dbClient = await getDbClient();
  const profiles = await getAllProfilesFromFb(dbClient);
  const meta = <title>{`All profiles`}</title>;

  async function inlineAction1() {
    "use server";
    await addNewProfileFromObject(
      getExampleProfile(`(from prop: ${profilesCount})`)
    );
  }

  const profilesCount = profiles.length;

  async function inlineActionWrapped() {
    "use server";
    console.log("calling inlineAction1", inlineAction1);
    return inlineAction1();
  }

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
          props={getExampleProfile("(form action)")}
          className={buttonStyles}
          action={addNewProfile}
        >
          Create new profile (via form action)
        </Button>
        <Button
          className={buttonStyles}
          action={addNewProfileFromObject.bind(
            null,
            getExampleProfile("(bind object)")
          )}
        >
          Create new profile (via form action + bind)
        </Button>
        <Button className={buttonStyles} action={inlineAction1}>
          Create new profile (via inline form action 1, prop: {profilesCount})
        </Button>
        <Button className={buttonStyles} action={inlineActionWrapped}>
          Create new profile (via inline form action [wrapped], prop:{" "}
          {profilesCount})
        </Button>
        <Button className={buttonStyles} action={wrappedAction}>
          Create new profile (via inline form action [higher-order wrapper])
        </Button>
        <ButtonWithActionAfterReturn prop={profilesCount} />
        <Button
          className={buttonStyles}
          action={async () => {
            "use server";
            await addNewProfileFromObject(
              getExampleProfile(`(from prop: ${profilesCount})`)
            );
          }}
        >
          Create new profile (via inline form action 2, prop: {profilesCount})
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

function ButtonWithActionAfterReturn({ prop }: { prop: string | number }) {
  const x = prop;
  return (
    <Button className={buttonStyles} action={inlineAction}>
      Create new profile (via inline form action [after return], prop: {x})
    </Button>
  );

  async function inlineAction() {
    "use server";
    await addNewProfileFromObject(
      getExampleProfile(`(defined after return, prop: ${x})`)
    );
  }
}

const withAuth =
  <TFn extends (...args: any[]) => Promise<any>>(fn: TFn) =>
  async (...args: Parameters<TFn>): Promise<Awaited<ReturnType<TFn>>> => {
    "use server";
    console.log("fake auth check");
    return fn(...args);
  };

const wrappedAction = withAuth(async () => {
  "use server";
  await addNewProfileFromObject(
    getExampleProfile(`(wrapped in higher-order wrapper)`)
  );
});
