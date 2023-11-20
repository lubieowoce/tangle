"babel-rsc/actions: {\"id\":\"c90d0c9037fc6688f68b459b16e90947f518beb4\",\"names\":[\"_$$INLINE_ACTION\",\"_$$INLINE_ACTION2\",\"_$$INLINE_ACTION3\",\"_$$INLINE_ACTION4\",\"_$$INLINE_ACTION5\"]}";
import { decryptActionBoundArgs as _decryptActionBoundArgs } from "@example/my-framework/encryption";
import { encryptActionBoundArgs as _encryptActionBoundArgs } from "@example/my-framework/encryption";
import { registerServerReference as _registerServerReference } from "react-server-dom-webpack/server";
var _wrapBoundArgs = thunk => {
  let cache = undefined;
  return {
    get value() {
      if (!cache) {
        cache = thunk();
      }
      return cache;
    }
  };
};
import { doSomethingOnTheServer } from "../server-stuff";
// hoisted action: <anonymous>
export const _$$INLINE_ACTION5 = _registerServerReference(async x => {
  return doSomethingOnTheServer([x, SOME_CONSTANT]);
}, "c90d0c9037fc6688f68b459b16e90947f518beb4", "_$$INLINE_ACTION5");
// hoisted action: <anonymous>
export const _$$INLINE_ACTION4 = _registerServerReference(async (_$$CLOSURE, ...args) => {
  var [fn] = await _decryptActionBoundArgs(await _$$CLOSURE.value, "c90d0c9037fc6688f68b459b16e90947f518beb4", "_$$INLINE_ACTION4");
  console.log("checking auth");
  return fn(...args);
}, "c90d0c9037fc6688f68b459b16e90947f518beb4", "_$$INLINE_ACTION4");
// hoisted action: test2a
export const _$$INLINE_ACTION3 = _registerServerReference(async x => {
  return doSomethingOnTheServer([x, SOME_CONSTANT]);
}, "c90d0c9037fc6688f68b459b16e90947f518beb4", "_$$INLINE_ACTION3");
// hoisted action: test2
export const _$$INLINE_ACTION2 = _registerServerReference(async x => {
  return doSomethingOnTheServer([x, SOME_CONSTANT]);
}, "c90d0c9037fc6688f68b459b16e90947f518beb4", "_$$INLINE_ACTION2");
// hoisted action: <anonymous>
export const _$$INLINE_ACTION = _registerServerReference(async x => {
  return doSomethingOnTheServer([x, SOME_CONSTANT]);
}, "c90d0c9037fc6688f68b459b16e90947f518beb4", "_$$INLINE_ACTION");
const SOME_CONSTANT = "beep";
export const test1 = _$$INLINE_ACTION;
export var test2 = _$$INLINE_ACTION2;
var test2a = _$$INLINE_ACTION3;
export { test2a };
const withAuth = fn => _$$INLINE_ACTION4.bind(null, _wrapBoundArgs(() => _encryptActionBoundArgs([fn], "c90d0c9037fc6688f68b459b16e90947f518beb4", "_$$INLINE_ACTION4")));
export const test3 = withAuth(_$$INLINE_ACTION5);