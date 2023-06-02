import { PropsWithChildren } from "react";
import { createRouteLayout } from "../support/layout-template";
import { HTMLPage } from "@owoce/tangle";
import { RefreshButton } from "../components/navigation";

const DummyLayout = createRouteLayout("RootLayout (/)");

export default function Root({ children }: PropsWithChildren<{}>) {
  return (
    <HTMLPage>
      <main>
        {/* @ts-ignore  async component */}
        <DummyLayout params={{}}>
          <div>
            <RefreshButton />
          </div>
          {children}
        </DummyLayout>
      </main>
    </HTMLPage>
  );
}
