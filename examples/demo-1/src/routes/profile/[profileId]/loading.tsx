export default function Loading({ params }: { params: { profileId: string } }) {
  return (
    <div className="border-solid border-2 border-gray-300 rounded-lg p-2 text-gray-300">
      Loading profile {params.profileId}...
    </div>
  );
}
