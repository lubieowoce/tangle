/* eslint-disable @typescript-eslint/no-unused-vars */
import { doSomethingOnTheServer } from "../server-stuff";
import "./server-stuff";

export const Test = ({ foo }) => {
  const foo1 = foo;

  async function doStuff(data) {
    "use server";

    const nested = async () => {
      "use server";
      console.log("hi from nested!", foo1);
    };
    await nested();

    const test = data.get("test");
    await doSomethingOnTheServer({ test, foo: foo1 });
  }
  return (
    <form action={doStuff}>
      <input name="test" type="text" />
      <button type="submit">Submit</button>
    </form>
  );
};
