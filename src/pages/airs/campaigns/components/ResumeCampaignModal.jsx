import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { PlayCircle } from "lucide-react";
import Modal from "../../../../components/ui/Modal";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { getResumeSummary, resumeCampaign } from "../services/campaignservice";

const unwrap = (res) => (res && res.data !== undefined ? res.data : res);

// E03-S02 — Resume a Paused Campaign (HR_ADMIN only).
export default function ResumeCampaignModal({ isOpen, onClose, campaignId, onResumed }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setSummary(null);
    (async () => {
      try {
        const res = await getResumeSummary(campaignId);
        setSummary(unwrap(res));
      } catch {
        toast.error("Failed to load resume summary.");
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, campaignId]);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await resumeCampaign(campaignId);
      toast.success("Campaign resumed successfully.");
      onResumed();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.response?.data?.detail || "Failed to resume campaign.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Resume Campaign" width="460px">
      {loading ? (
        <div className="py-8 flex justify-center"><LoadingSpinner text="Loading resume summary..." /></div>
      ) : (
        <div className="space-y-4">
          <p className="text-[12.5px] text-slate-500">
            Resuming will re-queue all suspended tasks and re-enable resume uploads for this campaign.
          </p>

          <div className="grid grid-cols-2 gap-3 text-[12.5px]">
            <div className="p-3 rounded-xl bg-slate-50">
              <div className="text-slate-400 text-[11px]">Paused tasks to re-queue</div>
              <div className="font-bold text-slate-900">{summary?.paused_task_count ?? 0}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50">
              <div className="text-slate-400 text-[11px]">Pending resume parses</div>
              <div className="font-bold text-slate-900">{summary?.pending_resume_count ?? 0}</div>
            </div>
          </div>

          {summary?.estimated_processing_seconds != null && (
            <p className="text-[11px] text-slate-400">
              Estimated processing time: ~{Math.ceil(summary.estimated_processing_seconds / 60)} min
            </p>
          )}

          <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
            <PlayCircle className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
            <p className="text-[11.5px] text-emerald-700">
              {summary?.warning || "Confirming will re-queue all suspended tasks and re-enable uploads."}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="small" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" size="small" onClick={handleConfirm} loading={submitting} loadingText="Resuming...">
              Resume Campaign
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
