export default function Loading() {
  return (
    <div
      style={{
        width: "100%",
        minHeight: "16em",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <div>Loading...</div>
        <span style={{ color: "grey" }}>(artifical slowdown)</span>
      </div>
    </div>
  );
}
