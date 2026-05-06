export default function AvatarCircle({ name, index = 0 }) {
  const colors = [
    "#6366f1", // Indigo
    "#ec4899", // Pink
    "#14b8a6", // Teal
    "#f59e0b", // Amber
    "#ef4444", // Red
    "#8b5cf6", // Violet
    "#10b981", // Green
  ];

  /* Get initials → first 2 letters only */
  const getInitials = (fullName) => {
    if (!fullName) return "";
    const parts = fullName.trim().split(" ");
    const first = parts[0]?.charAt(0) || "";
    const second = parts[1]?.charAt(0) || "";
    return (first + second).toUpperCase();
  };

  const initials = getInitials(name);

  /* Stable color from name */
  const baseIndex =
    (initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) %
    colors.length;

  /* 🔹 Shift color using row index → prevents consecutive same color */
  const finalIndex = (baseIndex + index) % colors.length;

  const bgColor = colors[finalIndex];

  return (
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: "50%",
        background: bgColor,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 600,
        fontSize: 13,
        textTransform: "uppercase",
      }}
    >
      {initials}
    </div>
  );
}
