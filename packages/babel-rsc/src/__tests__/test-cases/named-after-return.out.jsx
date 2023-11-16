"babel-plugin-inline-actions: {\"id\":\"57d3508490fed7c3a870ed862bb4b569f936dab8\",\"names\":[\"_$$INLINE_ACTION\",\"_$$INLINE_ACTION2\"]}";
import { registerServerReference as _registerServerReference } from "react-server-dom-webpack/server";
import { decryptActionBoundArgs as _decryptActionBoundArgs } from "@example/my-framework/encryption";
import { encryptActionBoundArgs as _encryptActionBoundArgs } from "@example/my-framework/encryption";
import { doSomethingOnTheServer } from "./server-stuff";
// hoisted action: doStuff
export const _$$INLINE_ACTION2 = _registerServerReference(async (_$$CLOSURE2, data) => {
  var [foo2] = await _decryptActionBoundArgs(await _$$CLOSURE2.value, "57d3508490fed7c3a870ed862bb4b569f936dab8", "_$$INLINE_ACTION2");
  const test = data.get("test");
  await doSomethingOnTheServer({
    test,
    foo: foo2
  });
  return {
    success: true
  };
}, "57d3508490fed7c3a870ed862bb4b569f936dab8", "_$$INLINE_ACTION2");
// hoisted action: doStuff
export const _$$INLINE_ACTION = _registerServerReference(async (_$$CLOSURE, data) => {
  var [foo2] = await _decryptActionBoundArgs(await _$$CLOSURE.value, "57d3508490fed7c3a870ed862bb4b569f936dab8", "_$$INLINE_ACTION");
  const test = data.get("test");
  await doSomethingOnTheServer({
    test,
    foo: foo2
  });
  return {
    success: true
  };
}, "57d3508490fed7c3a870ed862bb4b569f936dab8", "_$$INLINE_ACTION");
export const Test = ({
  foo
}) => {
  var doStuff = _$$INLINE_ACTION.bind(null, {
    get value() {
      return _encryptActionBoundArgs([foo2], "57d3508490fed7c3a870ed862bb4b569f936dab8", "_$$INLINE_ACTION");
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
      get value() {
        return _encryptActionBoundArgs([foo2], "57d3508490fed7c3a870ed862bb4b569f936dab8", "_$$INLINE_ACTION2");
      }
    });
    return <form action={doStuff}>
        <input name="test" type="text" />
        <button type="submit">Submit</button>
      </form>;
    // eslint-disable-next-line no-inner-declarations
  }
};