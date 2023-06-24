import { Timestamp } from "../../../components/timestamp";

export default function Error() {
  return (
    <div className="border-solid border-2 border-[tomato] rounded-lg p-2">
      <div className="mb-2">
        Something went wrong while loading profile. <Timestamp />
      </div>
    </div>
  );
}
