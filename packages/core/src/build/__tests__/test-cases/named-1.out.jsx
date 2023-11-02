"babel-plugin-inline-actions: {\"id\":\"0fe700d484f660ac1fe1f7803b6bf7660f7bebda\",\"names\":[\"_$$INLINE_ACTION\"]}";
import { registerServerReference as _registerServerReference } from "react-server-dom-webpack/server";
import { doSomethingOnTheServer } from "./server-stuff";
// hoisted action: doStuff
export const _$$INLINE_ACTION = _registerServerReference(async (_$$CLOSURE, data) => {
  var {
    _0: foo
  } = _$$CLOSURE;
  const test = data.get("test");
  await doSomethingOnTheServer({
    test,
    foo
  });
  return {
    success: true
  };
}, "0fe700d484f660ac1fe1f7803b6bf7660f7bebda", "_$$INLINE_ACTION");
export const Test = ({
  foo
}) => {
  var doStuff = _$$INLINE_ACTION.bind(null, {
    get _0() {
      return foo;
    }
  });
  return <form action={doStuff}>
      <input name="test" type="text" />
      <button type="submit">Submit</button>
    </form>;
};