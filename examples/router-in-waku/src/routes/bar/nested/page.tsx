import { Link } from "@owoce/tangle-router";

export default function PageBar() {
  return (
    <main>
      <h1>/bar/nested</h1>
      <p>Hello from a nested page within &quot;Bar&quot;!</p>
      <br />
      <Link href="/bar">Go back up</Link>
    </main>
  );
}
