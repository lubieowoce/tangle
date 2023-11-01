"babel-plugin-inline-actions: [\"_$$INLINE_ACTION\"]";
import { doSomethingOnTheServer } from "./server-stuff";
export const Test = ({
  foo
}) => {
  const doStuff = _$$INLINE_ACTION.bind(null, {
    get foo() {
      return foo;
    }
  });
  return <form action={doStuff}>
      <input name="test" type="text" />
      <button type="submit">Submit</button>
    </form>;
};
export const _$$INLINE_ACTION = async ({
  foo: foo
}, data) => {
  const test = data.get("test");
  await doSomethingOnTheServer({
    test,
    foo
  });
  return {
    success: true
  };
};