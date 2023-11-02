"babel-plugin-inline-actions: {\"id\":\"e71f0f1f5a13b4248f020398c81e5a5caa34d07e\",\"names\":[\"_$$INLINE_ACTION\"]}";
import { registerServerReference as _registerServerReference } from "react-server-dom-webpack/server";
import { doSomethingOnTheServer } from "./server-stuff";
// hoisted action: doStuff
export const _$$INLINE_ACTION = _registerServerReference(async (_$$CLOSURE, data) => {
  var [foo2, x] = _$$CLOSURE.value;
  const test = data.get("test");
  await doSomethingOnTheServer({
    test,
    foo: foo2,
    beep: x
  });
  return {
    success: true
  };
}, "e71f0f1f5a13b4248f020398c81e5a5caa34d07e", "_$$INLINE_ACTION");
export const Test = ({
  foo
}) => {
  var doStuff = _$$INLINE_ACTION.bind(null, {
    get value() {
      return [foo2, x];
    }
  });
  const foo2 = foo;
  const x = 5;
  return <form action={doStuff}>
      <input name="test" type="text" />
      <button type="submit">Submit</button>
    </form>;
};