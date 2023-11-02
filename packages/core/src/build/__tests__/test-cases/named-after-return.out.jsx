"babel-plugin-inline-actions: [\"_$$INLINE_ACTION\",\"_$$INLINE_ACTION2\"]";
import { registerServerReference as _registerServerReference } from "react-server-dom-webpack/server";
import { doSomethingOnTheServer } from "./server-stuff";
// hoisted action: doStuff
export const _$$INLINE_ACTION2 = _registerServerReference(async ({
  foo2: foo2
}, data) => {
  const test = data.get("test");
  await doSomethingOnTheServer({
    test,
    foo: foo2
  });
  return {
    success: true
  };
}, "262b5ef16b8a9673f3cbe8d32fa399134ae36040", "_$$INLINE_ACTION2");
// hoisted action: doStuff
export const _$$INLINE_ACTION = _registerServerReference(async ({
  foo2: foo2
}, data) => {
  const test = data.get("test");
  await doSomethingOnTheServer({
    test,
    foo: foo2
  });
  return {
    success: true
  };
}, "262b5ef16b8a9673f3cbe8d32fa399134ae36040", "_$$INLINE_ACTION");
export const Test = ({
  foo
}) => {
  var doStuff = _$$INLINE_ACTION.bind(null, {
    get foo2() {
      return foo2;
    }
  });
  const foo2 = foo;
  return <form action={doStuff}>
      <input name="test" type="text" />
      <button type="submit">Submit</button>
    </form>;
};
export const Test2 = ({
  foo
}) => {
  const foo2 = foo;
  {
    var doStuff = _$$INLINE_ACTION2.bind(null, {
      get foo2() {
        return foo2;
      }
    });
    return <form action={doStuff}>
        <input name="test" type="text" />
        <button type="submit">Submit</button>
      </form>;
    // eslint-disable-next-line no-inner-declarations
  }
};