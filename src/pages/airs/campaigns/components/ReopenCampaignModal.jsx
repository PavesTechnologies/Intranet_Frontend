import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import Modal from "../../../../components/ui/Modal";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { getReopenReadiness, reopenCampaign, formatApiError } from "../services/campaignservice";

const unwrap = (res) => (res && res.data !== undefined ? res.data : res);

// Reopen a Closed Campaign (HR_ADMIN only). Blocks on JD/skill
// readiness issues rather than letting the confirm button call the endpoint
// blind — is_ready=false disables the confirm action entirely.
export default function ReopenCampaignModal({ isOpen, onClose, campaignId, onReopened }) {
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setReadiness(null);
    (async () => {
      try {
        const res = await getReopenReadiness(campaignId);
        setReadiness(unwrap(res));
      } catch {
        toast.error("Failed to load reopen readiness check.");
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, campaignId]);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await reopenCampaign(campaignId);
      toast.success("Campaign reopened successfully.");
      onReopened();
    } catch (err) {
      toast.error(formatApiError(err, "Failed to reopen campaign."));
    } finally {
      setSubmitting(false);
    }
  };

  const isReady = readiness?.is_ready ?? false;
  const issues = readiness?.issues || [];

  return (<Modal isOpen={isOpen} onClose={onClose} title="Reopen Campaign" width="480px">
      {loading ? (<div className="py-8 flex justify-center"><LoadingSpinner text="Checking reopen readiness..." /></div>
      ) : (<div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-[12.5px]">
            <div className="p-3 rounded-xl bg-slate-50">
              <div className="text-slate-400 text-[11px]">JD</div>
              <div className="font-bold text-slate-900 truncate">{readiness?.jd_title || "—"}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50">
              <div className="text-slate-400 text-[11px]">Candidates so far</div>
              <div className="font-bold text-slate-900">{readiness?.candidate_count ?? 0}</div>
            </div>
          </div>

          {isReady ? (<div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <p className="text-[11.5px] text-emerald-700">
                This campaign is ready to reopen. Status will be restored to ACTIVE
                {readiness?.deadline ? "" : ", and there is no deadline to clear"}.
              </p>
            </div>
          ) : (<div className="space-y-2">
              <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100">
                <AlertTriangle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
                <p className="text-[11.5px] text-rose-700 font-semibold">
                  This campaign isn't ready to reopen yet:
                </p>
              </div>
              <ul className="space-y-1.5 pl-1">
                {issues.map((issue, idx) => (<li key={idx} className="text-[11.5px] text-slate-600 flex gap-2">
                    <span className="text-rose-500">•</span> {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="small" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="small"
              onClick={handleConfirm}
              loading={submitting}
              loadingText="Reopening..."
              disabled={!isReady}
            >
              Reopen Campaign
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
