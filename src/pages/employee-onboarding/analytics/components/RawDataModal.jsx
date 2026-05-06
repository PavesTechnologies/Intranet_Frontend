export default function RawDataModal({ title, data, onClose }) {
  if (!data) return null;

  const keys = Object.keys(data[0] || {});

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          width: 500,
          maxHeight: "70vh",
          overflow: "auto",
          padding: 20,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginBottom: 15 }}>{title} — Raw Data</h3>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 14,
          }}
        >
          <thead>
            <tr>
              {keys.map((k) => (
                <th
                  key={k}
                  style={{
                    borderBottom: "1px solid #eee",
                    padding: 8,
                    textAlign: "left",
                    background: "#f6f7fb",
                  }}
                >
                  {k}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {data.map((row, i) => (
              <tr key={i}>
                {keys.map((k) => (
                  <td
                    key={k}
                    style={{
                      borderBottom: "1px solid #f0f0f0",
                      padding: 8,
                    }}
                  >
                    {row[k]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <button
          onClick={onClose}
          style={{
            marginTop: 15,
            padding: "6px 12px",
            border: "none",
            background: "#6c5ce7",
            color: "white",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
