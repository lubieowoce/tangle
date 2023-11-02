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
}, "729b60c4c0bd5aedd90420f60ed4174e0fca76b2", "_$$INLINE_ACTION");
export const Test = ({
  foo
}) => {
  var doStuff = _$$INLINE_ACTION.bind(null, {
    get foo() {
      return foo;
    }
  });
  return <form action={doStuff}>
      <input name="test" type="text" />
      <button type="submit">Submit</button>
    </form>;
};