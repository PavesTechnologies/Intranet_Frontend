import React, { useState } from "react";
import { useDrag } from "react-dnd";
import { MoreHorizontal, Plus, Bookmark } from "lucide-react";

const StoryCard = ({
  story,
  sprints = [],
  epics = [],
  onAddToSprint,
  onSelectEpic,
  onClick,
}) => {
  const [{ isDragging }, dragRef] = useDrag({
    type: "STORY",
    item: { id: story.id, type: "STORY" },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  const [showMenu, setShowMenu] = useState(false);
  const [showEpicList, setShowEpicList] = useState(false);

  const handleSelectSprint = (sprintId) => {
    onAddToSprint?.(story.id, sprintId);
    setShowMenu(false);
  };

  const handleSelectEpic = (epicId) => {
    onSelectEpic?.(story.id, epicId);
    setShowEpicList(false);
  };

  const rawStatus =
    story.statusText || story.status?.name || story.statusName || "BACKLOG";
  const statusText = String(rawStatus).replace(/_/g, " ");

  return (
    <div
      ref={dragRef}
      onClick={() => onClick?.()}
      className={`group relative bg-white px-4 py-3 rounded-lg border border-gray-200 shadow-sm hover:border-indigo-300 cursor-pointer flex items-center gap-3 transition-all ${
        isDragging ? "opacity-50 scale-95 ring-2 ring-indigo-400" : ""
      }`}
    >
      {/* STORY label */}
      <div className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px] font-bold shrink-0">
        <Bookmark size={12} strokeWidth={3} />
        STORY
      </div>
     
      {/* Title */}
      <p className="flex-1 text-sm text-gray-800 truncate group-hover:text-indigo-700">
        {story.title}
      </p>
      
     <p className="flex-0 text-sm text-gray-500 truncate group-hover:text-indigo-600">
  <span className="font-medium">Epic:</span> {story.epicTitle|| story.epicName || "None"}
</p>
      {/* Status */}
      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200 shrink-0">
        {statusText}
      </span>

      {/* Add Epic */}
      {story.epicId === null && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowEpicList((prev) => !prev);
          }}
          className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 shrink-0"
        >
          <Plus size={13} /> Epic
        </button>
      )}

      {/* Menu */}
      <div
        className="relative shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => {
            setShowMenu((prev) => !prev);
            setShowEpicList(false);
          }}
          className="p-1 text-gray-400 hover:text-gray-800 rounded opacity-0 group-hover:opacity-100"
        >
          <MoreHorizontal size={16} />
        </button>

        {showMenu && (
            <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-100 rounded-lg shadow-xl z-50 py-1 overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-50 bg-gray-50/50">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Move to Sprint
                </span>
              </div>
              {sprints.length === 0 ? (
                <p className="text-xs text-gray-400 p-3 text-center italic">No active sprints</p>
              ) : (
                <div className="max-h-40 overflow-y-auto">
                  {sprints.map((sprint) => (
                    <button
                      key={sprint.id}
                      onClick={() => handleSelectSprint(sprint.id)}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                    >
                      {sprint.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        

        {showEpicList && (
          <div className="absolute right-0 bottom-full mb-2 w-48 bg-white border rounded shadow-lg z-50">
            <div className="px-3 py-2 border-b border-gray-50 bg-gray-50/50">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Move to Epic
                </span>
              </div>
            {epics.map((epic) => (
              <button
                key={epic.id}
                onClick={() => handleSelectEpic(epic.id)}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 truncate"
              >
                {epic.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryCard;