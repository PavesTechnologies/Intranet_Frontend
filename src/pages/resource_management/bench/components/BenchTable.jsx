import React, { useState } from "react";
import { AlertTriangle, Eye, Edit2, Check, X } from "lucide-react";
import { CATEGORY_OPTIONS } from "../constants/benchConstants";
import { getAgingTone } from "../models/benchModel";
import { updateStatusResource } from "../services/benchService";
import { toast } from "react-hot-toast";

const SUB_STATES = [
  "READY",
  "TRAINING",
  "SHADOW",
  "NOT_AVAILABLE",
  "LOW_UTILIZATION",
  "COE",
  "RND",
  "TRAINING_POOL"
];

const categoryStyles = {
  Ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
  // READY: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Training: "border-blue-200 bg-blue-50 text-blue-700",
  // TRAINING: "border-blue-200 bg-blue-50 text-blue-700",
  Shadow: "border-violet-200 bg-violet-50 text-violet-700",
  // SHADOW: "border-violet-200 bg-violet-50 text-violet-700",
  Not_Available: "border-slate-200 bg-slate-100 text-slate-700",
  NOT_AVAILABLE: "border-slate-200 bg-slate-100 text-slate-700",
  LOW_UTILIZATION: "border-amber-200 bg-amber-50 text-amber-700",
  COE: "border-purple-200 bg-purple-50 text-purple-700",
  RND: "border-pink-200 bg-pink-50 text-pink-700",
  TRAINING_POOL: "border-cyan-200 bg-cyan-50 text-cyan-700",
};

