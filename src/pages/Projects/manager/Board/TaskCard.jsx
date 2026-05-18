import React from "react";
import { Bookmark, CheckSquare } from "lucide-react";
import { PALETTE } from "./constants";

/* ---------- Avatar Color Generator ---------- */
const stableColorClass = (k) => {
  const s = String(k ?? "");
  let h = 216;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000;
  return PALETTE[Math.abs(h) % PALETTE.length];
};

/* ---------- Compact Avatar with Tooltip ---------- */
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
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold cursor-default shrink-0 ${color}`}
      >
        {initials}
      </div>
      <div className="absolute left-6 whitespace-nowrap bg-white border border-gray-200 shadow-md text-indigo-600 text-[10px] font-semibold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none z-50">
        {displayName}
      </div>
    </div>
  );
};

/* ---------- Priority Colors ---------- */
const priorityColors = {
  LOW:      "bg-gray-100 text-gray-500",
  MEDIUM:   "bg-blue-50  text-blue-600",
  HIGH:     "bg-orange-50 text-orange-600",
  CRITICAL: "bg-red-50   text-red-600",
};

/* ---------- Compact Task Card ---------- */
const TaskCard = ({ task, taskProvided, taskSnapshot, openTaskPanel }) => {
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
  const priorityClass = priorityColors[task.priority] || "bg-gray-100 text-gray-500";

  return (
    <div
      ref={taskProvided.innerRef}
      {...taskProvided.draggableProps}
      {...taskProvided.dragHandleProps}
      onClick={() => openTaskPanel(task)}
      className={`bg-white border border-gray-200 rounded-lg p-3 mb-2.5 cursor-pointer hover:shadow-sm hover:border-indigo-200 transition-all ${
        taskSnapshot.isDragging ? "opacity-80 shadow-lg rotate-1" : ""
      }`}
    >
      {/* Row 1 — type badge + title + priority */}
      <div className="flex items-center gap-1.5">
        {/* Issue type badge */}
        {issueType === "STORY" ? (
          <span className="inline-flex items-center gap-0.5 text-indigo-600 bg-indigo-50 px-1.5 py-[1px] rounded text-[9px] font-bold shrink-0 leading-tight">
            <Bookmark size={9} strokeWidth={3} />
            STORY
          </span>
        ) : (
          <span className="inline-flex items-center gap-0.5 text-emerald-600 bg-emerald-50 px-1.5 py-[1px] rounded text-[9px] font-bold shrink-0 leading-tight">
            <CheckSquare size={9} />
            TASK
          </span>
        )}

        {/* Title */}
        <span className="text-[12px] font-medium text-gray-800 truncate flex-1 leading-snug">
          {task.title ?? task.name ?? `Task ${task.id}`}
        </span>

        {/* Priority */}
        {task.priority && (
          <span className={`text-[9px] font-semibold px-1.5 py-[1px] rounded shrink-0 leading-tight ${priorityClass}`}>
            {task.priority}
          </span>
        )}
      </div>

      {/* Row 2 — story/module name (optional) */}
      {story && (
        <div className="text-[10px] text-gray-400 mt-1 ml-[52px] truncate leading-tight">
          {story}
        </div>
      )}

      {/* Row 3 — assignee avatar + due date */}
      <div className="flex items-center justify-between mt-2">
        <Avatar name={assignee} />
        <span className="text-[10px] text-gray-400 leading-tight">
          {task.dueDate
            ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : ""}
        </span>
      </div>
    </div>
  );
};

export default TaskCard;
