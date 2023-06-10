import { Link } from "@owoce/tangle-router";

export default function PageBar() {
  return (
    <main>
      <h1>/bar</h1>
      <p>
        Hello from the &quot;Bar&quot; page!
        <br />
        <Link href="/bar/nested">Go deeper</Link>
      </p>
    </main>
  );
}
