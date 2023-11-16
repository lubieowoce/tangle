declare module "react-server-dom-webpack/server" {
  export function registerServerReference<
    TFn extends (...args: any[]) => Promise<any>
  >(action: TFn, id: string, exportedName: string): TFn;
}
