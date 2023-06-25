type AnyArgs = any[];
type AnyFn = (...args: AnyArgs) => any;

const SERVER_REFERENCE: unique symbol = Symbol.for("react.server.reference");

type ActionProps = {
  $$typeof: typeof SERVER_REFERENCE;
  $$id: string;
  $$bound: ActionBoundArgs;
};

type ActionBoundArgs = null | any[];

export type ActionFn = AnyFn & ActionProps;

export const addServerActionMetadata = (id: string, actionFn: AnyFn) => {
  assignActionProps(actionFn, {
    $$id: id,
    $$bound: null,
  });
  addBind(actionFn as ActionFn);
};

const addBind = (actionFn: ActionFn): void => {
  const id = actionFn.$$id;
  function bind(this: ActionFn, _: any, ...argsToBind: AnyArgs) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const targetFn = this;
    const boundFn = async (...args: AnyArgs) => {
      return targetFn(...argsToBind, ...args);
    };
    assignActionProps(boundFn, {
      $$id: id,
      $$bound: mergeBoundArgs(targetFn.$$bound, argsToBind),
    });
    boundFn.bind = bind;
    console.log("bound args after bind", (boundFn as ActionFn).$$bound);
    return boundFn;
  }

  actionFn.bind = bind;
};

const assignActionProps = (
  dummyFn: AnyFn & Partial<ActionProps>,
  props: Omit<ActionProps, "$$typeof">
): void => {
  dummyFn.$$typeof = SERVER_REFERENCE;
  dummyFn.$$id = props.$$id;
  dummyFn.$$bound = mergeBoundArgs(dummyFn.$$bound ?? null, props.$$bound);
};

const mergeBoundArgs = (left: ActionBoundArgs, right: ActionBoundArgs) => {
  if (!left && !right) {
    return null;
  }
  return [...(left ?? []), ...(right ?? [])];
};
