import { useState } from "react";
import DonutChart from "./DonutChart";
import RawDataModal from "./RawDataModal";

export default function ChartCard({ title, data, total, colors }) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <>
      <div
        style={{
          background: "white",
          borderRadius: 10,
          padding: 18,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <h3 style={{ margin: 0 }}>{title}</h3>

          <button
            onClick={() => setShowRaw(true)}
            style={{
              border: "none",
              background: "transparent",
              color: "#6c5ce7",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            👁 View Raw Data
          </button>
        </div>

        {/* Body */}
        <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
          <DonutChart data={data} total={total} colors={colors} />

          <div>
            {[...(data || [])]
              .sort((a, b) => b.value - a.value)
              .map((d, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      display: "inline-block",
                      marginRight: 6,
                      background:
                        d.color || colors?.[i % colors.length] || "#ccc",
                    }}
                  />
                  {d.label} <b>{d.value}</b>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Raw Data Modal */}
      {showRaw && (
        <RawDataModal
          title={title}
          data={data}
          onClose={() => setShowRaw(false)}
        />
      )}
    </>
  );
}
// import { useState } from "react";
// import DonutChart from "./DonutChart";
// import RawDataModal from "./RawDataModal";

// export default function ChartCard({ title, data, total }) {
//   const [showRaw, setShowRaw] = useState(false);

//   return (
//     <>
//       <div
//         style={{
//           background: "white",
//           borderRadius: 10,
//           padding: 18,
//           boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
//         }}
//       >
//         {/* Header */}
//         <div
//           style={{
//             display: "flex",
//             justifyContent: "space-between",
//             marginBottom: 10,
//           }}
//         >
//           <h3 style={{ margin: 0 }}>{title}</h3>

//           <button
//             onClick={() => setShowRaw(true)}
//             style={{
//               border: "none",
//               background: "transparent",
//               color: "#6c5ce7",
//               cursor: "pointer",
//               fontSize: 13,
//             }}
//           >
//             👁 View Raw Data
//           </button>
//         </div>

//         {/* Body */}
//         <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
//           <DonutChart data={data} total={total} />

//           <div>
//   {[...(data || [])]
//     .sort((a, b) => b.value - a.value)
//     .map((d, i) => (
//       <div key={i} style={{ marginBottom: 8 }}>
//         <span
//           style={{
//             width: 10,
//             height: 10,
//             borderRadius: "50%",
//             display: "inline-block",
//             marginRight: 6,
//             background: d.color || "#ccc", // ✅ safe fallback
//           }}
//         />
//         {d.label} <b>{d.value}</b>
//       </div>
//     ))}
// </div>
//         </div>
//       </div>

//       {/* Raw Data Modal */}
//       {showRaw && (
//         <RawDataModal
//           title={title}
//           data={data}
//           onClose={() => setShowRaw(false)}
//         />
//       )}
//     </>
//   );
// }
