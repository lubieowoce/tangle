import { Link } from "@owoce/tangle";

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
        Something went very wrong. Please try reloading this page or{" "}
        <Link href="/">go to the homepage</Link>.
      </div>
    </div>
  );
}
