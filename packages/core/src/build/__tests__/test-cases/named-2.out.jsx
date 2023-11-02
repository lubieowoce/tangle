"babel-plugin-inline-actions: [\"_$$INLINE_ACTION\"]";
import { registerServerReference as _registerServerReference } from "react-server-dom-webpack/server";
import { doSomethingOnTheServer } from "./server-stuff";
// hoisted action: doStuff
export const _$$INLINE_ACTION = _registerServerReference(async ({
  foo: foo
}, data) => {
  const test = data.get("test");
  await doSomethingOnTheServer({
    test,
    foo
  });
  return {
    success: true
  };
}, "f91a9136c2a0d4b8d530c530a5f316a5331c6474", "_$$INLINE_ACTION");
export const Test = ({
  foo
}) => {
  return <form action={_$$INLINE_ACTION.bind(null, {
    get foo() {
      return foo;
    }
  })}>
      <input name="test" type="text" />
      <button type="submit">Submit</button>
    </form>;
};