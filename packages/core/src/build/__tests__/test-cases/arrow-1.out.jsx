"babel-plugin-inline-actions: [\"_$$INLINE_ACTION\",\"_$$INLINE_ACTION2\"]";
import { doSomethingOnTheServer } from "./server-stuff";
export const Test = ({
  foo,
  bar
}) => {
  return <form action={_$$INLINE_ACTION.bind(null, {
    foo: foo
  })}>
      <input name="test" type="text" />
      <button type="submit">Submit</button>
      <button type="button" formAction={_$$INLINE_ACTION2.bind(null, {
      foo: foo,
      bar: bar
    })}>
        Submit
      </button>
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
export const _$$INLINE_ACTION2 = async ({
  foo: foo,
  bar: bar
}, data) => {
  const test = data.get("test");
  await doSomethingOnTheServer({
    test,
    foo,
    bar
  });
  return {
    success: true
  };
};