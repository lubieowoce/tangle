"babel-plugin-inline-actions: {\"id\":\"0fe700d484f660ac1fe1f7803b6bf7660f7bebda\",\"names\":[\"_$$INLINE_ACTION\"]}";
import { registerServerReference as _registerServerReference } from "react-server-dom-webpack/server";
import { decryptActionBoundArgs as _decryptActionBoundArgs } from "@example/my-framework/encryption";
import { encryptActionBoundArgs as _encryptActionBoundArgs } from "@example/my-framework/encryption";
import { doSomethingOnTheServer } from "./server-stuff";
// hoisted action: doStuff
export const _$$INLINE_ACTION = _registerServerReference(async (_$$CLOSURE, data) => {
  var [foo] = await _decryptActionBoundArgs(await _$$CLOSURE.value, "0fe700d484f660ac1fe1f7803b6bf7660f7bebda", "_$$INLINE_ACTION");
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
    get value() {
      return _encryptActionBoundArgs([foo], "0fe700d484f660ac1fe1f7803b6bf7660f7bebda", "_$$INLINE_ACTION");
    }
  });
  return <form action={doStuff}>
      <input name="test" type="text" />
      <button type="submit">Submit</button>
    </form>;
};