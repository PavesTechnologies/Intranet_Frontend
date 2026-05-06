// src/pages/Projects/manager/Sprint/SprintColumn.jsx

import React, { useState } from "react";
import { useDrop } from "react-dnd";
import { ChevronRight, ChevronDown, MoreVertical } from "lucide-react";
import StoryCard from "./StoryCard";
import TaskCard from "./TaskCard";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify"; // if needed for the modal


const SprintColumn = ({
  sprint,
  stories = [],
  tasks = [],
  epics = [],
  allStories = [],
  statuses = [],
  sprints = [],
  permissions,

  onDropStory,
  onDropTask,

  onChangeStatus,
  onEditSprint,
  onDeleteSprint,
  onChangeStoryStatus,

  onSelectEpic,
  onSelectParentStory,
  onStoryClick,
  onTaskClick,
}) => {
  
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleStoryExpand = (storyId) => {
    setExpandedStories((prev) =>
      prev.includes(storyId) ? prev.filter((id) => id !== storyId) : [...prev, storyId]
    );
  };
  
  // Track which stories are expanded inside this specific sprint
  const [expandedStories, setExpandedStories] = useState([]);

  const isCompleted = sprint.status === "COMPLETED";

  const formatPrettyDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const start = formatPrettyDate(sprint.startDateReadable || sprint.startDate);
  const end = formatPrettyDate(sprint.endDateReadable || sprint.endDate);

  const totalItems = stories.length + tasks.length;
  // const isManager = (() => {
  //   const token = localStorage.getItem("token");
  //   if (!token) return false;

  //   try {
  //     const decoded = jwtDecode(token);
  //     return decoded?.roles?.includes("Manager");
  //   } catch {
  //     return false;
  //   }
  // })();

  /** -----------------------------------------
   * DND TO SUPPORT BOTH STORY + TASK
   * -----------------------------------------
   */
  const [{ isOver }, dropRef] = useDrop(
    () => ({
      accept: ["STORY", "TASK"],
      canDrop: () => !isCompleted,
      drop: (item) => {
        if (isCompleted) return;
        if (item.type === "TASK") {
          onDropTask?.(item.id, sprint.id);
        } else {
          onDropStory?.(item.id, sprint.id);
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver() && !isCompleted,
      }),
    }),
    [isCompleted]
  );

  // Sort base items
  const sortedStories = [...stories].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const sortedTasks = [...tasks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Find Independent Tasks (Tasks where task.storyId is null, OR the parent story is not in this sprint)
  const sprintStoryIds = new Set(sortedStories.map((s) => s.id));
  const independentTasks = sortedTasks.filter((t) => !t.storyId || !sprintStoryIds.has(t.storyId));

  return (
    <div
      ref={dropRef}
      className={`border bg-white rounded-xl shadow-sm transition ${
        isOver ? "bg-blue-50 border-blue-400 ring-2 ring-blue-300" : ""
      }`}
    >
      {/* ===========================
          HEADER
      ============================ */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="px-5 py-3 flex justify-between items-center cursor-pointer bg-gray-50 hover:bg-gray-100 rounded-t-xl"
      >
        {/* LEFT SECTION */}
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown size={20} className="text-gray-500" /> : <ChevronRight size={20} className="text-gray-500" />}

          <h3 className="font-semibold text-gray-900 text-[16px]">
            {sprint.name || "Unnamed Sprint"}
          </h3>

          <span className="text-sm text-gray-600 hidden sm:inline-block">
            {start} – {end}
          </span>

          <span className="text-sm text-gray-500">
            ({totalItems} work items)
          </span>
        </div>

        {/* RIGHT SECTION */}
        <div className="flex items-center gap-3">
          {!isCompleted && (
            <button
              disabled={!permissions?.canEdit}
              onClick={(e) => {
                if (!permissions?.canEdit) return;

                e.stopPropagation();
                onChangeStatus(
                  sprint.id,
                  sprint.status === "ACTIVE" ? "complete" : "start"
                );
              }}
              className={`px-4 py-1 border rounded-full text-sm font-medium 
              ${permissions?.canEdit
                ? "text-indigo-700 border-indigo-600 hover:bg-indigo-50"
                : "text-gray-400 border-gray-300 cursor-not-allowed"
              }`}
            >
              {sprint.status === "ACTIVE" ? "Complete sprint" : "Start sprint"}
            </button>
          )}

          {/* Menu - ONLY SHOW IF MANAGER AND (HAS EDIT OR HAS DELETE) */}
          {permissions.canEdit && (onEditSprint || onDeleteSprint) && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((prev) => !prev);
                }}
                className="p-1 rounded-md text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <MoreVertical size={20} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-1 bg-white border border-gray-200 shadow-lg rounded-md w-40 z-20 overflow-hidden">
                  
                  {onEditSprint && (
                    <button
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onEditSprint(sprint);
                      }}
                    >
                      Edit Sprint
                    </button>
                  )}

                  {onDeleteSprint && (
                    <button
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onDeleteSprint(sprint.id);
                      }}
                    >
                      Delete Sprint
                    </button>
                  )}

                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===========================
          BODY CONTENT
      ============================ */}
      {expanded && (
        <div className="p-4 space-y-3 min-h-[80px] bg-white rounded-b-xl">
          {totalItems === 0 && (
            <p className="text-gray-400 italic text-center py-4 border border-dashed rounded-lg bg-gray-50">Drop issues here</p>
          )}

          {/* 1. STORIES WITH NESTED TASKS */}
          {sortedStories.map((story) => {
            const childTasks = sortedTasks.filter((t) => t.storyId === story.id);
            const isStoryExpanded = expandedStories.includes(story.id);

            return (
              <div key={`story-${story.id}`} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  
                  {/* Expand/Collapse Button (Only shows if story has tasks) */}
                  {childTasks.length > 0 ? (
                    <button
                      onClick={() => toggleStoryExpand(story.id)}
                      className="p-1 rounded-md bg-gray-100 hover:bg-indigo-100 text-gray-600 hover:text-indigo-700 transition-colors shadow-sm shrink-0"
                      title={isStoryExpanded ? "Collapse tasks" : "Expand tasks"}
                    >
                      {isStoryExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>
                  ) : (
                    <span className="w-[26px] shrink-0"></span> // Invisible spacer for alignment
                  )}

                  {/* The Parent Story */}
                  <div className="flex-1 min-w-0">
                    <StoryCard
                      story={story}
                      epics={epics}
                      statuses={statuses}
                      sprints={sprints}
                      onAddToSprint={onDropStory}
                      onClick={() => onStoryClick(story.id)}
                    />
                  </div>
                </div>

                {/* Nested Tasks */}
                {isStoryExpanded && childTasks.length > 0 && (
                  <div className="pl-10 border-l-2 border-indigo-100 ml-3 flex flex-col gap-2 py-1 mt-1 mb-2">
                    {childTasks.map((task) => (
                      <TaskCard
                        key={`task-${task.id}`}
                        task={task}
                        stories={allStories}
                        sprints={sprints}
                        onSelectParentStory={onSelectParentStory}
                        onAddToSprint={onDropTask}
                        onClick={() => onTaskClick(task.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* 2. INDEPENDENT TASKS */}
          {independentTasks.length > 0 && (
            <div className={`${sortedStories.length > 0 ? "mt-6 pt-4 border-t border-gray-100" : ""}`}>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                Independent Tasks
              </h4>
              <div className="space-y-2">
                {independentTasks.map((task) => (
                  <div className="pl-8" key={`task-${task.id}`}>
                    <TaskCard
                      task={task}
                      stories={allStories}
                      sprints={sprints}
                      onSelectParentStory={onSelectParentStory}
                      onAddToSprint={onDropTask}
                      onClick={() => onTaskClick(task.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default SprintColumn;