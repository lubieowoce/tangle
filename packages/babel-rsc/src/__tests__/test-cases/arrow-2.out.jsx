"babel-rsc/actions: {\"id\":\"f94940789c139dc57e71df8d835c048ce923b98d\",\"names\":[\"_$$INLINE_ACTION\"]}";
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
import { doSomethingOnTheServer } from "./server-stuff";
// hoisted action: <anonymous>
export const _$$INLINE_ACTION = _registerServerReference(async (_$$CLOSURE, data) => {
  var [foo] = await _decryptActionBoundArgs(await _$$CLOSURE.value, "f94940789c139dc57e71df8d835c048ce923b98d", "_$$INLINE_ACTION");
  const test = data.get("test");
  await doSomethingOnTheServer({
    test,
    foo
  });
  return {
    success: true
  };
}, "f94940789c139dc57e71df8d835c048ce923b98d", "_$$INLINE_ACTION");
export const Test = ({
  foo
}) => {
  const doStuff = _$$INLINE_ACTION.bind(null, _wrapBoundArgs(() => _encryptActionBoundArgs([foo], "f94940789c139dc57e71df8d835c048ce923b98d", "_$$INLINE_ACTION")));
  return <form action={doStuff}>
      <input name="test" type="text" />
      <button type="submit">Submit</button>
    </form>;
};