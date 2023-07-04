import { PropsWithChildren } from "react";
import { HTMLPage } from "@owoce/tangle/server";
import { Link } from "@owoce/tangle/client";
import {
  FadeOnPendingNavigation,
  RefreshButton,
} from "../components/navigation";
import { linkStyles } from "../components/styles";
import { Timestamp } from "../components/timestamp";

export default function Root({ children }: PropsWithChildren<{}>) {
  return (
    <HTMLPage>
      <main>
        <div className="min-h-screen">
          <div className="p-4 flex items-center gap-4 mb-2 border border-solid border-b border-x-0 border-t-0 border-b-gray-300">
            <span>Demo Page</span>
            <Link href="/" className={linkStyles}>
              Home
            </Link>
            <RefreshButton />
            <div className="flex-auto" />
            <Timestamp />
          </div>
          <FadeOnPendingNavigation>{children}</FadeOnPendingNavigation>
        </div>
      </main>
    </HTMLPage>
  );
}
