export const Test = ({ foo, bar }) => {
  return (
    <form
      action={() => {
        "use server";
        console.log("not async", foo, bar);
      }}
    >
      <input name="test" type="text" />
      <button type="submit">Submit</button>
    </form>
  );
};
