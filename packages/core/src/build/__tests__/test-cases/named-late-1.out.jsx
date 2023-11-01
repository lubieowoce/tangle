"babel-plugin-inline-actions: [\"_$$INLINE_ACTION\"]";
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