import { Link } from "@owoce/tangle/client";
import { linkStyles } from "../components/styles";

export default function Root() {
  const meta = <title>{`Index`}</title>;
  return (
    <>
      {meta}
      <div>
        <h1 className="text-xl">Index!</h1>
        <div className="mt-2">
          <Link href="/profiles" className={linkStyles}>
            View all profiles
          </Link>
        </div>
      </div>
    </>
  );
}
