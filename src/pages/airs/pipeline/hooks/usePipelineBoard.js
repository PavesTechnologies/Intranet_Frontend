import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { getCampaignBoard, formatApiError } from "../../campaigns/services/campaignservice";
import { getAllowedTransitions, moveCandidateStage } from "../../campaigns/services/candidateActionsService";
import { initialsFromName } from "../../candidates/utils/candidateDataUtils";
import { PIPELINE_STAGES, PIPELINE_STAGE_LABEL } from "../constants/pipelineConstants";
import useAirsSocket from "../../websockets/useAirsSocket";
import { dispatchAirsEvent } from "../../websockets/airsEventDispatch";
import { safeError } from "@/pages/airs/utils/logError";

// PipelineTransitionReasonRequiredException surfaces as a 422 whose message
// starts with "REASON_REQUIRED:" (pipeline_transition_exceptions.py).
// Checked defensively (status + message), never assumed from stage names —
// the frontend has no copy of allowed_transitions to predict this itself.
// (A move against the system's outcome is a different 422 -
// OVERRIDE_REASON_REQUIRED - which moveCandidateStage's reason-code picker handles.)
function isReasonRequiredError(err) {
  const status = err?.response?.status;
  const message = err?.response?.data?.message;
  return status === 422 && typeof message === "string" && message.startsWith("REASON_REQUIRED");
}

// Stage-move error bodies may carry the specifics under error.detail —
// { success, message, error: { code, detail } } — with detail either a
// string (404 CANDIDATE_NOT_FOUND, 409 INVALID_STAGE_TRANSITION) or a list
// of { field, message } (422 VALIDATION_ERROR). Falls back to the top-level
// message, then formatApiError, for anything that doesn't match that shape.
function formatStageMoveError(err) {
  const data = err?.response?.data;
  const detail = data?.error?.detail;
  if (typeof detail === "string" && detail) return detail;
  if (Array.isArray(detail) && detail.length) {
    return detail
      .map((d) => (d?.field ? `${d.field}: ${d.message || "Invalid value"}` : d?.message || "Invalid value"))
      .join(" · ");
  }
  return formatApiError(err, "Failed to move this candidate. It stays in its current column.");
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
    // Drive the card's "what happens next" indicator (see PipelineCandidateCard).
    parseStatus: cc.parse_status,
    requirementsScore: cc.deterministic_score,
    relevanceScore: cc.semantic_score,
    aiScore: cc.ai_ats_score,
    awaitingFullScoring: !!cc.awaiting_full_scoring,
  };
}

