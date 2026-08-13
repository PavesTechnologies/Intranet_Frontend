import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { getCampaignBoard, moveCampaignCandidateStage, formatApiError } from "../../campaigns/services/campaignservice";
import { initialsFromName } from "../../candidates/utils/candidateDataUtils";
import { PIPELINE_STAGES } from "../constants/pipelineConstants";

// PipelineTransitionReasonRequiredException surfaces as this exact
// combination — see pipeline_transition_service.py / campaign_candidate_service.py
// move_pipeline_stage: CampaignException(str(exc), 400) where the message is
// "Transition from {from} to {to} requires a reason to be provided.".
// Checked defensively (status + message), never assumed from stage names —
// the frontend has no copy of allowed_transitions to predict this itself.
function isReasonRequiredError(err) {
  const status = err?.response?.status;
  const message = err?.response?.data?.message;
  return status === 400 && typeof message === "string" && message.toLowerCase().includes("requires a reason");
}

function mapCandidate(cc) {
  return {
    id: cc.id ?? cc.campaign_candidate_id,
    candidateId: cc.candidate_id,
    name: cc.candidate_name,
    initials: initialsFromName(cc.candidate_name),
    role: cc.current_designation,
    composite: cc.composite_score,
    stage: cc.pipeline_stage,
  };
}

export default function usePipelineBoard(campaignId) {
  const [columnsByStage, setColumnsByStage] = useState({});
  const [otherCount, setOtherCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // The whole card, not just its id — StageReasonModal shows the
  // candidate's name, and the stage-move call only needs `id`.
  const dragCard = useRef(null);
  // { card, toStage } — set only when the backend has rejected the move
  // asking for a reason; drives StageReasonModal.
  const [pendingReason, setPendingReason] = useState(null);

  const load = useCallback(async () => {
    if (!campaignId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getCampaignBoard(campaignId);
      const data = res?.data ?? res;
      const byStage = {};
      (data?.columns || []).forEach((col) => {
        byStage[col.stage] = (col.candidates || []).map(mapCandidate);
      });
      setColumnsByStage(byStage);
      setOtherCount(data?.other_count || 0);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  const columns = PIPELINE_STAGES.map((stage) => ({ stage, cards: columnsByStage[stage] || [] }));

  const startDrag = (card) => {
    dragCard.current = card;
  };

  // Never mutates local board state before the API call resolves — on
  // success the board is refetched from source; on failure nothing was
  // ever moved locally, so there's nothing to "restore".
  const performMove = async (card, toStage, reason) => {
    try {
      await moveCampaignCandidateStage(card.id, toStage, reason);
      toast.success(`${card.name || "Candidate"} moved.`);
      await load();
    } catch (err) {
      if (isReasonRequiredError(err) && !reason) {
        setPendingReason({ card, toStage });
        return;
      }
      toast.error(formatApiError(err, "Failed to move this candidate. It stays in its current column."));
    }
  };

  const dropOnStage = (toStage) => {
    const card = dragCard.current;
    dragCard.current = null;
    if (!card || card.stage === toStage) return;
    performMove(card, toStage, undefined);
  };

  const confirmPendingReason = async (reason) => {
    if (!pendingReason) return;
    const { card, toStage } = pendingReason;
    setPendingReason(null);
    await performMove(card, toStage, reason);
  };

  const cancelPendingReason = () => setPendingReason(null);

  return {
    columns,
    otherCount,
    loading,
    error,
    refresh: load,
    startDrag,
    dropOnStage,
    pendingReason,
    confirmPendingReason,
    cancelPendingReason,
  };
}
