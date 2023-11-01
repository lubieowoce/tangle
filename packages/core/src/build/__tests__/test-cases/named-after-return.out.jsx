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