// canMove: the caller's role may move candidates at all (useCampaignPermissions).
export default function usePipelineBoard(campaignId, { canMove = false } = {}) {
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
  // While a card is dragged: { cardId, fromStage, allowed: Set of stages | null while
  // loading or if it couldn't be loaded }. The moves this candidate can make for the
  // caller's role, from .../allowed-transitions - the same rules the move endpoint checks.
  const [dragTargets, setDragTargets] = useState(null);

  // silent=true skips the loading spinner — used when a WS event tells us
  // to reconcile from REST in the background (e.g. another user's action),
  // as opposed to the page's own first load.
  const load = useCallback(async (silent = false) => {
    if (!campaignId) {
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
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
      if (!silent) setError(err);
      else console.warn("Silent board reconciliation failed; keeping last known state.", safeError(err));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  // Live updates after the initial REST load — patches only the affected
  // candidate/column, never a full board reload, so an in-flight drag isn't
  // stomped by someone else's event arriving mid-gesture.
  // Per app/websocket/events.py, every board event is an id-level signal —
  // { campaign_id, campaign_candidate_id, candidate_id, pipeline_stage } for
  // added/stage_changed, or just { campaign_id, campaign_candidate_id } for
  // updated/removed. None embed the REST board's full candidate object, so
  // "added" and "updated" can't be patched locally (no name/role/score to
  // show) and fall back to a silent REST reconcile; "stage_changed" and
  // "removed" carry enough (an id, and for stage_changed the new stage) to
  // patch the already-held card in place without a refetch.
  useAirsSocket(campaignId ? `/ws/campaign-candidates/campaign/${campaignId}/board` : null, {
    onOpen: load, // reconnect only: reconcile any missed events
    onEvent: (message) =>
      dispatchAirsEvent(message, {
        "board.candidate_added": () => {
          load(true);
        },
        "board.stage_changed": (data) => {
          const id = data?.campaign_candidate_id;
          const toStage = data?.pipeline_stage;
          if (!id || !toStage) return;
          let foundLocally = false;
          setColumnsByStage((prev) => {
            let movedCard = null;
            const next = {};
            Object.entries(prev).forEach(([stage, cards]) => {
              next[stage] = cards.filter((c) => {
                if (c.id === id) {
                  movedCard = { ...c, stage: toStage };
                  return false;
                }
                return true;
              });
            });
            if (!movedCard) return prev;
            foundLocally = true;
            next[toStage] = [...(next[toStage] || []), movedCard];
            return next;
          });
          // Card wasn't in our local state (e.g. a missed candidate_added) —
          // reconcile via REST instead of silently dropping the move.
          if (!foundLocally) load(true);
        },
        "board.candidate_updated": () => {
          load(true);
        },
        "board.candidate_removed": (data) => {
          const id = data?.campaign_candidate_id;
          if (!id) return;
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
    if (!canMove) return;
    dragCard.current = card;
    setDragTargets({ cardId: card.id, fromStage: card.stage, allowed: null });
    getAllowedTransitions(campaignId, card.id)
      .then((data) => {
        const allowed = new Set((data?.allowed_transitions || []).map((t) => t.to_stage));
        setDragTargets((prev) => (prev?.cardId === card.id ? { ...prev, allowed } : prev));
      })
      // Unknown: every column stays open and the server decides, as before.
      .catch(() => {});
  };

  const endDrag = () => setDragTargets(null);

  // false only when the allowed moves are known and this column isn't one of them.
  const canDropOn = (stage) =>
    !dragTargets || !dragTargets.allowed || stage === dragTargets.fromStage || dragTargets.allowed.has(stage);

  // Why a column is closed to the dragged card, in words.
  const blockedReason = (stage) => {
    if (canDropOn(stage)) return null;
    const from = PIPELINE_STAGE_LABEL[dragTargets.fromStage] || dragTargets.fromStage;
    const options = [...dragTargets.allowed].map((s) => PIPELINE_STAGE_LABEL[s] || s);
    return options.length
      ? `Not a move your role can make from ${from}. You can move this candidate to: ${options.join(", ")}.`
      : `Your role can't move this candidate from ${from}.`;
  };

  // Never mutates local board state before the API call resolves — on
  // success the board is refetched from source; on failure nothing was
  // ever moved locally, so there's nothing to "restore".
  const performMove = async (card, toStage, reason) => {
    try {
      // The same endpoint as the Move dialog, so a move against the system's
      // screening outcome asks for a reason code first.
      const res = await moveCandidateStage(campaignId, card.id, toStage, reason);
      toast.success(res?.detail || `${card.name || "Candidate"} moved.`);
      await load();
    } catch (err) {
      if (err?.cancelled) {
        toast.info(err.message);
        return;
      }
      if (isReasonRequiredError(err) && !reason) {
        setPendingReason({ card, toStage });
        return;
      }
      toast.error(formatStageMoveError(err));
    }
  };

  const dropOnStage = (toStage) => {
    const card = dragCard.current;
    dragCard.current = null;
    const reason = blockedReason(toStage);
    setDragTargets(null);
    if (!card || card.stage === toStage) return;
    if (reason) {
      toast.info(reason);
      return;
    }
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
    endDrag,
    dropOnStage,
    canMove,
    canDropOn,
    blockedReason,
    pendingReason,
    confirmPendingReason,
    cancelPendingReason,
  };
}
