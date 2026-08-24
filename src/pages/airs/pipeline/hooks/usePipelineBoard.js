import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { getCampaignBoard, moveCampaignCandidateStage, formatApiError } from "../../campaigns/services/campaignservice";
import { initialsFromName } from "../../candidates/utils/candidateDataUtils";
import { PIPELINE_STAGES } from "../constants/pipelineConstants";
import useAirsSocket from "../../websockets/useAirsSocket";
import { dispatchAirsEvent } from "../../websockets/airsEventDispatch";

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

  // Live updates after the initial REST load — patches only the affected
  // candidate/column, never a full board reload, so an in-flight drag isn't
  // stomped by someone else's event arriving mid-gesture.
  useAirsSocket(campaignId ? `/ws/campaign-candidates/campaign/${campaignId}/board` : null, {
    onOpen: load, // reconnect only: reconcile any missed events
    onEvent: (message) =>
      dispatchAirsEvent(message, {
        "board.candidate_added": (data) => {
          const stage = data?.stage || data?.candidate?.pipeline_stage;
          if (!stage || !data?.candidate) return;
          const card = mapCandidate(data.candidate);
          setColumnsByStage((prev) => {
            const existing = prev[stage] || [];
            if (existing.some((c) => c.id === card.id)) return prev;
            return { ...prev, [stage]: [...existing, card] };
          });
        },
        "board.stage_changed": (data) => {
          const id = data?.id ?? data?.campaign_candidate_id ?? data?.candidate?.id ?? data?.candidate?.campaign_candidate_id;
          const toStage = data?.to_stage ?? data?.stage ?? data?.candidate?.pipeline_stage;
          if (id == null || !toStage) return;
          setColumnsByStage((prev) => {
            let movedCard = null;
            const next = {};
            Object.entries(prev).forEach(([stage, cards]) => {
              next[stage] = cards.filter((c) => {
                if (c.id === id) {
                  movedCard = data.candidate ? mapCandidate(data.candidate) : { ...c, stage: toStage };
                  return false;
                }
                return true;
              });
            });
            if (!movedCard) return prev;
            next[toStage] = [...(next[toStage] || []), movedCard];
            return next;
          });
        },
        "board.candidate_updated": (data) => {
          const candidate = data?.candidate || data;
          const id = candidate?.id ?? candidate?.campaign_candidate_id;
          if (id == null) return;
          const updated = mapCandidate(candidate);
          setColumnsByStage((prev) => {
            const currentStage = Object.keys(prev).find((stage) => (prev[stage] || []).some((c) => c.id === id));
            if (!currentStage) return prev;
            if (updated.stage && updated.stage !== currentStage) {
              const next = { ...prev };
              next[currentStage] = prev[currentStage].filter((c) => c.id !== id);
              next[updated.stage] = [...(prev[updated.stage] || []), updated];
              return next;
            }
            return {
              ...prev,
              [currentStage]: prev[currentStage].map((c) => (c.id === id ? updated : c)),
            };
          });
        },
        "board.candidate_removed": (data) => {
          const id = data?.id ?? data?.campaign_candidate_id;
          if (id == null) return;
          setColumnsByStage((prev) => {
            const next = {};
            Object.entries(prev).forEach(([stage, cards]) => {
              next[stage] = cards.filter((c) => c.id !== id);
            });
            return next;
          });
        },
      }),
  });

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
