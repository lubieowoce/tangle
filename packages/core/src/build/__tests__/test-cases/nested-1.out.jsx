"babel-plugin-inline-actions: [\"_$$INLINE_ACTION\"]";
import { registerServerReference as _registerServerReference } from "react-server-dom-webpack/server";
/* eslint-disable @typescript-eslint/no-unused-vars */
import { doSomethingOnTheServer } from "./server-stuff";
import "./server-stuff";
// hoisted action: doStuff
export const _$$INLINE_ACTION = _registerServerReference(async ({
  foo2: foo2
}, data) => {
  const test = data.get("test");
  if (Math.random() > 0.5) {
    // @ts-expect-error  missing decl for `process`
    console.log(process.env.WHATEVER);
    await doSomethingOnTheServer({
      test,
      foo: foo2
    });
  } else {
    const foo2 = "overrwritten";
    await doSomethingOnTheServer({
      test,
      foo: foo2
    });
  }
}, "27f5943e84d58cb3c35c5fb7b2e31a9ad24bbd0b", "_$$INLINE_ACTION");
export const Test = ({
  foo
}) => {
  const foo1 = foo;
  const test = 5; // potential conflict
  if (foo) {
    const test = 5; // another potential conflict
    const foo2 = foo1;
    // eslint-disable-next-line no-constant-condition
    if (true) {
      var doStuff = _$$INLINE_ACTION.bind(null, {
        get foo2() {
          return foo2;
        }
      });
      // eslint-disable-next-line no-inner-declarations

      return <form action={doStuff}>
          <input name="test" type="text" />
          <button type="submit">Submit</button>
        </form>;
    }
  }
  return null;
};