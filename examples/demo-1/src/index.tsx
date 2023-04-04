import "server-only"; // poisoned import test
import { Suspense } from "react";
import { ClientChild } from "./components/client-child";
import { Counter } from "./components/client-counter";
import { Card, CardProps, Stack, Text } from "./components/common";
import { ServerChild } from "./components/server-child";
import { ServerRootProps } from "./root-props";
import { ClientInputForm } from "./components/client-input-form";
import { colorSets, themeVariables } from "./components/theme";
import { Timestamp } from "./components/timestamp";

export default function ServerRoot({ input }: ServerRootProps) {
  console.log("rendering ServerRoot", ClientChild);
  return (
    <main
      style={{
        fontFamily: "sans-serif",
        maxWidth: "600px",
        margin: "0 auto",
        ...themeVariables,
      }}
    >
      <Card {...colorSets.server}>
        <Stack>
          <div>
            <Text>
              Server root <Timestamp />
            </Text>
            <Text>
              Input is: <strong>{JSON.stringify(input)}</strong>
            </Text>
          </div>
          <ClientInputForm input={input} />
          <Counter id="0" />
          <Suspense
            fallback={
              <Card {...colorSets.loading}>
                <Text>ServerInner is loading... ⟳ (fake delay)</Text>
              </Card>
            }
          >
            {/* @ts-expect-error  async component */}
            <ServerRootInner {...colorSets.server}>
              <ClientChild>
                {/* @ts-expect-error  async component */}
                <ServerChild {...colorSets.server}>
                  <Text>
                    Input is: <strong>{JSON.stringify(input)}</strong>
                  </Text>
                </ServerChild>
              </ClientChild>
            </ServerRootInner>
          </Suspense>
        </Stack>
      </Card>
    </main>
  );
}

async function ServerRootInner({ children, ...props }: CardProps) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return (
    <Card {...props}>
      <Stack>
        <Text>
          Server inner <Timestamp />
        </Text>
        {children}
      </Stack>
    </Card>
  );
}
