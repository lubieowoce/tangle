"babel-rsc/actions: {\"id\":\"c509910e1d4d8013941ded844b0850216962a3d3\",\"names\":[\"test1\",\"_$$INLINE_ACTION\",\"test4\",\"_$$INLINE_ACTION2\",\"_$$INLINE_ACTION\",\"_$$INLINE_ACTION2\"]}";
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
import { doSomethingOnTheServer } from "./server-stuff";
// hoisted action: <anonymous>
export const _$$INLINE_ACTION2 = _registerServerReference(async x => {
  return doSomethingOnTheServer(["inline-wrapped", x, SOME_CONSTANT]);
}, "c509910e1d4d8013941ded844b0850216962a3d3", "_$$INLINE_ACTION2");
_registerServerReference(_$$INLINE_ACTION2, "c509910e1d4d8013941ded844b0850216962a3d3", "_$$INLINE_ACTION2")
// hoisted action: <anonymous>
export const _$$INLINE_ACTION = _registerServerReference(async (_$$CLOSURE, ...args) => {
  var [fn] = await _decryptActionBoundArgs(await _$$CLOSURE.value, "c509910e1d4d8013941ded844b0850216962a3d3", "_$$INLINE_ACTION");
  console.log("checking auth");
  return fn(...args);
}, "c509910e1d4d8013941ded844b0850216962a3d3", "_$$INLINE_ACTION");
_registerServerReference(_$$INLINE_ACTION, "c509910e1d4d8013941ded844b0850216962a3d3", "_$$INLINE_ACTION")
const SOME_CONSTANT = "beep";
export const test1 = async formData => {
  return doSomethingOnTheServer(["top-level", formData, SOME_CONSTANT]);
};
_registerServerReference(test1, "c509910e1d4d8013941ded844b0850216962a3d3", "test1")
const withAuth = fn => _$$INLINE_ACTION.bind(null, _wrapBoundArgs(() => _encryptActionBoundArgs([fn], "c509910e1d4d8013941ded844b0850216962a3d3", "_$$INLINE_ACTION")));
export const test4 = withAuth(_$$INLINE_ACTION2);
_registerServerReference(test4, "c509910e1d4d8013941ded844b0850216962a3d3", "test4")