"babel-plugin-inline-actions: {\"id\":\"8c2a6c94017ef807ec8e673721a09feb51dc164a\",\"names\":[\"_$$INLINE_ACTION\",\"_$$INLINE_ACTION2\"]}";
import { registerServerReference as _registerServerReference } from "react-server-dom-webpack/server";
import { doSomethingOnTheServer } from "./server-stuff";
// hoisted action: <anonymous>
export const _$$INLINE_ACTION2 = _registerServerReference(async (_$$CLOSURE2, data) => {
  var {
    _0: bar,
    _1: foo
  } = _$$CLOSURE2;
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
}, "8c2a6c94017ef807ec8e673721a09feb51dc164a", "_$$INLINE_ACTION");
export const Test = ({
  foo,
  bar
}) => {
  return <form action={_$$INLINE_ACTION.bind(null, {
    get _0() {
      return foo;
    }
  })}>
      <input name="test" type="text" />
      <button type="submit">Submit</button>
      <button type="button" formAction={_$$INLINE_ACTION2.bind(null, {
      get _0() {
        return bar;
      },
      get _1() {
        return foo;
      }
    })}>
        Submit
      </button>
    </form>;
};