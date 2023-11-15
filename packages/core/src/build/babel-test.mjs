// import { parse } from "@babel/parser";
// import * as traverse from "@babel/traverse";
import babel from "@babel/core";
import inlineActionPLugin from "./babel-plugin-inline-actions.cjs";
import { readFileSync } from "node:fs";

// const code = `
// export const SomeComponent = ({ foo, bar }) => {
//   return (
//     <form
//       action={async (data) => {
//         "use server";
//         const test = data.get("test");
//         await doSomethingOnTheServer({ test, foo });
//         return { success: true };
//       }}
//     >
//       <input name="test" type="text" />
//       <button type="submit">Submit</button>
//       <button
//         type="button"
//         formAction={async (data) => {
//           "use server";
//           const test = data.get("test");
//           await doSomethingOnTheServer({ test, foo, bar });
//           return { success: true };
//         }}
//       >Submit</button>
//     </form>
//   );
// };

// export const AnotherComponent = ({ foo, bar }) => {
//   const doStuff = async (data) => {
//     "use server";
//     const test = data.get("test");
//     await doSomethingOnTheServer({ test, foo });
//     return { success: true };
//   }
//   return (
//     <form action={doStuff}>
//       <input name="test" type="text" />
//       <button type="submit">Submit</button>
//     </form>
//   );
// };

// export const AnotherComponent2 = ({ foo, bar }) => {
//   async function doStuff(data) {
//     "use server";
//     const test = data.get("test");
//     await doSomethingOnTheServer({ test, foo });
//     return { success: true };
//   }
//   return (
//     <form action={doStuff}>
//       <input name="test" type="text" />
//       <button type="submit">Submit</button>
//     </form>
//   );
// };

// `;

const code = `export const foo = () => ({ get prop() { return 1 } })`;
// const code = readFileSync(process.argv.slice(2)[0], "utf-8");

// const code = `
// export const AnotherComponent2 = ({ foo, bar }) => {
//   async function doStuff(data) {
//     "use server";
//     const test = data.get("test");
//     await doSomethingOnTheServer({ test, foo });
//     return { success: true };
//   }
//   async function doStuff2(data) {
//     "use server";
//     return doStuff(data);
//   }
//   return (
//     <form action={doStuff}>
//       <input name="test" type="text" />
//       <button type="submit">Submit</button>
//       <button type="button" formAction={doStuff2}>Alternate</button>
//     </form>
//   );
// };
// `;

console.log(
  babel.parseSync(code).program.body[0].declaration.declarations[0].init.body
);
process.exit(0);
const output = babel.transform(code, {
  plugins: ["@babel/plugin-syntax-jsx", inlineActionPLugin],
});

console.log(output.code);
