"use server";

import { PropsWithChildren, Suspense } from "react";
import { ClientChild } from "./client-child";
import { Card, Text } from "./common";

export default function ServerRoot() {
  return (
    <main
      style={{ fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}
    >
      <Card>
        <Text>Server root</Text>
        <Suspense
          fallback={
            <Card>
              <Text color="lightgrey">Inner is loading... ⟳</Text>
            </Card>
          }
        >
          {/* @ts-expect-error Async component */}
          <ServerRootInner color="green">
            <Text color="green">Inner loaded!</Text>
            <ClientChild />
          </ServerRootInner>
        </Suspense>
      </Card>
    </main>
  );
}

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
