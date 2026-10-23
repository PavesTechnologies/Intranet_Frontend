import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { AlertTriangle, FileText, ArrowRight, User } from "lucide-react";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import {
  getCampaignUploadDecisions,
  getBulkUploadDecisions,
  decideUpload,
  decisionErrorMessage,
} from "../services/uploadDecisionService";
import { formatResumeDate } from "../utils/resumeIntakeUtils";

const formatDay = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

// Pending upload decisions for one campaign (campaignId) or one bulk upload
// job (jobId). Each row lets the uploader / HR_ADMIN keep the existing resume
// or use the new file as the candidate's new resume version. Shared by the
// bulk job modal and the campaign page.
export default function UploadDecisionsList({ campaignId, jobId, onDecided }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [decidingId, setDecidingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = jobId
        ? await getBulkUploadDecisions(jobId)
        : await getCampaignUploadDecisions(campaignId, "PENDING");
      const list = Array.isArray(data?.items) ? data.items : [];
      setItems(list.filter((d) => String(d.status || "").toUpperCase() === "PENDING"));
      setLoadError("");
    } catch (err) {
      setLoadError(decisionErrorMessage(err, "Couldn't load the uploads that need a decision."));
    } finally {
      setLoading(false);
    }
  }, [campaignId, jobId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const handleDecide = async (decision, choice) => {
    setDecidingId(decision.id);
    try {
      const res = await decideUpload(decision.id, choice);
      toast.success(
        res?.message ||
          (choice === "use_new_version"
            ? "The new file is now the candidate's resume and is queued for processing."
            : "The existing resume was kept."),
      );
      onDecided?.(res);
    } catch (err) {
      toast.error(decisionErrorMessage(err, "Couldn't save this decision. Please try again."));
    } finally {
      setDecidingId(null);
      load();
    }
  };

  if (loading) {
    return (
      <div className="py-8 flex justify-center">
        <LoadingSpinner text="Loading uploads that need a decision..." />
      </div>
    );
  }

  if (loadError) {
    return <p className="text-xs text-rose-600 p-4 border border-rose-200 bg-rose-50 rounded-xl">{loadError}</p>;
  }

  if (items.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 border rounded-xl bg-slate-50 text-xs">
        No uploads need a decision.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <p className="text-[11.5px] text-slate-500">
        These candidates are already in the campaign with a different resume. Keep the existing resume, or use the new
        file as their new resume version (re-scored, stage unchanged). If no one decides, the existing resume is kept.
      </p>
      {items.map((d) => {
        const isDeciding = decidingId === d.id;
        return (
          <div key={d.id} className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <User size={15} className="text-slate-500 shrink-0" />
                <span className="text-[12.5px] font-bold text-slate-900 truncate">{d.candidate_name || "Candidate"}</span>
                {d.candidate_email_masked && (
                  <span className="text-[11.5px] text-slate-500 truncate">{d.candidate_email_masked}</span>
                )}
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <AlertTriangle className="w-3 h-3 mr-1" /> Kept automatically on {formatDay(d.expires_at)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11.5px]">
              <div className="flex items-center gap-1.5 min-w-0 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
                <FileText size={13} className="text-slate-400 shrink-0" />
                <span className="text-slate-500">Existing:</span>
                <span className="font-medium text-slate-800 truncate max-w-[180px]">{d.existing_original_filename || "—"}</span>
                <span className="text-slate-400">({formatResumeDate(d.existing_uploaded_at)})</span>
              </div>
              <ArrowRight size={13} className="text-slate-400 shrink-0" />
              <div className="flex items-center gap-1.5 min-w-0 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
                <FileText size={13} className="text-blue-600 shrink-0" />
                <span className="text-slate-500">New:</span>
                <span className="font-medium text-slate-800 truncate max-w-[180px]">{d.new_original_filename || "—"}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="small"
                disabled={isDeciding}
                onClick={() => handleDecide(d, "keep_existing")}
              >
                Keep existing
              </Button>
              <Button
                type="button"
                variant="primary"
                size="small"
                disabled={isDeciding}
                onClick={() => handleDecide(d, "use_new_version")}
              >
                {isDeciding ? "Saving..." : "Use new version"}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
