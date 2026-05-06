import React, { useState, useRef } from "react";
import TaskCard from "./TaskCard";
import TaskSubCard from "./TaskSubCard";

export default function TaskColumn({
  title,
  tasks,
  status,
  onCardClick,
  onDrop,
  onDragStart,
}) {
  const [openTaskId, setOpenTaskId] = useState(null);
  const cardRefs = useRef({}); // store refs for each card

  const toggleCard = (task) => {
    setOpenTaskId((prev) => (prev === task.id ? null : task.id));
  };

  const headerColor =
    status === "todo"
      ? "PapayaWhip"
      : status === "progress"
      ? "lavender"
      : "honeydew";

  const headerTextColor =
    status === "todo"
      ? "Salmon"
      : status === "progress"
      ? "royalblue"
      : "green";

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDrop(status)}
      style={{
        background: "ghostwhite",
        borderRadius: 12,
        padding: 10,
        flex: 1,
        minHeight: 300,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: headerColor,
          color: headerTextColor,
          fontWeight: 600,
          padding: "8px 10px",
          borderRadius: 8,
          marginBottom: 8,
          fontSize: 14,
        }}
      >
        {title}
      </div>

      {/* Body (NO SCROLL CLIPPING) */}
      <div
        style={{
          flex: 1,
          overflow: "visible", // IMPORTANT
        }}
      >
        {tasks.map((task) => {
          if (!cardRefs.current[task.id]) {
            cardRefs.current[task.id] = React.createRef();
          }

          return (
            <div key={task.id} style={{ marginBottom: 12 }}>
              {/* Main Card */}
              <div
                ref={cardRefs.current[task.id]}
                draggable
                onDragStart={() => onDragStart(task)}
                onClick={() => toggleCard(task)}
              >
                <TaskCard task={task} onClick={() => {}} />
              </div>

              {/* SubCard Overlay */}
              {openTaskId === task.id && (
                <TaskSubCard
                  task={task}
                  anchorRef={cardRefs.current[task.id]}
                  onClose={() => setOpenTaskId(null)}
                  onSave={(updatedTask) => onCardClick(updatedTask)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
