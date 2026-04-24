import React from "react";

export default function TaskCard({ task, onClick }) {
  const priorityColor =
    task.priority === "high"
      ? "red"
      : task.priority === "medium"
      ? "orange"
      : "gray";

  const badgeBg =
    task.priority === "high"
      ? "mistyrose"
      : task.priority === "medium"
      ? "lemonchiffon"
      : "gainsboro";

  return (
    <div
      onClick={() => onClick(task)}
      style={{
        background: "white",
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
        boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
        borderLeft: `4px solid ${priorityColor}`,
        cursor: "pointer",
      }}
    >
      <h4
        style={{
          margin: 0,
          fontSize: 15,
          fontWeight: 700,
          color: "#0f172a",
        }}
      >
        {task.title}
      </h4>

      <p>{task.employee}</p>
      <p>{task.assignedTo}</p>
      <p>Due: {task.dueDate}</p>

      <span
        style={{
          background: badgeBg,
          color: priorityColor,
          padding: "3px 8px",
          borderRadius: 6,
        }}
      >
        {task.priority}
      </span>
    </div>
  );
}
// import React from "react";

// export default function TaskCard({ task, onClick }) {
//   const priorityColor =
//     task.priority === "high"
//       ? "red"
//       : task.priority === "medium"
//       ? "orange"
//       : "gray";

//   const badgeBg =
//     task.priority === "high"
//       ? "mistyrose"
//       : task.priority === "medium"
//       ? "lemonchiffon"
//       : "gainsboro";

//   return (
//     <div
//       onClick={() => onClick(task)}
//       style={{
//         background: "white",
//         borderRadius: 10,
//         padding: 12,
//         marginBottom: 12,
//         boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
//         borderLeft: `4px solid ${priorityColor}`,
//         cursor: "pointer",
//       }}
//     >
//       {/* Title */}
//       <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
//         {task.title}
//       </h4>

//       {/* Employee */}
//       <p style={{ margin: "4px 0", fontSize: 12, color: "slategray" }}>
//         {task.employee}
//       </p>

//        {/* Assigned to */}
//       <p style={{ margin: "4px 0", fontSize: 12, color: "slategray" }}>
//         {task.assignedTo}
//       </p>


//       {/* Due */}
//       <p style={{ margin: "2px 0", fontSize: 12, color: "darkgray" }}>
//         Due: {task.dueDate}
//       </p>

//       {/* Priority */}
//       <div style={{ marginTop: 6 }}>
//         <span
//           style={{
//             fontSize: 11,
//             fontWeight: 600,
//             padding: "3px 8px",
//             borderRadius: 6,
//             background: badgeBg,
//             color: priorityColor,
//             textTransform: "capitalize",
//           }}
//         >
//           {task.priority}
//         </span>
//       </div>

//       {/* Progress BELOW priority */}
//       <div
//         style={{
//           marginTop: 6,
//           height: 5,
//           background: "lightgray",
//           borderRadius: 5,
//           overflow: "hidden",
//         }}
//       >
//         <div
//           style={{
//             width: `${task.progress}%`,
//             height: "100%",
//             background:
//               task.progress === 100 ? "green" : task.progress > 50 ? "royalblue" : "Salmon",
//           }}
//         />
//       </div>
//     </div>
//   );
// }
