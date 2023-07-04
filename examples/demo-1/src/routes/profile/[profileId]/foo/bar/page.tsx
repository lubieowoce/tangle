import { Link } from "@owoce/tangle/client";
import { linkStyles } from "../../../../../components/styles";

export default function Page({ params }: { params: { profileId: string } }) {
  return (
    <div className="border-solid border-2 border-orange-400 rounded-lg p-2">
      <h3>A profile subpage that shares the profileId layout</h3>
      <Link href={`/profile/${params.profileId}`} className={linkStyles}>
        Back to profile
      </Link>
    </div>
  );
}
