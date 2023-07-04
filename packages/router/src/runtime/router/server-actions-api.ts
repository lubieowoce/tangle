import { AsyncLocalStorage } from "node:async_hooks";

export type ServerActionResults = {
  revalidatePaths: string[];
};

type RouterApi = {
  revalidatePath(path: string): void;
};

const RouterAsyncStorage = new AsyncLocalStorage<RouterApi>();

const getRouterApi = () => {
  const routerApi = RouterAsyncStorage.getStore();
  if (!routerApi) {
    throw new Error("This function must be run within `withRouterApi`");
  }
  return routerApi;
};

export function revalidatePath(path: string) {
  const routerApi = getRouterApi();
  return routerApi.revalidatePath(path);
}

export async function withRouterApi<T>(
  fn: () => T
): Promise<[T, ServerActionResults]> {
  const runResults: ServerActionResults = {
    revalidatePaths: [],
  };
  const routerApi: RouterApi = {
    revalidatePath(path) {
      runResults.revalidatePaths.push(path);
    },
  };

  const fnResult = await RouterAsyncStorage.run(routerApi, fn);
  return [fnResult, runResults];
}
