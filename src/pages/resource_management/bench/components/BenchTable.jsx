import React, { useState } from "react";
import { AlertTriangle, Eye, Edit2, Check, X } from "lucide-react";
import FilterListbox from "../../../../components/filter/FilterListbox";
import { CATEGORY_OPTIONS } from "../constants/benchConstants";
import { getAgingTone } from "../models/benchModel";
import { updateStatusResource } from "../services/benchService";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { toast } from "react-toastify";
import GenericTable from "../../../../components/Table/table";

const BENCH_STATES = [
  "READY",
  "SHADOW",
  "NOT_AVAILABLE",
  "LOW_UTILIZATION",
  "TRAINING"
];

const POOL_STATES = [
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
  loading,
  activeTab = "bench",
}) => {
  const [editingRow, setEditingRow] = useState(null);
  const [editStatus, setEditStatus] = useState("");
  const [editReason, setEditReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleEditClick = (row, event) => {
    event.stopPropagation();
    setEditingRow(row);
    const upperCategory = row.category?.toUpperCase()?.replace(/ /g, "_");
    
    // Choose the initial state or a default depending on tab
    const validStates = activeTab === "bench" ? BENCH_STATES : POOL_STATES;
    setEditStatus(validStates.includes(upperCategory) ? upperCategory : validStates[0]);
    setEditReason("");
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditStatus("");
    setEditReason("");
  };

  const handleSaveStatus = async () => {
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
        resourceId: editingRow.id,
        newSubState: editStatus,
        reason: editReason
        // If stateType is needed, it can be passed here or handled on backend
      });
      toast.success("Status updated successfully");
      setEditingRow(null);

      onRefresh?.();
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setIsSaving(false);
    }
  };

  const allSelected = rows.length > 0 && rows.every((row) => selectedRows.includes(row.id));
  const anySelected = rows.some((row) => selectedRows.includes(row.id));
  
  const validStates = activeTab === "bench" ? BENCH_STATES : POOL_STATES;

  return (
    <>
      <div className="overflow-x-auto no-scrollbar">
        <GenericTable
          headers={["Consultant Details", "Core Expertise", "Status", "Availability", "Aging", "Daily Exposure", "Actions"]}
          columns={["consultant_info", "expertise_info", "status_info", "availability_info", "aging_info", "cost_info", "actions"]}
          rows={rows.map((row) => {
            const agingTone = getAgingTone(row.agingDays);
            const isEditing = editingRow?.id === row.id;

            return {
              ...row,
              rowClass: activeRowId === row.id ? "bg-indigo-50/50" : "",
              onRowClick: () => onView(row),
              consultant_info: (
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold text-slate-900 leading-tight tracking-tight">{row.name}</span>
                  <span className="text-[11px] font-medium text-slate-400 leading-normal">{row.role}</span>
                </div>
              ),
              expertise_info: (
                <div className={`flex flex-col gap-1 ${isEditing ? "opacity-50 pointer-events-none" : ""}`}>
                  {row.topSkills.length === 0 ? (
                    <span className="text-[10px] text-slate-300 italic">No expertise logged</span>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-1">
                        {row.topSkills.slice(0, 3).map((skill) => (
                          <span
                            key={`${row.id}-${skill.name}`}
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${skill.stale
                              ? "bg-amber-50 text-amber-700 border-amber-100"
                              : "bg-slate-50 text-slate-600 border-slate-100"
                              }`}
                          >
                            {skill.name}
                          </span>
                        ))}
                      </div>
                      {(row.topSkills.length > 3 || row.skills?.length > 5) && (
                        <div className="flex flex-wrap gap-1">
                          {row.topSkills.slice(3, 5).map((skill) => (
                            <span
                              key={`${row.id}-${skill.name}`}
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${skill.stale
                                ? "bg-amber-50 text-amber-700 border-amber-100"
                                : "bg-slate-50 text-slate-600 border-slate-100"
                                }`}
                            >
                              {skill.name}
                            </span>
                          ))}
                          {row.skills?.length > 5 && (
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border bg-indigo-50 text-indigo-600 border-indigo-100 cursor-help"
                              title={row.skills.slice(5).join(", ")}
                            >
                              +{row.skills.length - 5}
                            </span>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  {(row.warnings.missingSkills || row.missingSkills.length > 0) && (
                    <div className="mt-1.5 flex gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <AlertTriangle className="h-3 w-3 text-rose-500 mt-0.5" />
                      <span className="text-[9px] font-bold text-rose-600 capitalize">Skill Gaps Detected</span>
                    </div>
                  )}
                </div>
              ),
              status_info: (
                <div onClick={(e) => e.stopPropagation()}>
                  {isEditing ? (
                    <div className="flex flex-col gap-2 min-w-[150px] py-1">
                      <div className="relative">
                        <FilterListbox
                          options={validStates.map((status) => ({
                            value: status,
                            label: status.replace("_", " ").toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
                          }))}
                          value={editStatus}
                          onChange={setEditStatus}
                        />
                      </div>
                      <input
                        type="text"
                        value={editReason}
                        onChange={(e) => setEditReason(e.target.value)}
                        placeholder="Reason..."
                        disabled={isSaving}
                        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[11px] font-medium text-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 transition-all"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[10px] font-black text-slate-600 capitalize">
                          {row.category?.replace("_", " ").toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ),
              availability_info: (
                <div className="flex flex-col items-center gap-1">
                  <span className={`text-[13px] font-bold ${row.availability < 50 ? 'text-rose-600' : 'text-slate-900'}`}>
                    {row.availability}%
                  </span>
                  <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${row.availability >= 75 ? 'bg-emerald-500' : row.availability >= 25 ? 'bg-amber-500' : 'bg-rose-500'}`}
                      style={{ width: `${row.availability}%` }}
                    />
                  </div>
                </div>
              ),
              aging_info: (
                <div className={isEditing ? "opacity-50 pointer-events-none" : ""}>
                  {renderPill(agingTone.label, `${agingTone.className} !px-2.5 !py-1 text-[10px] capitalize whitespace-nowrap`)}
                </div>
              ),
              cost_info: (
                <div className="flex flex-col text-right">
                  <span className={`text-[12px] font-bold ${row.warnings.highCost ? "text-rose-700" : "text-slate-900"}`}>
                    {row.costPerDay === null ? "—" : `₹${row.costPerDay.toLocaleString()}`}
                  </span>
                </div>
              ),
              actions: (
                <div className="flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
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
                </div>
              )
            };
          })}
          loading={loading}
        />
      </div>

      {editingRow && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-[13px] font-bold text-slate-800 uppercase tracking-widest">Update Substate</h3>
              <button 
                onClick={handleCancelEdit}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Consultant</p>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-sm font-bold text-slate-900 leading-tight">{editingRow.name}</p>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">Current state: <span className="font-bold text-slate-700">{editingRow.category?.replace(/_/g, " ")}</span></p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">New Target State</label>
                <div className="relative">
                  <FilterListbox
                    options={[{value:"",label:"Select a substate"},...validStates.map((status) => ({ value: status, label: status.replace("_", " ").toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') }))]}
                    value={editStatus}
                    onChange={setEditStatus}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Justification</label>
                <textarea
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Provide context for this change..."
                  disabled={isSaving}
                  className="h-20 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-[13px] font-medium text-slate-600 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
              <button
                type="button"
                className="px-4 py-2 rounded-xl text-[12px] font-bold text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
                onClick={handleCancelEdit}
                disabled={isSaving}
              >
                CANCEL
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-indigo-600 text-[12px] font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
                onClick={handleSaveStatus}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-1 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    SAVING...
                  </>
                ) : (
                  <>APPLY STRATEGY</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BenchTable;
