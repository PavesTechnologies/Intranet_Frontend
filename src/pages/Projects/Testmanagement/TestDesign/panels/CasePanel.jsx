import React from "react";
import { Edit, Trash2 } from "lucide-react"; // <-- Import icons

export default function CasePanel({ caseItem, onEdit, onDelete }) { // <-- Accept new props
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <div>
          <div className="text-sm text-slate-500 flex items-center gap-3 mb-1">
            <span>Test Case</span>
            {/* ACTION BUTTONS */}
            <div className="flex items-center gap-1">
              <button 
                onClick={() => onEdit && onEdit(caseItem)}
                className="p-1 hover:bg-blue-50 hover:text-blue-600 rounded text-gray-400 transition-colors"
                title="Edit Case"
              >
                <Edit size={14} />
              </button>
              <button 
                onClick={() => onDelete && onDelete(caseItem)}
                className="p-1 hover:bg-red-50 hover:text-red-600 rounded text-gray-400 transition-colors"
                title="Delete Case"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          <h3 className="font-semibold text-slate-800">{caseItem.title}</h3>
          <div className="text-xs text-slate-400 mt-1">Priority: {caseItem.priority ?? "Medium"}</div>
        </div>

        <div className="text-sm text-slate-500">{(caseItem.steps || []).length} steps</div>
      </div>

      <div className="bg-slate-50 p-3 rounded">
        {(caseItem.steps || []).length === 0 ? (
          <div className="text-slate-400 text-sm">No steps added.</div>
        ) : (
          <div className="space-y-2">
            {caseItem.steps.map((st, idx) => (
              <div key={st.id ?? idx} className="grid grid-cols-12 gap-2 items-start p-2 rounded hover:bg-white">
                <div className="col-span-1 text-xs text-slate-400 text-center">{idx + 1}</div>
                <div className="col-span-5 text-sm text-slate-700">{st.action}</div>
                <div className="col-span-6 text-sm text-slate-600">{st.expected}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}