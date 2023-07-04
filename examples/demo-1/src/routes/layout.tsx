import { PropsWithChildren } from "react";
import { createRouteLayout } from "../support/layout-template";
import { HTMLPage } from "@owoce/tangle/server";
import { Link } from "@owoce/tangle/client";
import {
  FadeOnPendingNavigation,
  RefreshButton,
} from "../components/navigation";
import { linkStyles } from "../components/styles";

const DummyLayout = createRouteLayout("RootLayout (/)");

export default function Root({ children }: PropsWithChildren<{}>) {
  return (
    <HTMLPage>
      <main>
        {/* @ts-expect-error  async component */}
        <DummyLayout params={{}}>
          <div className="flex gap-4">
            <Link href="/" className={linkStyles}>
              Home
            </Link>
            <RefreshButton />
          </div>
          <FadeOnPendingNavigation>{children}</FadeOnPendingNavigation>
        </DummyLayout>
      </main>
    </HTMLPage>
  );
}
