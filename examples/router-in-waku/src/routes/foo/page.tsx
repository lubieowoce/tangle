import { slowdown } from "../../slowdown.js";

export default async function PageFoo() {
  await slowdown(1000);
  return (
    <main>
      <h1>/foo</h1>
      <p>Hello from the &quot;Foo&quot; page!</p>
      <p>It loads slowly on purpose, to simulate a slow server-side fetch.</p>
    </main>
  );
}
