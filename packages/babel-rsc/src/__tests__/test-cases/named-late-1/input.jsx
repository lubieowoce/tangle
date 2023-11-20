import { doSomethingOnTheServer } from "../server-stuff";

export const Test = ({ foo }) => {
  async function doStuff(data) {
    "use server";
    const test = data.get("test");
    await doSomethingOnTheServer({ test, foo: foo2, beep: x });
    return { success: true };
  }
  const foo2 = foo;
  const x = 5;
  return (
    <form action={doStuff}>
      <input name="test" type="text" />
      <button type="submit">Submit</button>
    </form>
  );
};
