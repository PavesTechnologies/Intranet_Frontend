import React, { useState } from "react";
import { X, Plus } from "lucide-react";

// Reusable editable-tag component for skill aliases — used both inside the
// Add/Edit Skill form (purely local array edits) and the Skill Detail page's
// Alias Management section (backed by addAlias/removeAlias API calls).
export default function AliasEditor({ aliases, onAdd, onRemove, conflictChecker, disabled }) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(null);

  const handleAdd = () => {
    const value = draft.trim();
    if (!value) return;

    if (aliases.some((a) => a.trim().toLowerCase() === value.toLowerCase())) {
      setError("This alias is already added to this skill.");
      return;
    }

    if (conflictChecker) {
      const conflict = conflictChecker(value);
      if (conflict) {
        setError(
          conflict.reason === "canonical"
            ? `"${value}" is already the canonical name of "${conflict.skill.canonicalName}".`
            : `"${value}" is already an alias of "${conflict.skill.canonicalName}".`
        );
        return;
      }
    }

    setError(null);
    onAdd(value);
    setDraft("");
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {aliases.map((alias) => (
          <span
            key={alias}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700"
          >
            {alias}
            {!disabled && (
              <button onClick={() => onRemove(alias)} className="hover:text-blue-900">
                <X size={11} />
              </button>
            )}
          </span>
        ))}
        {aliases.length === 0 && <span className="text-[11px] text-slate-400">No aliases yet.</span>}
      </div>

      {!disabled && (
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder="Add an alias..."
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 outline-none text-[12.5px] focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAdd}
            className="px-3 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
            title="Add alias"
          >
            <Plus size={14} />
          </button>
        </div>
      )}

      {error && <p className="text-[11px] text-rose-600 mt-1.5">{error}</p>}
    </div>
  );
}
