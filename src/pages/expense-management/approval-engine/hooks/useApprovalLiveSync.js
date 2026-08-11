import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApprovalWebSocket } from "../websocket/ApprovalWebSocketProvider";
import { APPROVAL_STATUS_KEY, LINE_ITEM_REVIEWS_KEY } from "./useApprovalWorkflow";

/**
 * Wires ApprovalWebSocketProvider's push events onto the TanStack Query cache - this is what makes
 * "live" actually mean something rather than just "a socket is open." Safe to call from more than
 * one component at once (e.g. the queue page and a report detail page both mounted): each call is
 * an independent subscription, cleaned up on unmount.
 *
 * 'report-update' -> pushed to the report owner (submit/recall/cancel/review/reject/level-activated) -
 *   invalidates that one report's status + line-item-review caches, and the history list (a
 *   reject/approve outcome may have just landed there).
 * 'queue-update' -> pushed to every currently-ACTIVE assignment's approver - invalidates the queue
 *   list broadly, since which reports/levels are queued just changed for this caller.
 */
export function useApprovalLiveSync() {
  const ws = useApprovalWebSocket();
  const qc = useQueryClient();

  useEffect(() => {
    if (!ws) return;

    const unsubscribeReport = ws.subscribe("report-update", (event) => {
      if (event?.reportId) {
        qc.invalidateQueries({ queryKey: APPROVAL_STATUS_KEY(event.reportId) });
        qc.invalidateQueries({ queryKey: LINE_ITEM_REVIEWS_KEY(event.reportId) });
      }
      qc.invalidateQueries({ queryKey: ["approvalMyHistory"] });
    });

    const unsubscribeQueue = ws.subscribe("queue-update", () => {
      qc.invalidateQueries({ queryKey: ["approvalMyQueue"] });
    });

    return () => {
      unsubscribeReport();
      unsubscribeQueue();
    };
  }, [ws, qc]);
}
