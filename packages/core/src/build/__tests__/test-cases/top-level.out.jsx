"babel-plugin-inline-actions: {\"id\":\"6342690343ae5afda83cf88d839011024a342b16\",\"names\":[\"_$$INLINE_ACTION\",\"_$$INLINE_ACTION2\",\"_$$INLINE_ACTION3\",\"_$$INLINE_ACTION4\",\"_$$INLINE_ACTION5\"]}";
import { decryptActionBoundArgs as _decryptActionBoundArgs } from "@owoce/tangle/dist/runtime/support/encrypt-action-bound-args";
import { encryptActionBoundArgs as _encryptActionBoundArgs } from "@owoce/tangle/dist/runtime/support/encrypt-action-bound-args";
import { registerServerReference as _registerServerReference } from "react-server-dom-webpack/server";
import { doSomethingOnTheServer } from "./server-stuff";
// hoisted action: <anonymous>
export const _$$INLINE_ACTION5 = _registerServerReference(async x => {
  return doSomethingOnTheServer([x, SOME_CONSTANT]);
}, "6342690343ae5afda83cf88d839011024a342b16", "_$$INLINE_ACTION5");
// hoisted action: <anonymous>
export const _$$INLINE_ACTION4 = _registerServerReference(async (_$$CLOSURE, ...args) => {
  var [fn] = (await _decryptActionBoundArgs(_$$CLOSURE)).value;
  console.log("checking auth");
  return fn(...args);
}, "6342690343ae5afda83cf88d839011024a342b16", "_$$INLINE_ACTION4");
// hoisted action: test2a
export const _$$INLINE_ACTION3 = _registerServerReference(async x => {
  return doSomethingOnTheServer([x, SOME_CONSTANT]);
}, "6342690343ae5afda83cf88d839011024a342b16", "_$$INLINE_ACTION3");
// hoisted action: test2
export const _$$INLINE_ACTION2 = _registerServerReference(async x => {
  return doSomethingOnTheServer([x, SOME_CONSTANT]);
}, "6342690343ae5afda83cf88d839011024a342b16", "_$$INLINE_ACTION2");
// hoisted action: <anonymous>
export const _$$INLINE_ACTION = _registerServerReference(async x => {
  return doSomethingOnTheServer([x, SOME_CONSTANT]);
}, "6342690343ae5afda83cf88d839011024a342b16", "_$$INLINE_ACTION");
const SOME_CONSTANT = "beep";
export const test1 = _$$INLINE_ACTION;
export var test2 = _$$INLINE_ACTION2;
var test2a = _$$INLINE_ACTION3;
export { test2a };
const withAuth = fn => _$$INLINE_ACTION4.bind(null, _encryptActionBoundArgs({
  get value() {
    return [fn];
  }
}));
export const test3 = withAuth(_$$INLINE_ACTION5);