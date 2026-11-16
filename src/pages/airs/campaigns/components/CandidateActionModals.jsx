import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import ReasonModal from "./ReasonModal";
import {
  bulkMoveStage,
  getAllowedTransitions,
  moveCandidateStage,
  rejectCandidate,
} from "../services/candidateActionsService";

const label = (s) => (s || "").replace(/_/g, " ");

// The Move dialog asks the state machine what this candidate can actually do
// next (GET .../allowed-transitions) instead of offering every stage that
// exists. Fetched when the dialog opens — the legal set depends on the
// candidate's current stage, so it can't be hoisted to the list.
function MoveCandidateModal({ campaignId, candidate, onClose, onDone }) {
  const [targetStage, setTargetStage] = useState("");
  const [transitions, setTransitions] = useState([]);
  const [currentStage, setCurrentStage] = useState((candidate.stage || "").toUpperCase());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await getAllowedTransitions(campaignId, candidate.id);
      setTransitions(data?.allowed_transitions || []);
      if (data?.current_stage) setCurrentStage(data.current_stage);
    } catch {
      setLoadError(true);
      setTransitions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, candidate.id]);

  const selected = transitions.find((t) => t.to_stage === targetStage) || null;
  // Until a target is picked, follow the stricter rule: most transitions
  // require a justification, and the field shouldn't flip from optional to
  // required as the user makes a selection.
  const reasonRequired = selected ? selected.requires_reason !== false : true;
  const noMoves = !loading && !loadError && transitions.length === 0;

  return (
    <ReasonModal
      isOpen
      onClose={onClose}
      title={`Move ${candidate.name}`}
      description={`Currently in ${label(currentStage)}. Only the moves that are legal from that stage are listed.`}
      confirmLabel="Move candidate"
      reasonRequired={reasonRequired}
      confirmDisabled={loading || loadError || noMoves}
      extraContent={
        <div>
          <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
            Move to <span className="text-red-500">*</span>
          </label>
          <select
            value={targetStage}
            onChange={(e) => setTargetStage(e.target.value)}
            disabled={loading || loadError || noMoves}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">
              {loading ? "Loading available moves…" : noMoves ? "No moves available" : "Select a stage…"}
            </option>
            {transitions.map((t) => (
              <option key={t.to_stage} value={t.to_stage}>
                {label(t.to_stage)}
              </option>
            ))}
          </select>

          {/* The endpoint's own explanation of what the selected move does. */}
          {selected?.notes && <p className="text-[11px] text-slate-500 mt-1.5">{selected.notes}</p>}

          {noMoves && (
            <p className="text-[11px] text-slate-500 mt-1.5">
              There are no moves available from {label(currentStage)}.
            </p>
          )}

          {loadError && (
            <p className="text-[11px] text-rose-600 mt-1.5">
              Couldn't load the available moves.{" "}
              <button type="button" onClick={load} className="font-semibold underline">
                Try again
              </button>
            </p>
          )}
        </div>
      }
      onConfirm={async (reason) => {
        if (!targetStage) {
          toast.error("Pick the stage to move this candidate to.");
          return;
        }
        try {
          await moveCandidateStage(campaignId, candidate.id, targetStage, reason);
          toast.success(`${candidate.name} moved to ${label(targetStage)}.`);
          onDone();
        } catch (err) {
          toast.error(err?.response?.data?.message || "Could not move this candidate.");
        }
      }}
    />
  );
}

// One modal instance for every stage action, driven by the `action` the list
// sets. Not one per row: a page of candidates would mount dozens of dialogs and
// tie the reason text to whichever row rendered it.
export default function CandidateActionModals({ action, campaignId, selectedIds, onClose, onDone }) {
  if (!action) return null;

  const fail = (err, fallback) => toast.error(err?.response?.data?.message || fallback);

  // ── single move ──────────────────────────────────────────────
  if (action.kind === "move") {
    return (
      <MoveCandidateModal
        campaignId={campaignId}
        candidate={action.candidate}
        onClose={onClose}
        onDone={onDone}
      />
    );
  }

  // ── manual reject ────────────────────────────────────────────
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

  // ── bulk move ────────────────────────────────────────────────
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
