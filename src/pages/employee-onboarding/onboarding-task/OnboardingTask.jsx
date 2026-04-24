import React, { useState } from "react";
import TaskBoard from "./components/TaskBoard";
import AddTaskModal from "./components/AddTaskModal";

export default function OnboardingTask() {
  const [tasks, setTasks] = useState([
    {
      id: 1,
      title: "Submit Documents",
      taskType: "Onboarding",
      employee: "John",
      assignedTo: "HR Team",
      dueDate: "2026-02-20",
      reminderDate: "2026-02-18",
      priority: "high",
      progress: 20,
      status: "todo",
      description: "Upload documents",
      createdBy: "HR Manager",
      createdDate: "2026-02-10",
      sendNotification: true,
      escalationOwner: "HR Admin",
      internalNotes: "",
      comments: "",
    },
    {
      id: 2,
      title: "Create Email ID",
      taskType: "Onboarding",
      employee: "Jane",
      assignedTo: "HR Team",
      dueDate: "2026-02-20",
      reminderDate: "2026-02-18",
      priority: "medium",
      progress: 60,
      status: "progress",
      description: "Create email ID",
      createdBy: "HR Manager",
      createdDate: "2026-02-10",
      sendNotification: true,
      escalationOwner: "HR Admin",
      internalNotes: "",
      comments: "",
    },
    {
      id: 3,
      title: "Orientation", 
      taskType: "Onboarding",
      employee: "John", 
      assignedTo: "HR Team",      
      dueDate: "2026-02-20",
      reminderDate: "2026-02-18",
      priority: "low",
      progress: 100,
      status: "completed",
      description: "Attend orientation",
      createdBy: "HR Manager",
      createdDate: "2026-02-10",
      sendNotification: true,
      escalationOwner: "HR Admin",
      internalNotes: "",
      comments: "",
    },
  ]);

  const [showModal, setShowModal] = useState(false);

  const handleTaskUpdate = (updatedTask) => {
    const updated = tasks.map((task) =>
      task.id === updatedTask.id ? updatedTask : task
    );
    setTasks(updated);
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>Onboarding Tasks</h1>

      <button onClick={() => setShowModal(true)}>
        + Add Task
      </button>

      <TaskBoard
        tasks={tasks}
        setTasks={setTasks}
        onCardClick={handleTaskUpdate}
      />

      <AddTaskModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={(newTask) => {
          setTasks([...tasks, newTask]);
          setShowModal(false);
        }}
      />
    </div>
  );
}
// import React, { useState } from "react";
// import TaskBoard from "./components/TaskBoard";
// import AddTaskModal from "./components/AddTaskModal";


// export default function OnboardingTask() {
//   const [tasks, setTasks] = useState([
//     {
//       id: 1,
//       title: "Submit Documents",
//       employee: "John",
//       assignedTo: "HR Team",
//       dueDate: "Feb 20",
//       priority: "high",
//       progress: 20,
//       status: "todo",
//     },
//     {
//       id: 2,
//       title: "Create Email ID",
//       employee: "John",
//       assignedTo: "admin Team",
//       dueDate: "Feb 18",
//       priority: "medium",
//       progress: 60,
//       status: "progress",
//     },
//     {
//       id: 3,
//       title: "Orientation",
//       employee: "John",
//       assignedTo: "veni",
//       dueDate: "Done",
//       priority: "low",
//       progress: 100,
//       status: "completed",
//     },
//   ]);

//   const [showModal, setShowModal] = useState(false);
//   const [selectedTask, setSelectedTask] = useState(null);

//   const updateTask = (updatedTask) => {
//     const updated = tasks.map((t) =>
//       t.id === updatedTask.id ? updatedTask : t
//     );
//     setTasks(updated);
//     setSelectedTask(null);
//   };

//   return (
//     <div
//       style={{
//         padding: 16,
//         background: "#f8fafc",
//         minHeight: "100vh",
//       }}
//     >
//       {/* Header */}
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           marginBottom: 12,
//         }}
//       >
//         <div>
//           <h2
//             style={{
//               margin: 0,
//               fontSize: 26,
//               fontWeight: 600,
//               color: "#0f172a",
//             }}
//           >
//             Onboarding Tasks
//           </h2>

//           <p
//             style={{
//               margin: 0,
//               fontSize: 13,
//               color: "#64748b",
//             }}
//           >
//             Manage and track onboarding tasks for new employees.
//           </p>
//         </div>

//         <button
//           onClick={() => setShowModal(true)}
//           style={{
//             background: "#1e40af",
//             color: "white",
//             border: "none",
//             padding: "8px 16px",
//             borderRadius: 10,
//             cursor: "pointer",
//             boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
//           }}
//         >
//           + Add Task
//         </button>
//       </div>

//       {/* Board */}
//       <TaskBoard
//         tasks={tasks}
//         setTasks={setTasks}
//         onCardClick={(updatedTask) => {
//           const updated = tasks.map((t) =>
//             t.id === updatedTask.id ? updatedTask : t
//           );
//           setTasks(updated);
//         }}
//       />

//       {/* Add Task Modal */}
//       <AddTaskModal
//         isOpen={showModal}
//         onClose={() => setShowModal(false)}
//         onSave={(task) => setTasks([...tasks, task])}
//       />

//     </div>
//   );
// }
