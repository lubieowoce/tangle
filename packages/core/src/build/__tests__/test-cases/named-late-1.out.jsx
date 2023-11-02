"babel-plugin-inline-actions: [\"_$$INLINE_ACTION\"]";
import { registerServerReference as _registerServerReference } from "react-server-dom-webpack/server";
import { doSomethingOnTheServer } from "./server-stuff";
// hoisted action: doStuff
export const _$$INLINE_ACTION = _registerServerReference(async ({
  foo2: foo2
}, data) => {
  const test = data.get("test");
  await doSomethingOnTheServer({
    test,
    foo: foo2
  });
  return {
    success: true
  };
}, "a70c0831b824dbcf54e74d123a9668f57f6c577a", "_$$INLINE_ACTION");
export const Test = ({
  foo
}) => {
  var doStuff = _$$INLINE_ACTION.bind(null, {
    get foo2() {
      return foo2;
    }
  });
  const foo2 = foo;
  return <form action={doStuff}>
      <input name="test" type="text" />
      <button type="submit">Submit</button>
    </form>;
};