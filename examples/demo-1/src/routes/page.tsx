import { Link } from "@owoce/tangle/client";

export default function Root() {
  const meta = <title>{`Index`}</title>;
  return (
    <>
      {meta}
      <div>
        <h1>Index</h1>
        <Link href="/profiles">View all profiles</Link>
      </div>
    </>
  );
}
