import { doSomethingOnTheServer } from "../server-stuff";

export const Test = ({ foo }) => {
  const foo2 = foo;
  return (
    <form action={doStuff}>
      <input name="test" type="text" />
      <button type="submit">Submit</button>
    </form>
  );
  async function doStuff(data) {
    "use server";
    const test = data.get("test");
    await doSomethingOnTheServer({ test, foo: foo2 });
    return { success: true };
  }
};

export const Test2 = ({ foo }) => {
  const foo2 = foo;
  {
    return (
      <form action={doStuff}>
        <input name="test" type="text" />
        <button type="submit">Submit</button>
      </form>
    );
    // eslint-disable-next-line no-inner-declarations
    async function doStuff(data) {
      "use server";
      const test = data.get("test");
      await doSomethingOnTheServer({ test, foo: foo2 });
      return { success: true };
    }
  }
};
