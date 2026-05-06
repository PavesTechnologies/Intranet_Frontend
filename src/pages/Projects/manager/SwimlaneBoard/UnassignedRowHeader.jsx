/* ─────────────────────────────────────────────────────────
   Unassigned row header (tasks with no story)
───────────────────────────────────────────────────────── */
import {
  ChevronDown,
  ChevronRight,
} from "lucide-react";
const UnassignedRowHeader = ({ taskCount, collapsed, onToggle, colSpan }) => (
  <tr>
    <td
      colSpan={colSpan}
      className="p-0 border-t border-slate-100"
      style={{ borderLeft: "4px solid #94a3b8" }}
    >
      <div
        onClick={() => taskCount > 0 && onToggle("__unassigned__")}
        className={`flex items-center gap-2 px-3 py-2 select-none transition-colors bg-slate-50/60
          ${taskCount > 0 ? "cursor-pointer hover:bg-slate-100" : "cursor-default"}`}
      >
        <span className="text-slate-400 w-4 flex-shrink-0 flex items-center justify-center">
          {taskCount > 0 ? (
            collapsed
              ? <ChevronRight className="w-3.5 h-3.5" />
              : <ChevronDown  className="w-3.5 h-3.5" />
          ) : null}
        </span>
        <span className="text-xs font-semibold text-slate-500 px-2 py-0.5 rounded bg-slate-200">
          No Story
        </span>
        <span className="text-sm font-medium text-slate-500">Tasks without a story</span>
        <div className="flex-1" />
        <span className="text-xs text-slate-400">{taskCount} task{taskCount !== 1 ? "s" : ""}</span>
      </div>
    </td>
  </tr>
);

export default UnassignedRowHeader;