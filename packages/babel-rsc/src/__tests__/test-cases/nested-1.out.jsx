"babel-rsc/actions: {\"id\":\"dd2085e09763e728ce459e4843749a293c3f6665\",\"names\":[\"_$$INLINE_ACTION\"]}";
import { registerServerReference as _registerServerReference } from "react-server-dom-webpack/server";
import { decryptActionBoundArgs as _decryptActionBoundArgs } from "@example/my-framework/encryption";
import { encryptActionBoundArgs as _encryptActionBoundArgs } from "@example/my-framework/encryption";
/* eslint-disable @typescript-eslint/no-unused-vars */
import { doSomethingOnTheServer } from "./server-stuff";
import "./server-stuff";
// hoisted action: doStuff
export const _$$INLINE_ACTION = _registerServerReference(async (_$$CLOSURE, data) => {
  var [foo2] = await _decryptActionBoundArgs(await _$$CLOSURE.value, "dd2085e09763e728ce459e4843749a293c3f6665", "_$$INLINE_ACTION");
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
}, "dd2085e09763e728ce459e4843749a293c3f6665", "_$$INLINE_ACTION");
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
        get value() {
          return _encryptActionBoundArgs([foo2], "dd2085e09763e728ce459e4843749a293c3f6665", "_$$INLINE_ACTION");
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