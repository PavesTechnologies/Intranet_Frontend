import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Lock } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/Button/Button";
import { getStageUnlockReasons, unlockStage } from "../../../services/candidateScoreService";

// Email plan phase 4: once a rejection or selection email is sent, the candidate's stage in this campaign is
// locked (no stage moves; re-parse and re-score don't move them). An HR admin can unlock it with a reason
// (audited). While the email is still being sent, the lock shows as pending and can't be unlocked.
export default function StageLockBanner({ candidate, canUnlock, onUnlocked }) {
  const [open, setOpen] = useState(false);
  const [reasons, setReasons] = useState([]);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    getStageUnlockReasons().then(setReasons).catch(() => toast.error("Couldn't load the unlock reasons."));
  }, [open]);

  if (!candidate?.stageLocked) return null;
  const pending = String(candidate.stageLockReason || "").endsWith("_PENDING");

  const handleUnlock = async () => {
    setSaving(true);
    try {
      await unlockStage(candidate.id, reason);
      toast.success("Stage unlocked.");
      setOpen(false);
      onUnlocked?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Couldn't unlock the stage.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-start justify-between gap-3 flex-wrap">
      <div className="flex items-start gap-2 text-[12px] text-amber-900">
        <Lock size={14} className="mt-0.5 shrink-0" />
        <span>{candidate.stageLockMessage || "This candidate's stage is locked."}</span>
      </div>
      {canUnlock && !pending && (
        <Button variant="outline" size="small" onClick={() => { setReason(""); setOpen(true); }}>Unlock…</Button>
      )}
      {open && (
        <Modal isOpen onClose={() => setOpen(false)} title="Unlock the stage?" width="440px">
          <div className="space-y-3">
            <p className="text-[12.5px] text-slate-600">
              The candidate's stage can be moved again. The email already sent can't be sent again. This is recorded
              with the reason you choose.
            </p>
            <label className="text-[12px] font-semibold text-slate-600 block">
              Reason <span className="text-rose-500">*</span>
              <select value={reason} onChange={(e) => setReason(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] bg-white">
                <option value="">Choose a reason…</option>
                {reasons.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
              </select>
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="small" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="primary" size="small" disabled={!reason || saving} onClick={handleUnlock}>
                {saving ? "Unlocking…" : "Unlock"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
