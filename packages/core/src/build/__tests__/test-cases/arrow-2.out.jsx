"babel-plugin-inline-actions: {\"id\":\"f94940789c139dc57e71df8d835c048ce923b98d\",\"names\":[\"_$$INLINE_ACTION\"]}";
import { registerServerReference as _registerServerReference } from "react-server-dom-webpack/server";
import { decryptActionBoundArgs as _decryptActionBoundArgs } from "@owoce/tangle/dist/runtime/support/encrypt-action-bound-args";
import { encryptActionBoundArgs as _encryptActionBoundArgs } from "@owoce/tangle/dist/runtime/support/encrypt-action-bound-args";
import { doSomethingOnTheServer } from "./server-stuff";
// hoisted action: <anonymous>
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
}, "f94940789c139dc57e71df8d835c048ce923b98d", "_$$INLINE_ACTION");
export const Test = ({
  foo
}) => {
  const doStuff = _$$INLINE_ACTION.bind(null, _encryptActionBoundArgs({
    get value() {
      return [foo];
    }
  }));
  return <form action={doStuff}>
      <input name="test" type="text" />
      <button type="submit">Submit</button>
    </form>;
};