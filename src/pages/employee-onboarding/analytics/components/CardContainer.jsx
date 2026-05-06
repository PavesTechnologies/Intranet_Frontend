export default function CardContainer({ children }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 20,
        marginTop: 10,
      }}
    >
      {children}
    </div>
  );
}
