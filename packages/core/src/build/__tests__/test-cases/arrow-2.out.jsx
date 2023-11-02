"babel-plugin-inline-actions: [\"_$$INLINE_ACTION\"]";
import { registerServerReference as _registerServerReference } from "react-server-dom-webpack/server";
import { doSomethingOnTheServer } from "./server-stuff";
// hoisted action: <anonymous>
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
}, "88f60695cdc00f84d70e40f25dc9dc117ea157d2", "_$$INLINE_ACTION");
export const Test = ({
  foo
}) => {
  const doStuff = _$$INLINE_ACTION.bind(null, {
    get foo() {
      return foo;
    }
  });
  return <form action={doStuff}>
      <input name="test" type="text" />
      <button type="submit">Submit</button>
    </form>;
};