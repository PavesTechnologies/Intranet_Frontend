import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { AlertTriangle } from "lucide-react";
import Modal from "../../../../components/ui/Modal";
import Button from "../../../../components/Button/Button";
import FilterListbox from "../../../../components/filter/FilterListbox";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { getClosureSummary, closeCampaign } from "../services/campaignservice";

const unwrap = (res) => (res && res.data !== undefined ? res.data : res);

const CLOSURE_REASONS = [
  { value: "", label: "Select a reason" },
  { value: "POSITION_FILLED", label: "Position Filled" },
  { value: "BUDGET_FREEZE", label: "Budget Freeze" },
  { value: "ROLE_CANCELLED", label: "Role Cancelled" },
  { value: "INTAKE_COMPLETE", label: "Intake Complete" },
  { value: "OTHER", label: "Other" },
];

// E03-S03 — Close a Campaign Manually (HR_ADMIN only). Terminal — cannot be undone.
export default function CloseCampaignModal({ isOpen, onClose, campaignId, onClosed }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setSummary(null);
    setReason("");
    (async () => {
      try {
        const res = await getClosureSummary(campaignId);
        setSummary(unwrap(res));
      } catch {
        toast.error("Failed to load closure impact summary.");
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, campaignId]);

  const handleConfirm = async () => {
    if (!reason) return toast.error("Please select a closure reason.");
    setSubmitting(true);
    try {
      await closeCampaign(campaignId, reason);
      toast.success("Campaign closed successfully.");
      onClosed();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.response?.data?.detail || "Failed to close campaign.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Close Campaign" width="480px">
      {loading ? (
        <div className="py-8 flex justify-center"><LoadingSpinner text="Loading closure impact summary..." /></div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-[12.5px]">
            <div className="p-3 rounded-xl bg-slate-50">
              <div className="text-slate-400 text-[11px]">Candidates</div>
              <div className="font-bold text-slate-900">{summary?.candidate_count ?? 0}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50">
              <div className="text-slate-400 text-[11px]">In-progress tasks</div>
              <div className="font-bold text-slate-900">{summary?.in_progress_task_count ?? 0}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50">
              <div className="text-slate-400 text-[11px]">Pending human decision</div>
              <div className="font-bold text-slate-900">{summary?.pending_human_decision_count ?? 0}</div>
            </div>
          </div>

          {summary?.in_progress_bulk_job_count > 0 && (
            <p className="text-[11px] text-slate-400">
              {summary.in_progress_bulk_job_count} bulk upload job(s) still processing will be cancelled.
            </p>
          )}

          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
              Closure Reason <span className="text-red-500">*</span>
            </label>
            <FilterListbox options={CLOSURE_REASONS} value={reason} onChange={setReason} />
          </div>

          <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100">
            <AlertTriangle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
            <p className="text-[11.5px] text-rose-700">
              {summary?.warning || "Closing will stop new uploads, cancel queued processing tasks, and permanently conclude this campaign. This cannot be undone."}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="small" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="danger" size="small" onClick={handleConfirm} loading={submitting} loadingText="Closing...">
              Close Campaign
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
