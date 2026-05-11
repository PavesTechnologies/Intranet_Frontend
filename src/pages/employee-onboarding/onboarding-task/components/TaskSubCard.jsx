import React, { useEffect, useRef, useState } from "react";
import FilterListbox from "../../../../components/filter/FilterListbox";

export default function TaskSubCard({ task, anchorRef, onClose, onSave }) {
  const panelRef = useRef();
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(task);
  const [position, setPosition] = useState({ top: 200, left: 200 });

  /* Calculate center of clicked card */
  useEffect(() => {
    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top + rect.height / 2,
        left: rect.left + rect.width / 2,
      });
    }
  }, [anchorRef]);

  /* Close on outside click */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    onSave({ ...form, progress: Number(form.progress) || 0 });
    setEditMode(false);
  };

  const inputStyle = {
    width: "100%",
    border: "1px solid lightgray",
    borderRadius: 6,
    padding: "6px 8px",
    fontSize: 14,
  };

  const labelStyle = {
    fontWeight: 600,
    fontSize: 13,
    color: "slategray",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.12)",
        zIndex: 999,
      }}
    >
      <div
        ref={panelRef}
        style={{
          position: "fixed",
          top: position.top,
          left: position.left,
          transform: "translate(-50%, -50%)",
          width: 440,
          background: "white",
          borderRadius: 12,
          padding: 20,
          boxShadow: "0 20px 45px rgba(0,0,0,0.25)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          {!editMode ? (
            <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{task.title}</div>
          ) : (
            <input name="title" value={form.title} onChange={handleChange} style={inputStyle} />
          )}

          <button onClick={onClose} style={{ border: "none", background: "whitesmoke", borderRadius: 6, padding: "4px 10px" }}>
            ✕
          </button>
        </div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={labelStyle}>Employee</div>
            {!editMode ? <div>{task.employee}</div> : <input name="employee" value={form.employee} onChange={handleChange} style={inputStyle} />}
          </div>

          <div>
            <div style={labelStyle}>AssignedTo</div>
            {!editMode ? <div>{task.assignedTo}</div> : <input name="assignedTo" value={form.assignedTo} onChange={handleChange} style={inputStyle} />}
          </div>

          <div>
            <div style={labelStyle}>Due Date</div>
            {!editMode ? <div>{task.dueDate}</div> : <input type="date" name="dueDate" value={form.dueDate} onChange={handleChange} style={inputStyle} />}
          </div>

          <div>
            <div style={labelStyle}>Progress (%)</div>
            {!editMode ? <div>{task.progress}%</div> : <input type="number" name="progress" value={form.progress} onChange={handleChange} style={inputStyle} />}
          </div>

          <div>
            <div style={labelStyle}>Priority</div>
            {!editMode ? (
              <div>{task.priority}</div>
            ) : (
              <FilterListbox
                options={[{value:"high",label:"High"},{value:"medium",label:"Medium"},{value:"low",label:"Low"}]}
                value={form.priority}
                onChange={(val) => handleChange({ target: { name: "priority", value: val } })}
              />
            )}
          </div>
          <div>
            <div style={labelStyle}>Status</div>

            {!editMode ? (
              <div style={{ textTransform: "capitalize" }}>
                {task.status}
              </div>
            ) : (
              <FilterListbox
                options={[{value:"todo",label:"To Do"},{value:"progress",label:"In Progress"},{value:"completed",label:"Completed"}]}
                value={form.status}
                onChange={(val) => handleChange({ target: { name: "status", value: val } })}
              />
            )}
          </div>

          <div>
            <div style={labelStyle}>Description</div>
            {!editMode ? (
              <div style={{ color: "gray" }}>{task.description || "-"}</div>
            ) : (
              <textarea name="description" value={form.description || ""} onChange={handleChange} style={{ ...inputStyle, minHeight: 70 }} />
            )}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
          {!editMode ? (
            <button style={{ background: "royalblue", color: "white", border: "none", padding: "8px 18px", borderRadius: 6 }} onClick={() => setEditMode(true)}>
              Edit
            </button>
          ) : (
            <>
              <button style={{ background: "lightgray", border: "none", padding: "8px 18px", borderRadius: 6 }} onClick={() => setEditMode(false)}>
                Cancel
              </button>

              <button style={{ background: "green", color: "white", border: "none", padding: "8px 18px", borderRadius: 6 }} onClick={handleSave}>
                Save
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
