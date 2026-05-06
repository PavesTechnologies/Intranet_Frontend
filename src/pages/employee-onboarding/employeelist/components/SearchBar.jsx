export default function SearchBar({ value, onChange }) {
  return (
    <input
      type="text"
      placeholder="Search by name, email, id, username..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: "8px 12px",
        width: 260,
        borderRadius: 6,
        border: "1px solid #ddd",
        fontSize: 13,
      }}
    />
  );
}
