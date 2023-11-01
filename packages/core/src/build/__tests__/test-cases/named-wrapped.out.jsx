"babel-plugin-inline-actions: [\"_$$INLINE_ACTION\",\"_$$INLINE_ACTION2\"]";
import { doSomethingOnTheServer } from "./server-stuff";
export const Test = ({
  foo
}) => {
  var doStuff = _$$INLINE_ACTION.bind(null, {
    get foo2() {
      return foo2;
    }
  });
  const foo2 = foo;
  var doStuffWrapped = _$$INLINE_ACTION2.bind(null, {
    get doStuff() {
      return doStuff;
    }
  });
  return <form action={doStuffWrapped}>
      <input name="test" type="text" />
      <button type="submit">Submit</button>
    </form>;
};
export const _$$INLINE_ACTION = async ({
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
};
export const _$$INLINE_ACTION2 = async ({
  doStuff: doStuff
}, data) => {
  return doStuff(data);
};