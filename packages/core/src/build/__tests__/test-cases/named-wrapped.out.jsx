"babel-plugin-inline-actions: [\"_$$INLINE_ACTION\",\"_$$INLINE_ACTION2\"]";
import { registerServerReference as _registerServerReference } from "react-server-dom-webpack/server";
import { doSomethingOnTheServer } from "./server-stuff";
// hoisted action: doStuffWrapped
export const _$$INLINE_ACTION2 = _registerServerReference(async ({
  doStuff: doStuff
}, data) => {
  return doStuff(data);
}, "fc34372447ec2041c7014bc4889e245416695c51", "_$$INLINE_ACTION2");
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
}, "fc34372447ec2041c7014bc4889e245416695c51", "_$$INLINE_ACTION");
export const Test = ({
  foo
}) => {
  var doStuffWrapped = _$$INLINE_ACTION2.bind(null, {
    get doStuff() {
      return doStuff;
    }
  });
  var doStuff = _$$INLINE_ACTION.bind(null, {
    get foo2() {
      return foo2;
    }
  });
  const foo2 = foo;
  return <form action={doStuffWrapped}>
      <input name="test" type="text" />
      <button type="submit">Submit</button>
    </form>;
};