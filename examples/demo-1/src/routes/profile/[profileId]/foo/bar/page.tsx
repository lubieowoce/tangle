import { Link } from "@owoce/tangle/client";

export default function Page({ params }: { params: { profileId: string } }) {
  return (
    <div
      style={{
        border: "2px solid orange",
        borderRadius: "8px",
        padding: "8px",
      }}
    >
      <h3 style={{ margin: "unset" }}>
        A profile subpage that shares the profileId layout
      </h3>
      <Link href={`/profile/${params.profileId}`}>Back to profile</Link>
    </div>
  );
}
