"babel-rsc/actions: {\"id\":\"c90d0c9037fc6688f68b459b16e90947f518beb4\",\"names\":[\"_$$INLINE_ACTION\",\"_$$INLINE_ACTION2\"]}";
import { registerServerReference as _registerServerReference } from "react-server-dom-webpack/server";
import { decryptActionBoundArgs as _decryptActionBoundArgs } from "@example/my-framework/encryption";
import { encryptActionBoundArgs as _encryptActionBoundArgs } from "@example/my-framework/encryption";
var _wrapBoundArgs = thunk => {
  let cache = undefined;
  return {
    get value() {
      if (!cache) {
        cache = thunk();
      }
      return cache;
    }
  };
};
import { doSomethingOnTheServer } from "../server-stuff";
// hoisted action: doStuffWrapped
export const _$$INLINE_ACTION2 = _registerServerReference(async (_$$CLOSURE2, data) => {
  var [doStuff] = await _decryptActionBoundArgs(await _$$CLOSURE2.value, "c90d0c9037fc6688f68b459b16e90947f518beb4", "_$$INLINE_ACTION2");
  return doStuff(data);
}, "c90d0c9037fc6688f68b459b16e90947f518beb4", "_$$INLINE_ACTION2");
// hoisted action: doStuff
export const _$$INLINE_ACTION = _registerServerReference(async (_$$CLOSURE, data) => {
  var [foo2] = await _decryptActionBoundArgs(await _$$CLOSURE.value, "c90d0c9037fc6688f68b459b16e90947f518beb4", "_$$INLINE_ACTION");
  const test = data.get("test");
  await doSomethingOnTheServer({
    test,
    foo: foo2
  });
  return {
    success: true
  };
}, "c90d0c9037fc6688f68b459b16e90947f518beb4", "_$$INLINE_ACTION");
export const Test = ({
  foo
}) => {
  var doStuffWrapped = _$$INLINE_ACTION2.bind(null, _wrapBoundArgs(() => _encryptActionBoundArgs([doStuff], "c90d0c9037fc6688f68b459b16e90947f518beb4", "_$$INLINE_ACTION2")));
  var doStuff = _$$INLINE_ACTION.bind(null, _wrapBoundArgs(() => _encryptActionBoundArgs([foo2], "c90d0c9037fc6688f68b459b16e90947f518beb4", "_$$INLINE_ACTION")));
  const foo2 = foo;
  return <form action={doStuffWrapped}>
      <input name="test" type="text" />
      <button type="submit">Submit</button>
    </form>;
};