"babel-plugin-inline-actions: {\"id\":\"8c2a6c94017ef807ec8e673721a09feb51dc164a\",\"names\":[\"_$$INLINE_ACTION\",\"_$$INLINE_ACTION2\"]}";
import { registerServerReference as _registerServerReference } from "react-server-dom-webpack/server";
import { decryptActionBoundArgs as _decryptActionBoundArgs } from "@owoce/tangle/dist/runtime/support/encrypt-action-bound-args";
import { encryptActionBoundArgs as _encryptActionBoundArgs } from "@owoce/tangle/dist/runtime/support/encrypt-action-bound-args";
import { doSomethingOnTheServer } from "./server-stuff";
// hoisted action: <anonymous>
export const _$$INLINE_ACTION2 = _registerServerReference(async (_$$CLOSURE2, data) => {
  var [bar, foo] = (await _decryptActionBoundArgs(_$$CLOSURE2)).value;
  const test = data.get("test");
  await doSomethingOnTheServer({
    test,
    foo,
    bar
  });
  return {
    success: true
  };
}, "8c2a6c94017ef807ec8e673721a09feb51dc164a", "_$$INLINE_ACTION2");
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
}, "8c2a6c94017ef807ec8e673721a09feb51dc164a", "_$$INLINE_ACTION");
export const Test = ({
  foo,
  bar
}) => {
  return <form action={_$$INLINE_ACTION.bind(null, _encryptActionBoundArgs({
    get value() {
      return [foo];
    }
  }))}>
      <input name="test" type="text" />
      <button type="submit">Submit</button>
      <button type="button" formAction={_$$INLINE_ACTION2.bind(null, _encryptActionBoundArgs({
      get value() {
        return [bar, foo];
      }
    }))}>
        Submit
      </button>
    </form>;
};