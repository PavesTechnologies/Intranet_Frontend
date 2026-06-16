import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { useDrag } from "react-dnd";
import {
  MoreHorizontalIcon,
  AddIcon,
  ApprovedIcon
} from "../../../../components/icons";
import RiskBadge from "../RiskBadge";

const TaskCard = ({
  task,
  sprints = [],
  stories = [],
  onAddToSprint,
  onSelectParentStory,
  onClick,
  riskCount = 0,
  projectId,
  navigate,
  readOnly = false,
}) => {
  const [{ isDragging }, dragRef] = useDrag({
    type: "TASK",
    item: { id: task.id, type: "TASK" },
    canDrag: !readOnly,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  const [showMenu, setShowMenu] = useState(false);
  const [showStoryList, setShowStoryList] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [storyPos, setStoryPos] = useState({ top: 0, right: 0 });

  const menuBtnRef = useRef(null);
  const storyBtnRef = useRef(null);
  const sprintDropdownRef = useRef(null);
  const storyDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const inMenuBtn        = menuBtnRef.current?.contains(event.target);
      const inStoryBtn       = storyBtnRef.current?.contains(event.target);
      const inSprintDropdown = sprintDropdownRef.current?.contains(event.target);
      const inStoryDropdown  = storyDropdownRef.current?.contains(event.target);
      if (!inMenuBtn && !inStoryBtn && !inSprintDropdown && !inStoryDropdown) {
        setShowMenu(false);
        setShowStoryList(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleMenu = () => {
    if (menuBtnRef.current) {
      const rect = menuBtnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setShowMenu((prev) => !prev);
    setShowStoryList(false);
  };

  const handleToggleStoryList = (e) => {
    e.stopPropagation();
    if (storyBtnRef.current) {
      const rect = storyBtnRef.current.getBoundingClientRect();
      setStoryPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setShowStoryList((prev) => !prev);
    setShowMenu(false);
  };

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
      ref={readOnly ? undefined : dragRef}
      onClick={() => !readOnly && onClick?.()}
      className={`group relative bg-white px-4 py-3 rounded-lg border border-gray-200 shadow-sm flex items-center gap-3 ${
        readOnly ? "cursor-default opacity-80" : "hover:border-indigo-300 cursor-pointer"
      } ${isDragging ? "opacity-50 scale-95 ring-2 ring-indigo-400" : ""}`}
    >
      {/* TASK label */}
      <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs font-bold shrink-0">
        <ApprovedIcon size={12} />
        TASK
      </div>

      {/* Title */}
      <p className="flex-1 text-sm text-gray-800 truncate">
        {task.title}
      </p>
      <RiskBadge count={riskCount} issueType="Task" issueId={task.id} projectId={projectId} navigate={navigate} />

      {/* Status */}
      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200 shrink-0">
        {statusText}
      </span>

      {/* Add Story */}
      {!task.storyId && (
        <button
          ref={storyBtnRef}
          onClick={handleToggleStoryList}
          className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 shrink-0"
        >
          <AddIcon size={13} /> Story
        </button>
      )}

      {/* Three Dot Menu */}
      <div
        className="shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={menuBtnRef}
          onClick={handleToggleMenu}
          className="p-1 text-gray-500 hover:text-gray-800"
        >
          <MoreHorizontalIcon size={16} />
        </button>
      </div>

      {/* Sprint dropdown — portal to escape overflow containers */}
      {showMenu && ReactDOM.createPortal(
        <div
          ref={sprintDropdownRef}
          style={{ position: "fixed", top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
          className="w-44 bg-white border border-gray-100 rounded-lg shadow-xl py-1 overflow-hidden"
        >
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
        </div>,
        document.body
      )}

      {/* Story dropdown — portal to escape overflow containers */}
      {showStoryList && ReactDOM.createPortal(
        <div
          ref={storyDropdownRef}
          style={{ position: "fixed", top: storyPos.top, right: storyPos.right, zIndex: 9999 }}
          className="w-48 bg-white border border-gray-100 rounded-lg shadow-xl py-1 overflow-hidden"
        >
          <div className="px-3 py-2 border-b border-gray-50 bg-gray-50/50">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Assign Story
            </span>
          </div>
          {stories.length === 0 ? (
            <p className="text-xs text-gray-400 p-3 text-center italic">No stories</p>
          ) : (
            <div className="max-h-40 overflow-y-auto">
              {stories.map((story) => (
                <button
                  key={story.id}
                  onClick={() => handleSelectStory(story.id)}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors truncate"
                >
                  {story.title}
                </button>
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default TaskCard;
