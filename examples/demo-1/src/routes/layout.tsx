import { PropsWithChildren } from "react";
import { createRouteLayout } from "../support/layout-template";
import { HTMLPage } from "@owoce/tangle";

const DummyLayout = createRouteLayout("RootLayout (/)");

export default function Root({ children }: PropsWithChildren<{}>) {
  return (
    <HTMLPage>
      <main>
        <DummyLayout params={{}}>{children}</DummyLayout>
      </main>
    </HTMLPage>
  );
}
