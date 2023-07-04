import { Link } from "@owoce/tangle/client";
import { linkStyles } from "../../../../../components/styles";

// react uses "T" nodes in the payload for strings over 1024 bytes.
// this may not be bytes (more like codepoints) but it should at least go over that threshold
const repeatOver1024 = (s: string, sep = "\n") => {
  s += sep;
  return s.repeat(Math.ceil(1024 / s.length));
};

export default function Page({ params }: { params: { profileId: string } }) {
  return (
    <div className="border-solid border-2 border-orange-400 rounded-lg p-2">
      <h3>A profile subpage that shares the profileId layout</h3>
      <p className="my-4 ">
        A long string to make react output a &quot;T&quot; node in the payload:{" "}
        <span className="opacity-40 whitespace-pre">
          {repeatOver1024("Pchnąć w tę łódź jeża i óśm skrzyń fig 🦔 ⛵️ 🗃️")}
        </span>
      </p>
      <Link href={`/profile/${params.profileId}`} className={linkStyles}>
        Back to profile
      </Link>
    </div>
  );
}
