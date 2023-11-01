import { doSomethingOnTheServer } from "./server-stuff";

export const Test = ({ foo }) => {
  async function doStuff(data) {
    "use server";
    const test = data.get("test");
    await doSomethingOnTheServer({ test, foo: foo2 });
    return { success: true };
  }
  const foo2 = foo;
  return (
    <form action={doStuff}>
      <input name="test" type="text" />
      <button type="submit">Submit</button>
    </form>
  );
};
