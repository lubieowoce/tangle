"babel-plugin-inline-actions: {\"id\":\"34ed2f283410c36422592355b6fad14b1772797e\",\"names\":[\"_$$INLINE_ACTION\"]}";
import { registerServerReference as _registerServerReference } from "react-server-dom-webpack/server";
import { decryptActionBoundArgs as _decryptActionBoundArgs } from "@owoce/tangle/dist/runtime/support/encrypt-action-bound-args";
import { encryptActionBoundArgs as _encryptActionBoundArgs } from "@owoce/tangle/dist/runtime/support/encrypt-action-bound-args";
import { doSomethingOnTheServer } from "./server-stuff";
// hoisted action: doStuff
export const _$$INLINE_ACTION = _registerServerReference(async (_$$CLOSURE, data) => {
  var [foo] = await _decryptActionBoundArgs(await _$$CLOSURE.value, "34ed2f283410c36422592355b6fad14b1772797e", "_$$INLINE_ACTION");
  const test = data.get("test");
  await doSomethingOnTheServer({
    test,
    foo
  });
  return {
    success: true
  };
}, "34ed2f283410c36422592355b6fad14b1772797e", "_$$INLINE_ACTION");
export const Test = ({
  foo
}) => {
  return <form action={_$$INLINE_ACTION.bind(null, {
    get value() {
      return _encryptActionBoundArgs([foo], "34ed2f283410c36422592355b6fad14b1772797e", "_$$INLINE_ACTION");
    }
  })}>
      <input name="test" type="text" />
      <button type="submit">Submit</button>
    </form>;
};