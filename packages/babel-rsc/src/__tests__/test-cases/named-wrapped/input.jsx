import { doSomethingOnTheServer } from "../server-stuff";

export const Test = ({ foo }) => {
  async function doStuff(data) {
    "use server";
    const test = data.get("test");
    await doSomethingOnTheServer({ test, foo: foo2 });
    return { success: true };
  }
  const foo2 = foo;

  async function doStuffWrapped(data) {
    "use server";
    return doStuff(data);
  }

  return (
    <form action={doStuffWrapped}>
      <input name="test" type="text" />
      <button type="submit">Submit</button>
    </form>
  );
};
