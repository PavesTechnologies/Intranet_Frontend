import React from "react";
import { Bookmark, CheckSquare } from "lucide-react";
import { PALETTE } from "./constants";

/* ---------- Avatar Color Generator ---------- */
const stableColorClass = (k) => {
  const s = String(k ?? "");
  let h = 216;

  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) % 1000;
  }

  return PALETTE[Math.abs(h) % PALETTE.length];
};

/* ---------- Avatar with Right Tooltip ---------- */
export const Avatar = ({ name }) => {
  const displayName = name || "Unassigned";

  const initials = displayName
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const color = stableColorClass(displayName);

  return (
    <div className="relative flex items-center group">

      {/* Avatar Circle */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold cursor-default ${color}`}
      >
        {initials}
      </div>

      {/* Tooltip on right */}
      <div className="absolute left-9 whitespace-nowrap bg-white border border-gray-200 shadow-md text-indigo-600 text-xs font-semibold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none">
        {displayName}
      </div>

    </div>
  );
};

/* ---------- Priority Colors ---------- */
const priorityColors = {
  LOW: "bg-gray-100 text-gray-600",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

/* ---------- Task Card ---------- */
const TaskCard = ({
  task,
  taskProvided,
  taskSnapshot,
  openTaskPanel,
}) => {

  const assignee =
    task.assigneeName ||
    task.assignee?.name ||
    task.assignee?.fullName ||
    "Unassigned";

  const story =
    task.storyName ||
    task.storyTitle ||
    task.story?.title;

  const issueType = (task.issueType || task.type || "TASK").toUpperCase();

  const priorityClass =
    priorityColors[task.priority] || "bg-gray-100 text-gray-600";

  return (
    <div
      ref={taskProvided.innerRef}
      {...taskProvided.draggableProps}
      {...taskProvided.dragHandleProps}
      onClick={() => openTaskPanel(task)}
      className={`bg-white border border-gray-200 rounded-xl p-3 mb-2 cursor-pointer hover:shadow-md transition ${
        taskSnapshot.isDragging ? "opacity-80" : ""
      }`}
    >

      {/* ---------- Header ---------- */}
      <div className="flex items-start justify-between">

        <div className="flex items-start gap-2 flex-1 min-w-0">

          {/* Issue Type Badge */}
          {issueType === "STORY" ? (
            <div className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-[3px] rounded text-[11px] font-semibold shrink-0">
              <Bookmark size={12} strokeWidth={3} />
              STORY
            </div>
          ) : (
            <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-[3px] rounded text-[11px] font-semibold shrink-0">
              <CheckSquare size={12} />
              TASK
            </div>
          )}

          {/* Title */}
          <span className="font-medium text-gray-800 truncate">
            {task.title ?? task.name ?? `Task ${task.id}`}
          </span>

        </div>

        {/* Priority */}
        {task.priority && (
          <span
            className={`text-xs px-2 py-[3px] rounded-md font-semibold ${priorityClass}`}
          >
            {task.priority}
          </span>
        )}

      </div>

      {/* ---------- Story ---------- */}
      {story && (
        <div className="text-xs text-gray-500 mt-1 ml-[70px] truncate">
          {story}
        </div>
      )}

      {/* ---------- Footer ---------- */}
      <div className="flex items-center justify-between mt-3">

        <Avatar name={assignee} />

        <span className="text-xs text-gray-400">
          {task.dueDate
            ? new Date(task.dueDate).toLocaleDateString()
            : ""}
        </span>

      </div>

    </div>
  );
};

export default TaskCard;