import { PropsWithChildren, Suspense } from "react";
import { ClientChild } from "./client-child";
import { Card, Text } from "./common";
import { ServerChild } from "./server-child";

export default function ServerRoot() {
  console.log("rendering ServerRoot", ClientChild);
  return (
    <main
      style={{ fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}
    >
      <Card>
        <Text>Server root</Text>
        {/* <Suspense fallback="Fallback for ClientChild"> */}
        <ClientChild>
          {/* @ts-expect-error  async component */}
          <ServerChild color="teal" />
        </ClientChild>
        {/* </Suspense> */}
      </Card>
    </main>
  );
}

// <Card>
//   <Text>Server root</Text>
//   <Suspense
//     fallback={
//       <Card>
//         <Text color="lightgrey">Inner is loading... ⟳</Text>
//       </Card>
//     }
//   >
//     {/* @ts-expect-error  async component */}
//     <ServerRootInner color="green">
//       <Text color="green">Inner loaded!</Text>
//       <ClientChild>
//         {/* @ts-expect-error  async component */}
//         <ServerChild color="teal" />
//       </ClientChild>
//     </ServerRootInner>
//   </Suspense>
// </Card>;

async function ServerRootInner({
  color,
  children,
}: PropsWithChildren<{ color: string }>) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return (
    <Card borderColor={color}>
      <Text>Server inner</Text>
      {children}
    </Card>
  );
}
