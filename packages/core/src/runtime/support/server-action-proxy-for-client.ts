type AnyArgs = any[];
type AnyFn = (...args: AnyArgs) => any;

const SERVER_REFERENCE: unique symbol = Symbol.for("react.server.reference");

type ActionProps = {
  $$typeof: typeof SERVER_REFERENCE;
  $$id: string;
  $$bound: null | any[];
};

type ActionFn = AnyFn & ActionProps;

export const createServerActionProxy = (id: string): ActionFn => {
  const dummyFn = async () => {
    console.log("server action invoked", id);
  };
  addServerActionMetadata(id, dummyFn);
  return dummyFn as ActionFn;
};

export const addServerActionMetadata = (id: string, actionFn: AnyFn) => {
  assignActionProps(actionFn, {
    $$id: id,
    $$bound: null,
  });
  addBind(actionFn as ActionFn);
};

const addBind = (actionFn: ActionFn): void => {
  function bind(this: AnyFn, _: any, ...argsToBind: AnyArgs) {
    console.log("createServerActionProxy :: patched bind", argsToBind);
    const boundFn = async (...args: AnyArgs) => {
      return actionFn(...argsToBind, ...args);
    };
    assignActionProps(boundFn, { $$id: actionFn.$$id, $$bound: argsToBind });
    console.log(
      "createServerActionProxy :: patched bind (result)",
      (boundFn as ActionFn).$$bound
    );
    boundFn.bind = bind;
    return boundFn;
  }

  actionFn.bind = bind;
};

const assignActionProps = (
  dummyFn: AnyFn & Partial<ActionProps>,
  props: Omit<ActionProps, "$$typeof">
): void => {
  dummyFn.$$typeof = SERVER_REFERENCE;
  dummyFn.$$id =
    props.$$id ??
    dummyFn.$$id ??
    (() => {
      throw new Error("Internal error");
    })();
  dummyFn.$$bound =
    !dummyFn.$$bound && !props.$$bound
      ? null
      : [...(dummyFn.$$bound ?? []), ...(props.$$bound ?? [])];
};
