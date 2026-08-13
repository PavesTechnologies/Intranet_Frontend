import React, { useState } from "react";
import { toast } from "react-toastify";
import ReasonModal from "./ReasonModal";
import { bulkMoveStage, moveCandidateStage, rejectCandidate } from "../services/candidateActionsService";

const STAGES = [
  "SCREENING", "SHORTLISTED", "HM_REVIEW", "INTERVIEW", "SELECTED", "HOLD", "REJECTED", "FRAUD_REVIEW",
];

const label = (s) => (s || "").replace(/_/g, " ");

/**
 * M11-E04-S03 — one modal instance for every stage action on the candidate
 * list, driven by the `action` object the list sets.
 *
 * Deliberately not one modal per row: with a page of candidates that would
 * mount dozens of dialogs, and the reason text would be tied to whichever
 * row happened to render it.
 */
export default function CandidateActionModals({ action, campaignId, selectedIds, onClose, onDone }) {
  const [targetStage, setTargetStage] = useState("");

  if (!action) return null;

  const fail = (err, fallback) => toast.error(err?.response?.data?.message || fallback);

  // ── single move (T01) ──────────────────────────────────────────────
  if (action.kind === "move") {
    const c = action.candidate;
    const current = (c.stage || "").toUpperCase();
    return (
      <ReasonModal
        isOpen
        onClose={() => { setTargetStage(""); onClose(); }}
        title={`Move ${c.name}`}
        description={`Currently in ${label(current)}. The move must be a legal transition from that stage.`}
        confirmLabel="Move candidate"
        extraContent={
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Move to <span className="text-red-500">*</span>
            </label>
            <select value={targetStage} onChange={(e) => setTargetStage(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs">
              <option value="">Select a stage…</option>
              {STAGES.filter((s) => s !== current).map((s) => (
                <option key={s} value={s}>{label(s)}</option>
              ))}
            </select>
          </div>
        }
        onConfirm={async (reason) => {
          if (!targetStage) {
            toast.error("Pick the stage to move this candidate to.");
            return;
          }
          try {
            await moveCandidateStage(campaignId, c.id, targetStage, reason);
            toast.success(`${c.name} moved to ${label(targetStage)}.`);
            setTargetStage("");
            onDone();
          } catch (err) {
            fail(err, "Could not move this candidate.");
          }
        }}
      />
    );
  }

  // ── manual reject (T03) ────────────────────────────────────────────
  if (action.kind === "reject") {
    const c = action.candidate;
    return (
      <ReasonModal
        isOpen
        onClose={onClose}
        title={`Reject ${c.name}`}
        description="The reason is stored on the candidate's decision record and shown in the rejection history."
        confirmLabel="Reject candidate"
        variant="danger"
        placeholder="Why is this candidate being rejected?"
        onConfirm={async (reason) => {
          try {
            await rejectCandidate(campaignId, c.id, reason);
            toast.success(`${c.name} rejected.`);
            onDone();
          } catch (err) {
            fail(err, "Could not reject this candidate.");
          }
        }}
      />
    );
  }

  // ── bulk move (T02) ────────────────────────────────────────────────
  if (action.kind === "bulk") {
    const count = selectedIds.size;
    return (
      <ReasonModal
        isOpen
        onClose={onClose}
        title={`Move ${count} candidate${count === 1 ? "" : "s"} to ${label(action.targetStage)}`}
        description={
          "One shared reason is recorded against the batch. If the selection spans more than " +
          "one stage the whole move is refused rather than partially applied."
        }
        confirmLabel={`Move ${count}`}
        onConfirm={async (reason) => {
          try {
            const res = await bulkMoveStage(campaignId, [...selectedIds], action.targetStage, reason);
            const skipped = res?.skipped?.length || 0;
            toast.success(
              `${res?.moved_count ?? count} moved to ${label(action.targetStage)}` +
              (skipped ? ` · ${skipped} skipped` : "")
            );
            onDone();
          } catch (err) {
            fail(err, "Could not move the selected candidates.");
          }
        }}
      />
    );
  }

  return null;
}
