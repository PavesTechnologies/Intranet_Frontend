import React, { useState, useRef, useEffect } from "react";
import { useDrag } from "react-dnd";
import { MoreHorizontal, Plus, CheckSquare } from "lucide-react";

const TaskCard = ({
  task,
  sprints = [],
  stories = [],
  onAddToSprint,
  onSelectParentStory,
  onClick,
}) => {
  const [{ isDragging }, dragRef] = useDrag({
    type: "TASK",
    item: { id: task.id, type: "TASK" },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  const [showMenu, setShowMenu] = useState(false);
  const [showStoryList, setShowStoryList] = useState(false);

  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
        setShowStoryList(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSprint = (sprintId) => {
    onAddToSprint?.(task.id, sprintId);
    setShowMenu(false);
  };

  const handleSelectStory = (storyId) => {
    onSelectParentStory?.(task.id, storyId);
    setShowStoryList(false);
  };

  const rawStatus =
    task.statusText || task.status?.name || task.statusName || "BACKLOG";
  const statusText = String(rawStatus).replace(/_/g, " ");

  return (
    <div
      ref={dragRef}
      onClick={() => onClick?.()}
      className={`group relative bg-white px-4 py-3 rounded-lg border border-gray-200 shadow-sm hover:border-indigo-300 cursor-pointer flex items-center gap-3 ${
        isDragging ? "opacity-50 scale-95 ring-2 ring-indigo-400" : ""
      }`}
    >
      {/* TASK label */}
      <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs font-bold shrink-0">
        <CheckSquare size={12} />
        TASK
      </div>

      {/* Title */}
      <p className="flex-1 text-sm text-gray-800 truncate">
        {task.title}
      </p>

      {/* Status */}
      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200 shrink-0">
        {statusText}
      </span>

      {/* Add Story */}
      {task.storyId === null && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowStoryList((prev) => !prev);
            setShowMenu(false);
          }}
          className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 shrink-0"
        >
          <Plus size={13} /> Story
        </button>
      )}

      {/* Three Dot Menu */}
      <div
        ref={menuRef}
        className="relative shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => {
            setShowMenu((prev) => !prev);
            setShowStoryList(false);
          }}
          className="p-1 text-gray-500 hover:text-gray-800"
        >
          <MoreHorizontal size={16} />
        </button>

        {showMenu && (
          <div className="absolute right-0 mt-1 w-40 bg-white border rounded shadow-lg z-50">
            <div className="px-3 py-1 text-xs text-gray-500 border-b">
              Move to Sprint
            </div>

            {sprints.length === 0 ? (
              <p className="text-xs text-gray-400 p-2 text-center">
                No sprints
              </p>
            ) : (
              sprints.map((sprint) => (
                <button
                  key={sprint.id}
                  onClick={() => handleSelectSprint(sprint.id)}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-indigo-50"
                >
                  {sprint.name}
                </button>
              ))
            )}
          </div>
        )}

        {showStoryList && (
          <div className="absolute right-0 bottom-full mb-2 w-48 bg-white border rounded shadow-lg z-50">
            <div className="px-3 py-1 text-xs text-gray-500 border-b">
              Assign Story
            </div>

            {stories.map((story) => (
              <button
                key={story.id}
                onClick={() => handleSelectStory(story.id)}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 truncate"
              >
                {story.title}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;