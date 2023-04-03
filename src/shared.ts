export const ROOT_DOM_NODE_ID = "root";
export const FLIGHT_REQUEST_HEADER = "X-RSC-Request";
export const ASSETS_ROUTE = "/_assets";

export const throwOnMissingProperty = <TObj extends Record<string, any>>(
  obj: TObj,
  name?: string
): TObj => {
  const msgSuffix = name ? ` (in object '${name}')` : "";
  return new Proxy(obj, {
    get(target, name) {
      if (!(name in target)) {
        throw new Error(`Missing property ${String(name)}` + msgSuffix);
      }
      const res = target[name as any];
      console.log("accessed property" + msgSuffix + ":", name, "-->", res);
      return res;
    },
  });
};
