declare module "react-server-dom-webpack/server" {
  export function registerServerReference<
    TFn extends (...args: any[]) => Promise<any>
  >(action: TFn, id: string, exportedName: string): TFn;
}

declare module "@example/my-framework/encryption" {
  type ReactServerValue = any;
  type EncryptedValue = string;

  export function encryptActionBoundArgs(
    boundArgs: ReactServerValue[],
    actionModuleId: string,
    actionName: string
  ): Promise<EncryptedValue>;

  export function decryptActionBoundArgs(
    raw: EncryptedValue,
    actionModuleId: string,
    actionName: string
  ): Promise<ReactServerValue[]>;
}
