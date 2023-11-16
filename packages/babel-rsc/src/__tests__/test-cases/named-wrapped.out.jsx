"babel-plugin-inline-actions: {\"id\":\"1da564ba7db5ecd6baae409ed16cf13fb02530ff\",\"names\":[\"_$$INLINE_ACTION\",\"_$$INLINE_ACTION2\"]}";
import { registerServerReference as _registerServerReference } from "react-server-dom-webpack/server";
import { decryptActionBoundArgs as _decryptActionBoundArgs } from "@owoce/tangle/dist/runtime/support/encrypt-action-bound-args";
import { encryptActionBoundArgs as _encryptActionBoundArgs } from "@owoce/tangle/dist/runtime/support/encrypt-action-bound-args";
import { doSomethingOnTheServer } from "./server-stuff";
// hoisted action: doStuffWrapped
export const _$$INLINE_ACTION2 = _registerServerReference(async (_$$CLOSURE2, data) => {
  var [doStuff] = await _decryptActionBoundArgs(await _$$CLOSURE2.value, "1da564ba7db5ecd6baae409ed16cf13fb02530ff", "_$$INLINE_ACTION2");
  return doStuff(data);
}, "1da564ba7db5ecd6baae409ed16cf13fb02530ff", "_$$INLINE_ACTION2");
// hoisted action: doStuff
export const _$$INLINE_ACTION = _registerServerReference(async (_$$CLOSURE, data) => {
  var [foo2] = await _decryptActionBoundArgs(await _$$CLOSURE.value, "1da564ba7db5ecd6baae409ed16cf13fb02530ff", "_$$INLINE_ACTION");
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
    get value() {
      return _encryptActionBoundArgs([doStuff], "1da564ba7db5ecd6baae409ed16cf13fb02530ff", "_$$INLINE_ACTION2");
    }
  });
  var doStuff = _$$INLINE_ACTION.bind(null, {
    get value() {
      return _encryptActionBoundArgs([foo2], "1da564ba7db5ecd6baae409ed16cf13fb02530ff", "_$$INLINE_ACTION");
    }
  });
  const foo2 = foo;
  return <form action={doStuffWrapped}>
      <input name="test" type="text" />
      <button type="submit">Submit</button>
    </form>;
};