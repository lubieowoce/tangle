export const ROOT_DOM_NODE_ID = "root";
export const FLIGHT_REQUEST_HEADER = "X-RSC-Request";
export const ROUTER_STATE_HEADER = "X-Router-State";
export const ROUTER_RESPONSE_PREFIX_HEADER = "X-Router-Response-Prefix";

export const RSC_CONTENT_TYPE = "text/x-component";

export const ASSETS_ROUTE = "/_tangle/assets";
export const ACTIONS_ROUTE_PREFIX = "/_tangle/actions/";

export type AnyServerRootProps = Record<string, any>;

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
      // console.log("accessed property" + msgSuffix + ":", name, "-->", res);
      return res;
    },
  });
};
