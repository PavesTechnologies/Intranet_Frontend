import React, { useState } from "react";

export default function AddTaskModal({
  isOpen,
  onClose,
  onSave,
}) {
  const [formData, setFormData] = useState({
    title: "",
    taskType: "Onboarding",
    employee: "",
    assignedTo: "",
    priority: "medium",
    dueDate: "",
    reminderDate: "",
    description: "",
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = () => {
    onSave({
      ...formData,
      id: Date.now(),
      progress: 0,
      status: "todo",
      createdBy: "HR Manager",
      createdDate: new Date().toISOString().split("T")[0],
      sendNotification: true,
      attachment: "",
      escalationOwner: "",
      internalNotes: "",
      comments: "",
    });
  };

  const inputStyle = {
    width: "100%",
    padding: "10px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    marginTop: 6,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 999,
      }}
    >
      <div
        style={{
          width: 500,
          background: "white",
          borderRadius: 14,
          padding: 24,
        }}
      >
        <h2>Create New Task</h2>

        <input
          name="title"
          placeholder="Task Title"
          value={formData.title}
          onChange={handleChange}
          style={inputStyle}
        />

        <input
          name="employee"
          placeholder="Employee Name"
          value={formData.employee}
          onChange={handleChange}
          style={inputStyle}
        />

        <input
          name="assignedTo"
          placeholder="Assigned To Team"
          value={formData.assignedTo}
          onChange={handleChange}
          style={inputStyle}
        />

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

        <input
          type="date"
          name="dueDate"
          value={formData.dueDate}
          onChange={handleChange}
          style={inputStyle}
        />

        <textarea
          name="description"
          rows={3}
          placeholder="Task Description"
          value={formData.description}
          onChange={handleChange}
          style={inputStyle}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 20,
          }}
        >
          <button onClick={onClose}>Cancel</button>
          <button
            onClick={handleSubmit}
            style={{
              background: "#2563eb",
              color: "white",
              border: "none",
              padding: "10px 16px",
              borderRadius: 8,
            }}
          >
            Save Task
          </button>
        </div>
      </div>
    </div>
  );
}










// "use client";

// import React, { useState } from "react";

// export default function AddTaskModal({ isOpen, onClose, onSave }) {
//   const [formData, setFormData] = useState({
//     title: "",
//     employee: "",
//     priority: "medium",
//     dueDate: "",
//     description: "",
//   });

//   if (!isOpen) return null;

//   const handleChange = (e) => {
//     setFormData({ ...formData, [e.target.name]: e.target.value });
//   };

//   const handleSubmit = () => {
//     if (!formData.title) return;

//     onSave({
//       ...formData,
//       id: Date.now(),
//       progress: 0,
//       status: "todo",
//     });

//     setFormData({
//       title: "",
//       employee: "",
//       priority: "medium",
//       dueDate: "",
//       description: "",
//     });

//     onClose();
//   };

//   const inputStyle = {
//     width: "100%",
//     border: "1px solid #e2e8f0",
//     borderRadius: 8,
//     padding: "8px 10px",
//     fontSize: 13,
//     outline: "none",
//   };

//   const labelStyle = {
//     fontSize: 12,
//     fontWeight: 600,
//     marginBottom: 4,
//     display: "block",
//     color: "#334155",
//   };

//   return (
//     <div
//       style={{
//         position: "fixed",
//         inset: 0,
//         background: "rgba(0,0,0,0.35)",
//         backdropFilter: "blur(2px)",
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//         zIndex: 50,
//       }}
//     >
//       {/* Modal Card */}
//       <div
//         style={{
//           background: "#ffffff",
//           borderRadius: 14,
//           width: "92%",
//           maxWidth: 520,
//           padding: 24,
//           boxShadow: "0 18px 40px rgba(0,0,0,0.18)",
//           animation: "fadeIn 0.18s ease",
//         }}
//       >
//         {/* Header */}
//         <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
//           Create New Task
//         </h2>
//         <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>
//           Fill the details to create onboarding task.
//         </p>

//         {/* Form */}
//         <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

//           {/* Title */}
//           <div>
//             <label style={labelStyle}>Task Title</label>
//             <input
//               name="title"
//               value={formData.title}
//               onChange={handleChange}
//               style={inputStyle}
//             />
//           </div>

//           {/* Employee */}
//           <div>
//             <label style={labelStyle}>Assign Employee</label>
//             <input
//               name="employee"
//               value={formData.employee}
//               onChange={handleChange}
//               style={inputStyle}
//             />
//           </div>

//           {/* Priority + Date */}
//           <div style={{ display: "flex", gap: 10 }}>
//             <div style={{ flex: 1 }}>
//               <label style={labelStyle}>Priority</label>
//               <select
//                 name="priority"
//                 value={formData.priority}
//                 onChange={handleChange}
//                 style={inputStyle}
//               >
//                 <option value="high">High</option>
//                 <option value="medium">Medium</option>
//                 <option value="low">Low</option>
//               </select>
//             </div>

//             <div style={{ flex: 1 }}>
//               <label style={labelStyle}>Due Date</label>
//               <input
//                 type="date"
//                 name="dueDate"
//                 value={formData.dueDate}
//                 onChange={handleChange}
//                 style={inputStyle}
//               />
//             </div>
//           </div>

//           {/* Description */}
//           <div>
//             <label style={labelStyle}>Task Description</label>
//             <textarea
//               name="description"
//               value={formData.description}
//               onChange={handleChange}
//               rows={3}
//               style={{ ...inputStyle, resize: "none" }}
//             />
//           </div>
//         </div>

//         {/* Buttons */}
//         <div
//           style={{
//             display: "flex",
//             justifyContent: "flex-end",
//             gap: 10,
//             marginTop: 16,
//           }}
//         >
//           <button
//             onClick={onClose}
//             style={{
//               background: "#e2e8f0",
//               border: "none",
//               padding: "8px 14px",
//               borderRadius: 6,
//               cursor: "pointer",
//             }}
//           >
//             Cancel
//           </button>

//           <button
//             onClick={handleSubmit}
//             style={{
//               background: "#4f6df5",
//               color: "white",
//               border: "none",
//               padding: "8px 14px",
//               borderRadius: 6,
//               cursor: "pointer",
//             }}
//           >
//             Save Task
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }


