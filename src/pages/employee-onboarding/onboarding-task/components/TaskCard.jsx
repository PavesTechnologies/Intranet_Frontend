import React from "react";

export default function TaskCard({ task, onClick, employees = [], assignees = [] }) {
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


const getEmployeeName = (id, employees) => {
  if (!id) return "Unknown Employee";
  const emp = employees.find((e) => String(e.uuid) === String(id));
  return emp ? emp.name : "Unknown Employee";
};

const getAssigneeName = (id, employees) => {
  if (!id) return "Unassigned";
  const assignee = employees.find((a) => String(a.uuid) === String(id));
  return assignee ? assignee.name : id;
};

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
       <p>{getEmployeeName(task.user_uuid, employees)}</p>
    <p>{getAssigneeName(task.assigned_to, employees)}</p>

  
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
