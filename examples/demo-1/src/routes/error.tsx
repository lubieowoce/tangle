import { Link } from "@owoce/tangle/client";

export default function Error() {
  return (
    <div className="border-solid border-2 border-[tomato] p-2 rounded-lg">
      <div className="mb-2">
        Something went very wrong. Please try reloading this page or{" "}
        <Link href="/">go to the homepage</Link>.
      </div>
    </div>
  );
}