const renderPill = (text, className) => (
  <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold ${className}`}>
    {text}
  </span>
);

const BenchTable = ({
  rows,
  selectedRows,
  activeRowId,
  emptyState,
  onToggleAll,
  onToggleRow,
  onView,
  onQuickAllocate,
  onCategoryChange,
  onRefresh,
}) => {
  const [editingRowId, setEditingRowId] = useState(null);
  const [editStatus, setEditStatus] = useState("");
  const [editReason, setEditReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleEditClick = (row, event) => {
    event.stopPropagation();
    setEditingRowId(row.id);
    const upperCategory = row.category?.toUpperCase()?.replace(" ", "_");
    setEditStatus(SUB_STATES.includes(upperCategory) ? upperCategory : "READY");
    setEditReason("");
  };

  const handleCancelEdit = (event) => {
    event.stopPropagation();
    setEditingRowId(null);
    setEditStatus("");
    setEditReason("");
  };

  const handleSaveStatus = async (rowId, event) => {
    event.stopPropagation();
    if (!editStatus) {
      toast.error("Please select a status");
      return;
    }
    if (!editReason.trim()) {
      toast.error("Please provide a reason");
      return;
    }

    try {
      setIsSaving(true);
      await updateStatusResource({
        resourceId: rowId,
        newSubState: editStatus,
        reason: editReason
      });
      toast.success("Status updated successfully");
      setEditingRowId(null);
      
      onRefresh?.();
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setIsSaving(false);
    }
  };

  const allSelected = rows.length > 0 && rows.every((row) => selectedRows.includes(row.id));
  const anySelected = rows.some((row) => selectedRows.includes(row.id));

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr className="bg-slate-50 hover:bg-slate-50 border-b border-slate-100">
              <th className="w-12 px-5 py-4 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(node) => {
                    if (node) node.indeterminate = !allSelected && anySelected;
                  }}
                  onChange={(event) => onToggleAll(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </th>
              <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Consultant Details</th>
              <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Core Expertise</th>
              <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
              <th className="px-4 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Availability</th>
              <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Aging</th>
              <th className="px-4 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Daily Exposure</th>
              <th className="px-5 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-20 text-center text-[13px] font-medium text-slate-400 italic">
                  {emptyState}
                </td>
              </tr>
            ) : null}

            {rows.map((row) => {
              const agingTone = getAgingTone(row.agingDays);

              return (
                <tr
                  key={row.id}
                  onClick={() => !editingRowId ? onView(row) : undefined}
                  className={`group transition-all ${!editingRowId ? "cursor-pointer hover:bg-indigo-50/30" : ""} ${activeRowId === row.id ? "bg-indigo-50/50" : ""} ${editingRowId === row.id ? "bg-blue-50/30" : ""}`}
                >
                  <td className={`px-5 py-4 align-middle ${editingRowId === row.id ? "opacity-50 pointer-events-none" : ""}`} onClick={(event) => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(row.id)}
                      onChange={(event) => onToggleRow(row.id, event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </td>
                  <td className={`px-4 py-4 align-middle ${editingRowId === row.id ? "opacity-50 pointer-events-none" : ""}`}>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-slate-900 leading-tight tracking-tight">{row.name}</span>
                      <span className="text-[11px] font-medium text-slate-400 leading-normal">{row.role}</span>
                    </div>
                  </td>
                  <td className={`px-4 py-4 align-middle min-w-[200px] ${editingRowId === row.id ? "opacity-50 pointer-events-none" : ""}`}>
                    <div className="flex flex-wrap gap-1">
                      {row.topSkills.length === 0 ? (
                        <span className="text-[10px] text-slate-300 italic">No expertise logged</span>
                      ) : (
                        row.topSkills.map((skill) => (
                          <span
                            key={`${row.id}-${skill.name}`}
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${skill.stale
                              ? "bg-amber-50 text-amber-700 border-amber-100"
                              : "bg-slate-50 text-slate-600 border-slate-100"
                              }`}
                          >
                            {skill.name}
                          </span>
                        ))
                      )}
                    </div>
                    {(row.warnings.missingSkills || row.missingSkills.length > 0) && (
                      <div className="mt-1.5 flex gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <AlertTriangle className="h-3 w-3 text-rose-500 mt-0.5" />
                        <span className="text-[9px] font-bold text-rose-600 uppercase">Skill Gaps Detected</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 align-middle" onClick={(event) => event.stopPropagation()}>
                    {editingRowId === row.id ? (
                      <div className="flex flex-col gap-2 min-w-[140px]">
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          disabled={isSaving}
                          className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                        >
                          <option value="" disabled>Select Status</option>
                          {SUB_STATES.map((state) => (
                            <option key={state} value={state}>{state.replace("_", " ")}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={editReason}
                          onChange={(e) => setEditReason(e.target.value)}
                          placeholder="Reason..."
                          disabled={isSaving}
                          className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <div>
                          {renderPill((row.category || "").replace(/_/g, " "), `${categoryStyles[row.category] || "border-slate-200 bg-slate-50 text-slate-600"} !px-2 !py-0.5 text-[9px] uppercase tracking-tighter`)}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className={`px-4 py-4 align-middle text-center ${editingRowId === row.id ? "opacity-50 pointer-events-none" : ""}`}>
                    <div className="flex flex-col items-center gap-1">
                      <span className={`text-[13px] font-bold ${row.allocation < 50 ? 'text-rose-600' : 'text-slate-900'}`}>
                        {row.allocation}%
                      </span>
                      <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${row.allocation >= 75 ? 'bg-emerald-500' : row.allocation >= 25 ? 'bg-amber-500' : 'bg-rose-500'}`}
                          style={{ width: `${row.allocation}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className={`px-4 py-4 align-middle ${editingRowId === row.id ? "opacity-50 pointer-events-none" : ""}`}>
                    {renderPill(agingTone.label, `${agingTone.className} !px-2 !py-0.5 text-[9px] uppercase tracking-tighter`)}
                  </td>
                  <td className={`px-4 py-4 align-middle text-right ${editingRowId === row.id ? "opacity-50 pointer-events-none" : ""}`}>
                    <div className="flex flex-col">
                      <span className={`text-[12px] font-bold ${row.warnings.highCost ? "text-rose-700" : "text-slate-900"}`}>
                        {row.costPerDay === null ? "—" : `₹${row.costPerDay.toLocaleString()}`}
                      </span>
                      {/* {row.warnings.missingCost ? (
                        <span className="text-[9px] font-bold text-amber-600 uppercase">Cost Missing</span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-400">
                          Exp: {row.costExposure === null ? "-" : row.costExposure.toLocaleString()}
                        </span>
                      )} */}
                    </div>
                  </td>
                  <td className="px-5 py-4 align-middle text-center" onClick={(event) => event.stopPropagation()}>
                    <div className="flex justify-center gap-2">
                       {editingRowId === row.id ? (
                          <>
                             <button
                               type="button"
                               onClick={(e) => handleSaveStatus(row.id, e)}
                               disabled={isSaving}
                               title="Save Status"
                               className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-emerald-700 transition-all hover:bg-emerald-50 disabled:opacity-50"
                             >
                                <Check className="h-4 w-4" />
                             </button>
                             <button
                               type="button"
                               onClick={handleCancelEdit}
                               disabled={isSaving}
                               title="Cancel Edit"
                               className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-rose-700 transition-all hover:bg-rose-50 disabled:opacity-50"
                             >
                                <X className="h-4 w-4" />
                             </button>
                          </>
                       ) : (
                          <>
                             <button
                               type="button"
                               onClick={() => onView(row)}
                               title="View Details"
                               className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-indigo-600 transition-all hover:bg-indigo-50 hover:text-indigo-700"
                             >
                               <Eye className="h-4 w-4" />
                             </button>
                             <button
                               type="button"
                               onClick={(e) => handleEditClick(row, e)}
                               title="Edit Status"
                               className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-blue-600 transition-all hover:bg-blue-50 hover:text-blue-700"
                             >
                               <Edit2 className="h-4 w-4" />
                             </button>
                          </>
                       )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BenchTable;
