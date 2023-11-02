"babel-plugin-inline-actions: [\"_$$INLINE_ACTION\",\"_$$INLINE_ACTION2\"]";
import { registerServerReference as _registerServerReference } from "react-server-dom-webpack/server";
import { doSomethingOnTheServer } from "./server-stuff";
// hoisted action: <anonymous>
export const _$$INLINE_ACTION2 = _registerServerReference(async ({
  foo: foo,
  bar: bar
}, data) => {
  const test = data.get("test");
  await doSomethingOnTheServer({
    test,
    foo,
    bar
  });
  return {
    success: true
  };
}, "bddd33a1aeb4c41845af846763d542e967d20f15", "_$$INLINE_ACTION2");
// hoisted action: <anonymous>
export const _$$INLINE_ACTION = _registerServerReference(async ({
  foo: foo
}, data) => {
  const test = data.get("test");
  await doSomethingOnTheServer({
    test,
    foo
  });
  return {
    success: true
  };
}, "bddd33a1aeb4c41845af846763d542e967d20f15", "_$$INLINE_ACTION");
export const Test = ({
  foo,
  bar
}) => {
  return <form action={_$$INLINE_ACTION.bind(null, {
    get foo() {
      return foo;
    }
  })}>
      <input name="test" type="text" />
      <button type="submit">Submit</button>
      <button type="button" formAction={_$$INLINE_ACTION2.bind(null, {
      get foo() {
        return foo;
      },
      get bar() {
        return bar;
      }
    })}>
        Submit
      </button>
    </form>;
};