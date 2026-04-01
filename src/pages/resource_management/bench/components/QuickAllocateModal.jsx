import React, { useEffect, useState } from "react";
import { X, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { quickAllocate, getOpenDemands, getBenchMatches } from "../services/benchService";

const QuickAllocateModal = ({ open, resource, onClose, onRefresh }) => {
  const [demands, setDemands] = useState([]);
  const [selectedDemandId, setSelectedDemandId] = useState("");
  const [allocationPercentage, setAllocationPercentage] = useState(100);
  const [loadingDemands, setLoadingDemands] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      fetchDemands();
      setSuccess(false);
      setError("");
      setSelectedDemandId("");
      setAllocationPercentage(100);
    }
  }, [open]);

  const fetchDemands = async () => {
    setLoadingDemands(true);
    setError(""); // Clear previous errors
    
    try {
      // Correctly resolve the resource's unique identifier for the matching engine
      const rid = resource.employeeId || resource.resourceId || resource.id;
      if (!rid) {
        setError("Target resource identifier not found.");
        return;
      }

      // 1. Exclusively fetch matched demands for this resource
      const res = await getBenchMatches(rid);
      const matchesList = Array.isArray(res) ? res : (res?.data || []);
      
      if (matchesList.length === 0) {
        setError("No direct skill matches found for this resource.");
        setDemands([]);
        return;
      }

      // Deduplicate and normalize by demandId
      const unique = [];
      const seen = new Set();
      
      matchesList.forEach(d => {
        const id = d.demandId || d.id;
        if (id && !seen.has(id)) {
          seen.add(id);
          unique.push({
            ...d,
            demandId: id,
            displayName: d.demandName || "Unnamed Demand",
            score: d.matchScore || 0,
            projectInfo: d.availability || "Match Recommendation"
          });
        }
      });

      setDemands(unique);
    } catch (err) {
      console.error("Match fetch failed during quick allocate", err);
      setError("Failed to load recommended matches.");
    } finally {
      setLoadingDemands(false);
    }
  };

  const handleAllocate = async () => {
    if (!selectedDemandId) {
      setError("Please select a demand.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await quickAllocate(resource.id, selectedDemandId, allocationPercentage);
      // Backend returns { success: true, ... }
      if (res?.success === true || res?.status === "success") {
        setSuccess(true);
        setTimeout(() => {
          onRefresh();
          onClose();
        }, 2000);
      } else {
        setError(res?.message || "Allocation failed.");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "An error occurred during allocation.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !resource) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] px-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl transition-all">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-[#081534]">Quick Allocate</h3>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Streamlined Staffing</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in zoom-in">
              <div className="mb-4 rounded-full bg-emerald-50 p-4">
                <CheckCircle className="h-12 w-12 text-emerald-500" />
              </div>
              <h4 className="text-xl font-bold text-slate-900">Allocation Successful!</h4>
              <p className="mt-2 text-sm text-slate-500">
                {resource.name} is being allocated to the selected demand.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 scale-100 transition-transform hover:scale-[1.01]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Target Resource</p>
                <div className="mt-2 flex items-center gap-3">
                   <div className="h-10 w-10 rounded-full bg-[#081534] flex items-center justify-center text-white font-bold">
                      {resource.name?.charAt(0)}
                   </div>
                   <div>
                      <p className="font-bold text-slate-900">{resource.name}</p>
                      <p className="text-xs text-slate-500">{resource.role} | {resource.experience} Yrs</p>
                   </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">Select Demand <span className="text-rose-500">*</span></label>
                  {loadingDemands ? (
                    <div className="flex h-11 items-center justify-center rounded-lg border border-dashed border-slate-200">
                      <Loader2 className="h-4 w-4 animate-spin text-slate-300" />
                    </div>
                  ) : (
                    <select
                      value={selectedDemandId}
                      onChange={(e) => setSelectedDemandId(e.target.value)}
                      className="w-full h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50/50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat"
                    >
                      <option value="">Choose a demand...</option>
                      {demands.map(demand => (
                        <option key={demand.demandId} value={demand.demandId}>
                          {demand.displayName} ({demand.projectInfo})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                   <div className="flex justify-between items-center mb-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Allocation Percentage</label>
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{allocationPercentage}%</span>
                   </div>
                   <input
                     type="range"
                     min="1"
                     max="100"
                     step="5"
                     value={allocationPercentage}
                     onChange={(e) => setAllocationPercentage(parseInt(e.target.value))}
                     className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                   />
                   <div className="flex justify-between mt-1 px-0.5">
                      <span className="text-[9px] font-bold text-slate-300">1%</span>
                      <span className="text-[9px] font-bold text-slate-300">100%</span>
                   </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-rose-700">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-xs font-medium">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {!success && (
          <div className="flex items-center justify-end gap-3 border-t border-slate-50 bg-slate-50/50 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 text-sm font-bold text-slate-500 transition-colors hover:text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selectedDemandId || submitting}
              onClick={handleAllocate}
              className="group relative flex h-10 items-center justify-center gap-2 overflow-hidden rounded-lg bg-[#081534] px-6 text-sm font-bold text-white transition-all hover:bg-[#10214f] disabled:opacity-50 disabled:grayscale"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Confirm Quick Allocate</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickAllocateModal;
