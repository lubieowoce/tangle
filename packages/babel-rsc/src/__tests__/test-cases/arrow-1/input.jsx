import { doSomethingOnTheServer } from "../server-stuff";

export const Test = ({ foo, bar }) => {
  return (
    <form
      action={async (data) => {
        "use server";
        const test = data.get("test");
        await doSomethingOnTheServer({ test, foo });
        return { success: true };
      }}
    >
      <input name="test" type="text" />
      <button type="submit">Submit</button>
      <button
        type="button"
        formAction={async (data) => {
          "use server";
          const test = data.get("test");
          await doSomethingOnTheServer({ test, foo, bar });
          return { success: true };
        }}
      >
        Submit
      </button>
    </form>
  );
};
