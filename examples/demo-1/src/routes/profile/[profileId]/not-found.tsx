import { Timestamp } from "../../../components/timestamp";

export default function ProfileNotFound({
  params,
}: {
  params: { profileId: string };
}) {
  return (
    <div
      style={{
        border: "2px solid tomato",
        borderRadius: "8px",
        padding: "8px",
      }}
    >
      <div style={{ marginBottom: "8px" }}>
        Could not find a profile with id {params.profileId}. <Timestamp />
      </div>
    </div>
  );
}
