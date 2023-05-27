export default function Loading({ params }: { params: { profileId: string } }) {
  return (
    <div
      style={{
        border: "2px solid lightgrey",
        borderRadius: "8px",
        padding: "8px",
        color: "lightgrey",
      }}
    >
      Loading profile {params.profileId}...
    </div>
  );
}
