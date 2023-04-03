import "server-only"; // poisoned import test
import { PropsWithChildren, Suspense } from "react";
import { ClientChild } from "./client-child";
import { Counter } from "./client-counter";
import { Card, Text } from "./common";
import { ServerChild } from "./server-child";
import { ServerRootProps } from "./root-props";
import { ClientInputForm } from "./client-input-form";

export default function ServerRoot({ input }: ServerRootProps) {
  console.log("rendering ServerRoot", ClientChild);
  return (
    <main
      style={{ fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}
    >
      <Card>
        <Text>ServerRoot</Text>
        <div>
          <Text>Input is: {JSON.stringify(input)}</Text>
        </div>
        <ClientInputForm input={input} />
        <Counter id="0" />
        <Suspense
          fallback={
            <Card>
              <Text color="lightgrey">
                ServerInner is loading... ⟳ (fake delay)
              </Text>
            </Card>
          }
        >
          {/* @ts-expect-error  async component */}
          <ServerRootInner color="green">
            <ClientChild>
              {/* @ts-expect-error  async component */}
              <ServerChild color="teal">
                <Text>Input is: {JSON.stringify(input)}</Text>
              </ServerChild>
            </ClientChild>
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
      <Text color="green">ServerInner ready!</Text>
      {children}
    </Card>
  );
}
