import React from "react";
import { Eye, Pencil, Send } from "lucide-react";

const baseActionClassName =
  "inline-flex h-9 items-center gap-2 rounded-full border px-3 text-[11px] font-semibold tracking-[0.16em] uppercase transition-all";

const HoverActions = ({ onView, onEdit, onAllocate }) => {
  return (
    <div className="pointer-events-none absolute right-4 top-1/2 z-10 flex -translate-y-1/2 translate-x-2 items-center gap-2 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100">
      <button
        type="button"
        onClick={onView}
        className={`${baseActionClassName} border-slate-700 bg-slate-900/95 text-slate-100 hover:border-slate-500 hover:shadow-[0_0_16px_rgba(71,85,105,0.35)]`}
      >
        <Eye className="h-3.5 w-3.5" />
        View
      </button>
      <button
        type="button"
        onClick={onEdit}
        className={`${baseActionClassName} border-indigo-500/30 bg-indigo-500/12 text-indigo-100 hover:shadow-[0_0_18px_rgba(99,102,241,0.3)]`}
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </button>
      <button
        type="button"
        onClick={onAllocate}
        className={`${baseActionClassName} border-teal-500/30 bg-teal-500/12 text-teal-100 hover:shadow-[0_0_18px_rgba(20,184,166,0.3)]`}
      >
        <Send className="h-3.5 w-3.5" />
        Allocate
      </button>
    </div>
  );
};

export default HoverActions;
