/* ─────────────────────────────────────────────────────────
   Story row header  (collapsible, coloured left border)
───────────────────────────────────────────────────────── */

import Avatar from "../Board/Avatar";
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
} from "lucide-react";

// Small fixed set of hex accents used for story left-border & pill
const STORY_HEX = [
  "#6366f1","#0ea5e9","#10b981","#f59e0b",
  "#ef4444","#8b5cf6","#ec4899","#14b8a6",
];
const storyHex = (id) =>
  STORY_HEX[Math.abs(Number(id ?? 0) * 7) % STORY_HEX.length];

const StoryRowHeader = ({ story, taskCount, doneCount, collapsed, onToggle, colSpan }) => {
  // console.log("in StoryRowHeader",story.id);

  if (!story || story.id == null) return null;
  const hex   = storyHex(story.id);
  const pct   = taskCount ? Math.round((doneCount / taskCount) * 100) : 0;

  return (
    <tr>
      <td
        colSpan={colSpan}
        className="p-0 border-t border-slate-100"
        style={{ borderLeft: `4px solid ${hex}` }}
      >
        <div
          onClick={() => taskCount > 0 && onToggle(story.id)}
          className={`flex items-center gap-2 px-3 py-2 select-none transition-colors
            ${taskCount > 0 ? "cursor-pointer hover:bg-slate-50" : "cursor-default"}`}
          style={{
            background: `linear-gradient(90deg, ${hex}10 0%, transparent 60%)`,
          }}
        >
          {/* collapse arrow */}
          <span className="text-slate-400 w-4 flex-shrink-0 flex items-center justify-center">
            {taskCount > 0 ? (
              collapsed
                ? <ChevronRight className="w-3.5 h-3.5" />
                : <ChevronDown  className="w-3.5 h-3.5" />
            ) : null}
          </span>

          {/* icon */}
          <BookOpen className="w-3.5 h-3.5 flex-shrink-0" style={{ color: hex }} />

          {/* story key pill */}
          <span
            className="text-xs font-bold px-2 py-0.5 rounded"
            style={{ background: `${hex}18`, color: hex }}
          >
            {story.epicTitle ? `${story.epicTitle} ·` : ""} STR-{story.id}
          </span>

          {/* title */}
          <span className="text-sm font-semibold text-gray-800 truncate">
            {story.title}
          </span>

          {/* no-tasks badge */}
          {taskCount === 0 && (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full border"
              style={{ color: hex, background: `${hex}12`, borderColor: `${hex}30` }}
            >
              No tasks yet
            </span>
          )}

          <div className="flex-1" />

          {/* progress */}
          {taskCount > 0 && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-16 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: hex }}
                />
              </div>
              <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                {doneCount}/{taskCount}
              </span>
            </div>
          )}

          {/* priority */}
          {story.priority && (
            <span className="text-xs text-gray-400 flex-shrink-0">{story.priority}</span>
          )}

          {/* assignee */}
          {story.assigneeName && (
            <Avatar name={story.assigneeName} />
          )}
        </div>
      </td>
    </tr>
  );
};

export default StoryRowHeader;