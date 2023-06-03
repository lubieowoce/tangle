import { Timestamp } from "../../../components/timestamp";

export default function Error() {
  return (
    <div
      style={{
        border: "2px solid tomato",
        borderRadius: "8px",
        padding: "8px",
      }}
    >
      <div style={{ marginBottom: "8px" }}>
        Something went wrong while loading profile. <Timestamp />
      </div>
    </div>
  );
}
