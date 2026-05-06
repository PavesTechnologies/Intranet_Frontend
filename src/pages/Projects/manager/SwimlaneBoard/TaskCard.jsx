import React, { useState } from "react";
import Avatar from "../Board/Avatar";

/* ─────────────────────────────────────────────────────────
   Task card  — same visual style as Board.jsx task cards
   Used inside SwimlaneBoard grid cells
───────────────────────────────────────────────────────── */
const TaskCard = ({ task, provided, snapshot, onOpen }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      onClick={() => onOpen(task)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`bg-white p-3 rounded shadow-sm mb-2 cursor-pointer border transition-all
        ${snapshot.isDragging
          ? "opacity-80 shadow-lg rotate-1 border-indigo-200"
          : hovered
            ? "border-indigo-200 shadow"
            : "border-transparent"
        }`}
    >
      {/* top row: icon + title + priority */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-green-600 text-sm flex-shrink-0">☑️</span>
          <span className="font-medium text-gray-800 truncate text-sm">
            {task.title ?? task.name ?? `Task ${task.id}`}
          </span>
        </div>
        <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">
          {task.priority ?? ""}
        </span>
      </div>

      {/* footer: assignee + due date */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1">
          {task.assigneeName && <Avatar name={task.assigneeName} />}
          {task.assigneeName && (
            <span className="text-xs text-gray-400 truncate max-w-[80px]">
              {task.assigneeName}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">
          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : ""}
        </span>
      </div>
    </div>
  );
};

export default TaskCard;