import { PropsWithChildren } from "react";
import { createRouteLayout } from "../support/layout-template";
import { HTMLPage } from "@owoce/tangle/server";
import { Link } from "@owoce/tangle/client";
import {
  FadeOnPendingNavigation,
  RefreshButton,
} from "../components/navigation";

const DummyLayout = createRouteLayout("RootLayout (/)");

export default function Root({ children }: PropsWithChildren<{}>) {
  return (
    <HTMLPage>
      <main>
        {/* @ts-expect-error  async component */}
        <DummyLayout params={{}}>
          <div style={{ display: "flex", gap: "16px" }}>
            <Link href="/">Home</Link>
            <RefreshButton />
          </div>
          <FadeOnPendingNavigation>{children}</FadeOnPendingNavigation>
        </DummyLayout>
      </main>
    </HTMLPage>
  );
}
