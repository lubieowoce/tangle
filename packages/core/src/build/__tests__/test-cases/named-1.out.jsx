"babel-plugin-inline-actions: {\"id\":\"0fe700d484f660ac1fe1f7803b6bf7660f7bebda\",\"names\":[\"_$$INLINE_ACTION\"]}";
import { registerServerReference as _registerServerReference } from "react-server-dom-webpack/server";
import { decryptActionBoundArgs as _decryptActionBoundArgs } from "@owoce/tangle/dist/runtime/support/encrypt-action-bound-args";
import { encryptActionBoundArgs as _encryptActionBoundArgs } from "@owoce/tangle/dist/runtime/support/encrypt-action-bound-args";
import { doSomethingOnTheServer } from "./server-stuff";
// hoisted action: doStuff
export const _$$INLINE_ACTION = _registerServerReference(async (_$$CLOSURE, data) => {
  var [foo] = (await _decryptActionBoundArgs(_$$CLOSURE)).value;
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
  var doStuff = _$$INLINE_ACTION.bind(null, _encryptActionBoundArgs({
    get value() {
      return [foo];
    }
  }));
  return <form action={doStuff}>
      <input name="test" type="text" />
      <button type="submit">Submit</button>
    </form>;
};