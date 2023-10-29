"babel-plugin-inline-actions: [\"_$$INLINE_ACTION\"]";
import { doSomethingOnTheServer } from "./server-stuff";
export const Test = ({
  foo
}) => {
  return <form action={_$$INLINE_ACTION.bind(null, {
    foo: foo
  })}>
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