// src/pages/Projects/MyWork/components/ItemDetailPanel.jsx
import React, { useEffect } from "react";
import { X, ExternalLink } from "lucide-react";
import { useAuth } from "../../../../contexts/AuthContext";
import CommentBox from "../../manager/CommentBox";
import { TYPE_CONFIG, PRIORITY_CONFIG } from "../utils/myWorkUtils";

// Maps item type to the entityType expected by CommentBox
const ENTITY_TYPE_MAP = {
  TASK:  "task",
  STORY: "story",
  BUG:   "bug",
};

export default function ItemDetailPanel({ item, onClose }) {
  const { user } = useAuth();

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!item) return null;

  const typeConfig     = TYPE_CONFIG[item.type]     || TYPE_CONFIG.TASK;
  const priorityConfig = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.MEDIUM;
  const entityType     = ENTITY_TYPE_MAP[item.type] || "task";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50
        flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`flex-shrink-0 px-2 py-0.5 rounded-md text-xs font-semibold
              ${typeConfig.bg} ${typeConfig.color} border ${typeConfig.border}`}>
              {typeConfig.label}
            </span>
            <span className="text-sm font-semibold text-slate-800 truncate">
              {item.title}
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 ml-2 p-1.5 rounded-lg text-slate-400
              hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* Meta */}
          <div className="px-5 py-4 border-b border-slate-100 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-400 font-medium mb-1">Project</p>
                <p className="text-slate-700 font-medium">{item.projectName}</p>
              </div>
              {item.sprintName && (
                <div>
                  <p className="text-xs text-slate-400 font-medium mb-1">Sprint</p>
                  <p className="text-slate-700">{item.sprintName}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-400 font-medium mb-1">Status</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs
                  font-medium bg-slate-100 text-slate-700">
                  {item.statusName}
                </span>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium mb-1">Priority</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs
                  font-semibold ${priorityConfig.bg} ${priorityConfig.color}`}>
                  {priorityConfig.label}
                </span>
              </div>
              {item.dueDate && (
                <div>
                  <p className="text-xs text-slate-400 font-medium mb-1">Due Date</p>
                  <p className={`text-sm font-medium ${
                    item.urgency === "OVERDUE" ? "text-red-600" : "text-slate-700"
                  }`}>
                    {new Date(item.dueDate).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", year: "numeric"
                    })}
                  </p>
                </div>
              )}
              {item.updatedAt && (
                <div>
                  <p className="text-xs text-slate-400 font-medium mb-1">Last Updated</p>
                  <p className="text-sm text-slate-600">
                    {new Date(item.updatedAt).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short"
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Comments — reusing existing CommentBox exactly */}
          <div className="px-5 py-4">
            {user && (
              <CommentBox
                entityId={item.id}
                entityType={entityType}
                currentUser={user}
              />
            )}
          </div>
        </div>

        {/* Footer — link to full detail page */}
        <div className="px-5 py-3 border-t border-slate-100 flex-shrink-0">
          <a
            href={`/projects/${item.projectId}?tab=${
              item.type === "BUG" ? "test-management" :
              item.type === "STORY" ? "backlog" : "backlog"
            }`}
            className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium
              hover:text-indigo-800 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open in {item.projectName}
          </a>
        </div>
      </div>
    </>
  );
}