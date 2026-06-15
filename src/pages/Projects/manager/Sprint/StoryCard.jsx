import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { useDrag } from "react-dnd";
import {
  MoreHorizontalIcon,
  AddIcon,
  BookmarkIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from "../../../../components/icons";
import RiskBadge from "../RiskBadge";

const StoryCard = ({
  story,
  sprints = [],
  epics = [],
  onAddToSprint,
  onSelectEpic,
  onClick,
  riskCount = 0,
  projectId,
  navigate,
  readOnly = false,
}) => {
  const [{ isDragging }, dragRef] = useDrag({
    type: "STORY",
    item: { id: story.id, type: "STORY" },
    canDrag: !readOnly,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  const [showMenu, setShowMenu] = useState(false);
  const [showEpicList, setShowEpicList] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [epicPos, setEpicPos] = useState({ top: 0, right: 0 });
  const menuRef = useRef(null);
  const menuBtnRef = useRef(null);
  const epicBtnRef = useRef(null);
  const sprintDropdownRef = useRef(null);
  const epicDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const inMenuBtn        = menuBtnRef.current?.contains(event.target);
      const inEpicBtn        = epicBtnRef.current?.contains(event.target);
      const inSprintDropdown = sprintDropdownRef.current?.contains(event.target);
      const inEpicDropdown   = epicDropdownRef.current?.contains(event.target);
      if (!inMenuBtn && !inEpicBtn && !inSprintDropdown && !inEpicDropdown) {
        setShowMenu(false);
        setShowEpicList(false);
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
    setShowEpicList(false);
  };

  const handleToggleEpicList = (e) => {
    e.stopPropagation();
    if (epicBtnRef.current) {
      const rect = epicBtnRef.current.getBoundingClientRect();
      setEpicPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setShowEpicList((prev) => !prev);
    setShowMenu(false);
  };

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
      ref={readOnly ? undefined : dragRef}
      onClick={() => !readOnly && onClick?.()}
      className={`group relative bg-white px-4 py-3 rounded-lg border border-gray-200 shadow-sm flex items-center gap-3 transition-all ${
        readOnly ? "cursor-default opacity-80" : "hover:border-indigo-300 cursor-pointer"
      } ${isDragging ? "opacity-50 scale-95 ring-2 ring-indigo-400" : ""}`}
    >
      {/* STORY label */}
      <div className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px] font-bold shrink-0">
        <BookmarkIcon size={12} strokeWidth={3} />
        STORY
      </div>
     
      {/* Title */}
      <p className="flex-1 text-sm text-gray-800 truncate group-hover:text-indigo-700">
        {story.title}
      </p>
      <RiskBadge count={riskCount} issueType="Story" issueId={story.id} projectId={projectId} navigate={navigate} />

      
     <p className="flex-0 text-sm text-gray-500 truncate group-hover:text-indigo-600">
  <span className="font-medium">Epic:</span> {story.epicTitle|| story.epicName || "None"}
</p>
      {/* Status */}
      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200 shrink-0">
        {statusText}
      </span>

      {/* Add Epic */}
      {!story.epicId && (
        <button
          ref={epicBtnRef}
          onClick={handleToggleEpicList}
          className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 shrink-0"
        >
          <AddIcon size={13} /> Epic
        </button>
      )}

      {/* Menu */}
      <div
        ref={menuRef}
        className="shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={menuBtnRef}
          onClick={handleToggleMenu}
          className="p-1 text-gray-400 hover:text-gray-800 rounded"
        >
          <MoreHorizontalIcon size={16} />
        </button>
      </div>

      {/* Sprint dropdown — fixed portal to escape overflow containers */}
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

      {/* Epic dropdown — fixed portal to escape overflow containers */}
      {showEpicList && ReactDOM.createPortal(
        <div
          ref={epicDropdownRef}
          style={{ position: "fixed", top: epicPos.top, right: epicPos.right, zIndex: 9999 }}
          className="w-48 bg-white border rounded shadow-lg"
        >
          <div className="px-3 py-2 border-b border-gray-50 bg-gray-50/50">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Assign Epic
            </span>
          </div>
          {epics.length === 0 ? (
            <p className="text-xs text-gray-400 p-3 text-center italic">No epics</p>
          ) : (
            epics.map((epic) => (
              <button
                key={epic.id}
                onClick={() => handleSelectEpic(epic.id)}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 truncate"
              >
                {epic.name}
              </button>
            ))
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default StoryCard;