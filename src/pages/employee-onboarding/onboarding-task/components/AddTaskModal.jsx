import React, { useEffect, useState } from "react";

const createInitialFormData = (initialData) => {
  const data = initialData || {}; // ✅ THIS FIXES NULL ERROR

  return {
    title: data.task_title || "",
    taskType: data.task_type || "Onboarding",
    user_uuid: data.user_uuid || "",
    assigned_to: data.assigned_to || "",
    assigned_team: data.assigned_team || "HR Team",
    priority: data.priority || "Medium",
    status: data.status || "To Do",
    progress: data.progress || 0,
    dueDate: data.due_date || "",
    reminderDate: data.reminder_date || "",
    description: data.description || "",
  };
};

const labelStyle = {
  display: "block",
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 600,
  color: "#334155",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontSize: 14,
  color: "#0f172a",
};

const actionButtonStyle = {
  border: "none",
  padding: "10px 18px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 600,
};

export default function AddTaskModal({
  isOpen,
  onClose,
  onSave,
  employees = [],
  assignees = [],
  loadingOptions = false,
  initialData = null,
  mode = "create",
}) {
  const [formData, setFormData] = useState(createInitialFormData(initialData));

  useEffect(() => {
    if (isOpen) {
      setFormData(createInitialFormData(initialData));
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData((current) => ({
      ...current,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.employee_uuid || !formData.assigned_to) {
      return;
    }

    onSave(formData);
  };

  const actionLabel = mode === "edit" ? "Update Task" : "Save Task";
  const titleLabel = mode === "edit" ? "Edit Task" : "Create New Task";
  const subtitleLabel =
    mode === "edit"
      ? "Update task ownership, status, and due dates in one place."
      : "Create a new onboarding task and assign it from the core employee table.";

  const saveDisabled =
    loadingOptions ||
    !formData.title ||
    !formData.employee_uuid ||
    !formData.assigned_to;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 999,
        padding: 20,
      }}
    >
      <div
        style={{
          width: "min(720px, 100%)",
          background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 24px 70px rgba(15,23,42,0.18)",
          border: "1px solid rgba(148,163,184,0.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 22, color: "#0f172a" }}>
              {titleLabel}
            </h2>
            <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 14 }}>
              {subtitleLabel}
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              border: "1px solid #cbd5e1",
              background: "#fff",
              borderRadius: 10,
              padding: "8px 12px",
              cursor: "pointer",
              color: "#334155",
            }}
          >
            Close
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 16,
          }}
        >
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Task Title</label>
            <input
              name="title"
              placeholder="Enter task title"
              value={formData.title}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Employee</label>
            <select
              name="employee_uuid"
              value={formData.employee_uuid}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="">
                {loadingOptions
                  ? "Loading core employee details..."
                  : "Select employee"}
              </option>
              {employees.map((employee) => (
                <option key={employee.value} value={employee.value}>
                  {employee.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Assigned To</label>
            <select
              name="assigned_to"
              value={formData.assigned_to}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="">
                {loadingOptions ? "Loading assignees..." : "Select assignee"}
              </option>
              {assignees.map((assignee) => (
                <option key={assignee.value} value={assignee.value}>
                  {assignee.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Priority</label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="todo">To Do</option>
              <option value="progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Due Date</label>
            <input
              type="date"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Reminder Date</label>
            <input
              type="date"
              name="reminderDate"
              value={formData.reminderDate}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Description</label>
            <textarea
              name="description"
              rows={4}
              placeholder="Describe the task and expected completion"
              value={formData.description}
              onChange={handleChange}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 22,
          }}
        >
          <button
            onClick={onClose}
            style={{
              ...actionButtonStyle,
              background: "#e2e8f0",
              color: "#334155",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saveDisabled}
            style={{
              ...actionButtonStyle,
              background: mode === "edit" ? "#2563eb" : "#0f172a",
              color: "white",
              opacity: saveDisabled ? 0.7 : 1,
              cursor: saveDisabled ? "not-allowed" : "pointer",
            }}
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
