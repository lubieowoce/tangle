"babel-plugin-inline-actions: {\"id\":\"1da564ba7db5ecd6baae409ed16cf13fb02530ff\",\"names\":[\"_$$INLINE_ACTION\",\"_$$INLINE_ACTION2\"]}";
import { registerServerReference as _registerServerReference } from "react-server-dom-webpack/server";
import { doSomethingOnTheServer } from "./server-stuff";
// hoisted action: doStuffWrapped
export const _$$INLINE_ACTION2 = _registerServerReference(async (_$$CLOSURE2, data) => {
  var {
    _0: doStuff
  } = _$$CLOSURE2;
  return doStuff(data);
}, "1da564ba7db5ecd6baae409ed16cf13fb02530ff", "_$$INLINE_ACTION2");
// hoisted action: doStuff
export const _$$INLINE_ACTION = _registerServerReference(async (_$$CLOSURE, data) => {
  var {
    _0: foo2
  } = _$$CLOSURE;
  const test = data.get("test");
  await doSomethingOnTheServer({
    test,
    foo: foo2
  });
  return {
    success: true
  };
}, "1da564ba7db5ecd6baae409ed16cf13fb02530ff", "_$$INLINE_ACTION");
export const Test = ({
  foo
}) => {
  var doStuffWrapped = _$$INLINE_ACTION2.bind(null, {
    get _0() {
      return doStuff;
    }
  });
  var doStuff = _$$INLINE_ACTION.bind(null, {
    get _0() {
      return foo2;
    }
  });
  const foo2 = foo;
  return <form action={doStuffWrapped}>
      <input name="test" type="text" />
      <button type="submit">Submit</button>
    </form>;
};