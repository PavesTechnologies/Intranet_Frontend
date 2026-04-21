import React from "react";

const columnStyles = {
  todo: {
    accent: "#f97316",
    background: "#fff7ed",
    border: "#fdba74",
  },
  progress: {
    accent: "#2563eb",
    background: "#eff6ff",
    border: "#93c5fd",
  },
  completed: {
    accent: "#059669",
    background: "#ecfdf5",
    border: "#86efac",
  },
};

const priorityStyles = {
  high: { background: "#fee2e2", color: "#b91c1c" },
  medium: { background: "#fef3c7", color: "#b45309" },
  low: { background: "#e2e8f0", color: "#475569" },
};

const formatLabel = (value) => {
  if (!value) return "Not set";

  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export default function TaskBoard({ tasks, onCardClick, onDelete }) {
  const columns = [
    { key: "todo", title: "To Do", subtitle: "Ready to start" },
    { key: "progress", title: "In Progress", subtitle: "Actively moving" },
    { key: "completed", title: "Completed", subtitle: "Finished tasks" },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: 18,
        alignItems: "start",
      }}
    >
      {columns.map((col) => {
        const style = columnStyles[col.key];
        const list = tasks?.[col.key] || [];

        return (
          <div
            key={col.key}
            style={{
              background: "#ffffff",
              borderRadius: 20,
              border: "1px solid #dbe5f1",
              boxShadow: "0 18px 40px rgba(15,23,42,0.08)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: style.background,
                borderBottom: `1px solid ${style.border}`,
                padding: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <h3 style={{ margin: 0, color: "#0f172a", fontSize: 18 }}>
                    {col.title}
                  </h3>
                  <p style={{ margin: "6px 0 0", color: "#475569", fontSize: 13 }}>
                    {col.subtitle}
                  </p>
                </div>

                <div
                  style={{
                    minWidth: 34,
                    height: 34,
                    borderRadius: 999,
                    background: "#fff",
                    color: style.accent,
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 700,
                    border: `1px solid ${style.border}`,
                  }}
                >
                  {list.length}
                </div>
              </div>
            </div>

            <div style={{ padding: 16, minHeight: 360 }}>
              {list.length === 0 ? (
                <div
                  style={{
                    border: "1px dashed #cbd5e1",
                    borderRadius: 16,
                    padding: 24,
                    textAlign: "center",
                    color: "#64748b",
                    background: "#f8fafc",
                  }}
                >
                  No tasks in this stage.
                </div>
              ) : (
                list.map((task) => {
                  const priorityStyle =
                    priorityStyles[task.priority] || priorityStyles.low;

                  return (
                    <div
                      key={task.task_uuid}
                      style={{
                        background: "#fff",
                        border: "1px solid #e2e8f0",
                        borderRadius: 18,
                        padding: 16,
                        marginBottom: 14,
                        boxShadow: "0 10px 22px rgba(15,23,42,0.05)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 12,
                          marginBottom: 10,
                        }}
                      >
                        <div>
                          <h4
                            style={{
                              margin: 0,
                              fontSize: 16,
                              color: "#0f172a",
                              lineHeight: 1.35,
                            }}
                          >
                            {task.title}
                          </h4>
                          <p
                            style={{
                              margin: "6px 0 0",
                              fontSize: 13,
                              color: "#64748b",
                            }}
                          >
                            {task.description || "No description added yet."}
                          </p>
                        </div>

                        <span
                          style={{
                            ...priorityStyle,
                            padding: "5px 10px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            textTransform: "capitalize",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {task.priority}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                          gap: 10,
                          marginBottom: 14,
                        }}
                      >
                        <div
                          style={{
                            background: "#f8fafc",
                            borderRadius: 12,
                            padding: 10,
                          }}
                        >
                          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>
                            Employee
                          </div>
                          <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 600 }}>
                            {task.employee || "Unknown Employee"}
                          </div>
                        </div>

                        <div
                          style={{
                            background: "#f8fafc",
                            borderRadius: 12,
                            padding: 10,
                          }}
                        >
                          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>
                            Assigned To
                          </div>
                          <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 600 }}>
                            {task.assignedTo || "Unassigned"}
                          </div>
                          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>
                            {task.assigned_to || "No assignee key"}
                          </div>
                        </div>

                        <div
                          style={{
                            background: "#f8fafc",
                            borderRadius: 12,
                            padding: 10,
                          }}
                        >
                          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>
                            Due Date
                          </div>
                          <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 600 }}>
                            {task.dueDate || "Not scheduled"}
                          </div>
                        </div>

                        <div
                          style={{
                            background: "#f8fafc",
                            borderRadius: 12,
                            padding: 10,
                          }}
                        >
                          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>
                            Status
                          </div>
                          <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 600 }}>
                            {formatLabel(task.status)}
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-start",
                          gap: 10,
                        }}
                      >
                        <button
                          onClick={() => onCardClick?.(task)}
                          style={{
                            border: "none",
                            background: "#3b82f6",
                            color: "#ffffff",
                            padding: "5px 9px",
                            borderRadius: 10,
                            cursor: "pointer",
                            fontWeight: 600,
                            minWidth: 96,
                          }}
                        >
                          Edit Task
                        </button>

                        <button
                          onClick={() => onDelete(task.task_uuid)}
                          style={{
                            border: "none",
                            background: "#ef4444",
                            color: "#fff",
                            padding: "10px 14px",
                            borderRadius: 10,
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
