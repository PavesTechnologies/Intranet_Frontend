export default function StatusBadge({ text }) {
  const getColor = (status) => {
    if (!status) return { bg: "#f3f4f6", color: "#6b7280" };

    const s = status.toLowerCase();

    /* 🟢 Green (same as Email Active) */
    if (
      s === "active" ||
      s === "working" ||
      s === "completed"||
      s === "registered"
    ) {
      return { bg: "#e6f9f0", color: "#16a34a" };
    }

    /* 🟠 Orange */
    if (s === "pending" || s === "in progress") {
      return { bg: "#fff7ed", color: "#f59e0b" };
    }

    /* 🔴 Red */
    if (s === "inactive" || s === "rejected") {
      return { bg: "#fee2e2", color: "#dc2626" };
    }

    /* 🔵 Blue */
    if (s === "verified") {
      return { bg: "#e0f2fe", color: "#0284c7" };
    }

    /* Default Gray */
    return { bg: "#f3f4f6", color: "#6b7280" };
  };

  const { bg, color } = getColor(text);

  return (
    <span
      style={{
        background: bg,
        color: color,
        padding: "3px 8px",
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
        display: "inline-block",
        whiteSpace: "nowrap",
        textTransform: "capitalize",
      }}
    >
      {text}
    </span>
  );
}