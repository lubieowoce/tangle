import { FlashOnMount } from "./animate-on-mount";

export function Timestamp() {
  const date = new Date().toLocaleTimeString("en-GB");
  return (
    <FlashOnMount key={date} as="small">
      <span style={{ marginLeft: "8px" }}>[rendered at: {date}]</span>
    </FlashOnMount>
  );
}
