import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { PauseCircle } from "lucide-react";
import Modal from "../../../../components/ui/Modal";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { getPauseSummary, pauseCampaign } from "../services/campaignservice";

const unwrap = (res) => (res && res.data !== undefined ? res.data : res);

// E03-S01 — Pause an Active Campaign (HR_ADMIN only).
export default function PauseCampaignModal({ isOpen, onClose, campaignId, onPaused }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setSummary(null);
    (async () => {
      try {
        const res = await getPauseSummary(campaignId);
        setSummary(unwrap(res));
      } catch {
        toast.error("Failed to load pause impact summary.");
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, campaignId]);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await pauseCampaign(campaignId);
      toast.success("Campaign paused successfully.");
      onPaused();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.response?.data?.detail || "Failed to pause campaign.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pause Campaign" width="460px">
      {loading ? (
        <div className="py-8 flex justify-center"><LoadingSpinner text="Loading impact summary..." /></div>
      ) : (
        <div className="space-y-4">
          <p className="text-[12.5px] text-slate-500">
            Pausing will stop new resume uploads and suspend automated pipeline progression until resumed.
          </p>

          <div className="grid grid-cols-3 gap-3 text-[12.5px]">
            <div className="p-3 rounded-xl bg-slate-50">
              <div className="text-slate-400 text-[11px]">Candidates</div>
              <div className="font-bold text-slate-900">{summary?.candidate_count ?? 0}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50">
              <div className="text-slate-400 text-[11px]">Queued tasks</div>
              <div className="font-bold text-slate-900">{summary?.queued_task_count ?? 0}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50">
              <div className="text-slate-400 text-[11px]">Processing bulk jobs</div>
              <div className="font-bold text-slate-900">{summary?.processing_bulk_job_count ?? 0}</div>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100">
            <PauseCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-[11.5px] text-amber-700">
              {summary?.warning || "Pausing will stop new uploads, halt queued processing tasks, and suspend automated pipeline progression."}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="small" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="secondary" size="small" onClick={handleConfirm} loading={submitting} loadingText="Pausing...">
              Pause Campaign
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
