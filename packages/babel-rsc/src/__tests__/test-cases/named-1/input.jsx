import { doSomethingOnTheServer } from "../server-stuff";

export const Test = ({ foo }) => {
  async function doStuff(data) {
    "use server";
    const test = data.get("test");
    await doSomethingOnTheServer({ test, foo });
    return { success: true };
  }
  return (
    <form action={doStuff}>
      <input name="test" type="text" />
      <button type="submit">Submit</button>
    </form>
  );
};
