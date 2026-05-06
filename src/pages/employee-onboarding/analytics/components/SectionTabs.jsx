export default function SectionTabs() {
  const tabStyle = {
    border: "none",
    background: "transparent",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 500,
  };

  return (
    <div style={{ display: "flex", gap: 20 }}>
      <button
        style={{
          ...tabStyle,
          borderBottom: "2px solid #6c5ce7",
          color: "#6c5ce7",
        }}
      >
        Headcount by Demographics
      </button> 
    </div>
  );
}
