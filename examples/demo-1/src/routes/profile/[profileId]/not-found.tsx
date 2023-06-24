import { Timestamp } from "../../../components/timestamp";

export default function ProfileNotFound({
  params,
}: {
  params: { profileId: string };
}) {
  return (
    <div className="border-solid border-2 border-[tomato] rounded-lg p-2">
      <div className="mb-2">
        Could not find a profile with id {params.profileId}. <Timestamp />
      </div>
    </div>
  );
}
