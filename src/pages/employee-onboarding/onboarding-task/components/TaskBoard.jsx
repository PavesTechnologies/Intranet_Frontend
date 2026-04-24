import React from "react";
import TaskColumn from "./TaskColumn";

export default function TaskBoard({
  tasks,
  setTasks,
  onCardClick,
}) {
  const todo = tasks.filter((t) => t.status === "todo");
  const progress = tasks.filter((t) => t.status === "progress");
  const completed = tasks.filter((t) => t.status === "completed");

  return (
    <div style={{ display: "flex", gap: 16 }}>
      <TaskColumn
        title="To Do"
        tasks={todo}
        status="todo"
        onCardClick={onCardClick}
      />

      <TaskColumn
        title="In Progress"
        tasks={progress}
        status="progress"
        onCardClick={onCardClick}
      />

      <TaskColumn
        title="Completed"
        tasks={completed}
        status="completed"
        onCardClick={onCardClick}
      />
    </div>
  );
}

// import React, { useState } from "react";
// import TaskColumn from "./TaskColumn";

// export default function TaskBoard({ tasks, setTasks, onCardClick }) {


//   const todo = tasks.filter((t) => t.status === "todo");
//   const progress = tasks.filter((t) => t.status === "progress");
//   const completed = tasks.filter((t) => t.status === "completed");

//   return (
//     <div
//       style={{
//         display: "flex",
//         gap: 16,
//         alignItems: "flex-start",
//         marginTop: 10,
//       }}
//     >
//       <TaskColumn
//         title="To Do"
//         tasks={todo}
//         status="todo"
//         onCardClick={onCardClick}
//       />

//       <TaskColumn
//         title="In Progress"
//         tasks={progress}
//         status="progress"
//         onCardClick={onCardClick}
//       />

//       <TaskColumn
//         title="Completed"
//         tasks={completed}
//         status="completed"
//         onCardClick={onCardClick}
//       />
//     </div>
//   );
// }
