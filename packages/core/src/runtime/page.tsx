import { PropsWithChildren } from "react";
// import { variables } from "../../../../examples/demo-1/src/theme";

export function HTMLPage({ children }: PropsWithChildren<{}>) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body /* style={variables} */>{children}</body>
    </html>
  );
}
