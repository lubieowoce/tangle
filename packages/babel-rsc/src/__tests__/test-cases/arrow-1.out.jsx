"babel-plugin-inline-actions: {\"id\":\"8c2a6c94017ef807ec8e673721a09feb51dc164a\",\"names\":[\"_$$INLINE_ACTION\",\"_$$INLINE_ACTION2\"]}";
import { registerServerReference as _registerServerReference } from "react-server-dom-webpack/server";
import { decryptActionBoundArgs as _decryptActionBoundArgs } from "@example/my-framework/encryption";
import { encryptActionBoundArgs as _encryptActionBoundArgs } from "@example/my-framework/encryption";
import { doSomethingOnTheServer } from "./server-stuff";
// hoisted action: <anonymous>
export const _$$INLINE_ACTION2 = _registerServerReference(async (_$$CLOSURE2, data) => {
  var [bar, foo] = await _decryptActionBoundArgs(await _$$CLOSURE2.value, "8c2a6c94017ef807ec8e673721a09feb51dc164a", "_$$INLINE_ACTION2");
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
  var [foo] = await _decryptActionBoundArgs(await _$$CLOSURE.value, "8c2a6c94017ef807ec8e673721a09feb51dc164a", "_$$INLINE_ACTION");
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
  return <form action={_$$INLINE_ACTION.bind(null, {
    get value() {
      return _encryptActionBoundArgs([foo], "8c2a6c94017ef807ec8e673721a09feb51dc164a", "_$$INLINE_ACTION");
    }
  })}>
      <input name="test" type="text" />
      <button type="submit">Submit</button>
      <button type="button" formAction={_$$INLINE_ACTION2.bind(null, {
      get value() {
        return _encryptActionBoundArgs([bar, foo], "8c2a6c94017ef807ec8e673721a09feb51dc164a", "_$$INLINE_ACTION2");
      }
    })}>
        Submit
      </button>
    </form>;
};