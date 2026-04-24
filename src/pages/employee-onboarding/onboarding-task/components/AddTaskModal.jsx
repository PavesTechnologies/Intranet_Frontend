import React, { useEffect, useState } from "react";

/* ---------- HELPERS ---------- */
const normalizeStatusValue = (status) => {
  if (!status) return "todo";
  const s = status.toLowerCase();
  if (s.includes("progress")) return "progress";
  if (s.includes("complete")) return "completed";
  return "todo";
};

const createInitialFormData = (data) => {
  const d = data ?? {};

  console.log("🔧 createInitialFormData input:", d);
  console.log("🔧 assigned_to value:", d.assigned_to, "type:", typeof d.assigned_to);

  return {
    title: d.task_title || d.title || "",
    taskType: d.task_type || d.taskType || "Onboarding",
    user_uuid: d.user_uuid || "",
    assigned_to: (typeof d.assigned_to === 'string' ? d.assigned_to : String(d.assigned_to || "")) || "",
    assigned_team: d.assigned_team || "IT Team",
    priority: (d.priority || "medium").toLowerCase(),
    status: normalizeStatusValue(d.status),
    progress: d.progress || 0,
    dueDate: d.due_date?.split("T")[0] || d.dueDate || "",
    reminderDate: d.reminder_date?.split("T")[0] || d.reminderDate || "",
    description: d.description || "",
  };
};

/* ---------- UI STYLES ---------- */
const inputStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  fontSize: "14px",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const labelStyle = { 
  fontWeight: 600, 
  marginBottom: 8,
  fontSize: "14px",
  color: "#1f2937",
  display: "block",
};

/* ---------- COMPONENT ---------- */
export default function AddTaskModal({
  isOpen,
  onClose,
  onSave,
  employees = [],
  assignees = [],
  initialData,
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
    const { name, value } = e.target;

    // employee UUID - store the value directly
    if (name === "user_uuid") {
      setFormData((p) => ({ ...p, user_uuid: value }));
      return;
    }

    // assignee - store the value (ID/email/uuid) from the option
    if (name === "assigned_to") {
      console.log("🔄 assigned_to change:", value, "type:", typeof value);
      setFormData((p) => ({
        ...p,
        assigned_to: String(value || ""), // Ensure it's always a string
      }));
      return;
    }

    // All other fields
    setFormData((p) => ({ ...p, [name]: value }));
  };

  /* ---------- VALIDATION ---------- */
  const isFormValid = () => {
    const titleValid = formData.title && typeof formData.title === 'string' && formData.title.trim();
    const userValid = formData.user_uuid && typeof formData.user_uuid === 'string' && formData.user_uuid.trim();
    const assignedValid = formData.assigned_to && typeof formData.assigned_to === 'string' && formData.assigned_to.trim();

    // Debug logging
    if (!assignedValid) {
      console.log("🔍 Validation failed for assigned_to:", {
        value: formData.assigned_to,
        type: typeof formData.assigned_to,
        isString: typeof formData.assigned_to === 'string',
        hasTrim: typeof formData.assigned_to === 'string' && Boolean(formData.assigned_to.trim())
      });
    }

    return titleValid && userValid && assignedValid;
  };

  const disabled = !isFormValid();

  /* ---------- SUBMIT ---------- */
  const handleSubmit = () => {
    // Validation with user feedback
    if (!formData.title || typeof formData.title !== 'string' || !formData.title.trim()) {
      console.error("❌ Task Title is required");
      alert("⚠️ Please enter a Task Title");
      return;
    }
    if (!formData.user_uuid || typeof formData.user_uuid !== 'string' || !formData.user_uuid.trim()) {
      console.error("❌ Employee is required");
      alert("⚠️ Please select an Employee");
      return;
    }
    if (!formData.assigned_to || typeof formData.assigned_to !== 'string' || !formData.assigned_to.trim()) {
      console.error("❌ Assigned To is required");
      alert("⚠️ Please select who to assign this task to");
      return;
    }

    // Build payload matching backend structure exactly
    const payload = {
      user_uuid: formData.user_uuid.trim(),
      task_title: formData.title.trim(),
      task_type: formData.taskType || "Onboarding",
      description: formData.description.trim(),
      assigned_to: formData.assigned_to.trim(),
      assigned_team: formData.assigned_team || "IT Team",
      priority: formData.priority || "medium", // lowercase: high, medium, low
      status: 
        formData.status === "todo" ? "To Do" :
        formData.status === "progress" ? "In Progress" :
        "Completed",
      progress: parseInt(formData.progress) || 0,
      due_date: formData.dueDate || new Date().toISOString().split("T")[0],
      reminder_date: formData.reminderDate || formData.dueDate || new Date().toISOString().split("T")[0],
      send_notification: true,
      escalation_owner: "Manager",
      internal_notes: "",
      comments: "",
      created_by: "Admin",
    };

    // Attach task_uuid for update mode
    if (mode === "edit" && initialData?.task_uuid) {
      payload.task_uuid = initialData.task_uuid;
    }

    console.log("📤 SENDING PAYLOAD:", JSON.stringify(payload, null, 2));
    console.log("✅ Validation passed, submitting...");

    // Call parent's onSave callback
    if (typeof onSave === "function") {
      console.log("🔄 Calling onSave callback...");
      onSave(payload);
      console.log("✅ onSave callback called successfully");
    } else {
      console.error("❌ onSave callback not provided or not a function");
      alert("❌ Error: Unable to save task. Please refresh the page and try again.");
    }
  };

  /* ---------- UI ---------- */
  return (
    <div style={overlay}>
      <div style={modal}>
        <h2 style={{ 
          marginTop: 0, 
          marginBottom: "20px", 
          fontSize: "22px",
          color: "#1f2937",
          fontWeight: "700"
        }}>
          {mode === "edit" ? "Edit Task" : "Create Task"}
        </h2>

        <div style={grid}>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={labelStyle}>Task Title</label>
            <input
              name="title"
              value={formData.title}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Employee</label>
            <select
              name="user_uuid"
              value={formData.user_uuid}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="">Select</option>
              {employees.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
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
              <option value="">Select</option>
              {assignees.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
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

          <div style={{ gridColumn: "1/-1" }}>
            <label style={labelStyle}>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              style={{ ...inputStyle, height: 80 }}
            />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: "20px" }}>
          <button 
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              background: "#f3f4f6",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              color: "#374151",
              transition: "all 0.2s",
              outline: "none",
            }}
            onMouseEnter={(e) => e.target.style.background = "#e5e7eb"}
            onMouseLeave={(e) => e.target.style.background = "#f3f4f6"}
          >
            Cancel
          </button>
          <button 
            type="button"
            disabled={disabled} 
            onClick={handleSubmit}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              background: disabled ? "#d1d5db" : "#3b82f6",
              color: "#fff",
              cursor: disabled ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.2s",
              outline: "none",
              opacity: disabled ? 0.6 : 1,
            }}
            onMouseEnter={(e) => !disabled && (e.target.style.background = "#2563eb")}
            onMouseLeave={(e) => !disabled && (e.target.style.background = "#3b82f6")}
          >
            {mode === "edit" ? "Update Task" : "Create Task"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- STYLES ---------- */
const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};

const modal = {
  width: "90%",
  maxWidth: "800px",
  background: "#fff",
  padding: "30px",
  borderRadius: "12px",
  boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
  maxHeight: "90vh",
  overflowY: "auto",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "16px",
  marginBottom: "20px",
};
