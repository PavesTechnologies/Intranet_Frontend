/**
 * Split-aware amount resolution for the approver's own view of a report.
 *
 * ApprovalQueueItemResponse.pendingLineItems is LEVEL-WIDE (every line item pending review at the
 * caller's current active level instance, shared by every approver on that level), while
 * pendingSplits is scoped to the caller's OWN split-owner assignment(s) only
 * (ApprovalWorkflowServiceImpl.toQueueItem / PendingSplitResponse javadoc). Neither field alone
 * tells the frontend "is this specific line item actually mine to approve" — this module derives
 * that from the data already returned by /xms/approvals/my-queue, with no extra API calls.
 *
 * The one open question the API doesn't answer directly: is the caller ALSO the level's
 * normal-track approver (as opposed to purely a split-owner)? The backend's own documented case is
 * that a Cost Center Owner who owns the report's header cost center gets a redundant normal-track
 * entry there too (ApprovalWorkflowServiceImpl/ChainCorrectnessService). We use exactly that signal:
 * if one of the caller's own split cost centers matches the report's header cost center name, they
 * are also the normal-track approver for every non-split line at that level. A caller with no
 * splits at all (e.g. the Reporting Manager) is always a normal-track approver — this preserves
 * Level 1 behavior exactly.
 */

/** Groups PendingSplitResponse[] by lineItemId. */
export function groupSplitsByLineItem(pendingSplits) {
  const map = new Map();
  (pendingSplits || []).forEach((s) => {
    const list = map.get(s.lineItemId) || [];
    list.push(s);
    map.set(s.lineItemId, list);
  });
  return map;
}

export function isNormalTrackApprover(pendingSplits, headerCostCenterName) {
  if (!pendingSplits || pendingSplits.length === 0) return true;
  if (!headerCostCenterName) return false;
  return pendingSplits.some((s) => s.costCenterName === headerCostCenterName);
}

/**
 * One line item's amount/actionability from THIS caller's point of view.
 * Returns null when the line item isn't this caller's responsibility at all (a split-only Cost
 * Center Owner has no standing over a different, unrelated normal-track line item).
 */
function resolveLine(line, splitsForLine, iAmNormalTrackApprover) {
  if (splitsForLine && splitsForLine.length > 0) {
    const myAmount = splitsForLine.reduce((sum, s) => sum + (Number(s.allocatedAmount) || 0), 0);
    return {
      lineItemId: line.lineItemId,
      isSplit: true,
      myAmount,
      lineAmount: Number(line.amount) || 0,
      currencyCode: line.currencyCode,
      mySplits: splitsForLine, // [{ splitId, reviewId, costCenterName, allocatedAmount, ... }]
      source: line,
    };
  }
  if (!iAmNormalTrackApprover) return null;
  return {
    lineItemId: line.lineItemId,
    isSplit: false,
    myAmount: Number(line.amount) || 0,
    lineAmount: Number(line.amount) || 0,
    currencyCode: line.currencyCode,
    reviewId: line.reviewId,
    source: line,
  };
}

/**
 * Main entry point. `lines` can be ApprovalQueueItemResponse.pendingLineItems (pending-only) or any
 * fuller line-item list keyed the same way (e.g. ExpenseReviewPanel's full line-item fetch) —
 * whichever the caller already has in hand; this never issues its own API call.
 */
export function resolveApproverRelevantLines(lines, pendingSplits, headerCostCenterName) {
  const splitsByLineItem = groupSplitsByLineItem(pendingSplits);
  const iAmNormalTrackApprover = isNormalTrackApprover(pendingSplits, headerCostCenterName);

  const relevantLines = (lines || [])
    .map((line) => resolveLine(line, splitsByLineItem.get(line.lineItemId), iAmNormalTrackApprover))
    .filter(Boolean);

  const relevantTotal = relevantLines.reduce((sum, l) => sum + l.myAmount, 0);
  const splitCount = relevantLines.filter((l) => l.isSplit).length;

  return { relevantLines, relevantTotal, splitCount, iAmNormalTrackApprover };
}

/** Convenience wrapper directly over one ApprovalQueueItemResponse item. */
export function resolveQueueItem(item) {
  return resolveApproverRelevantLines(item?.pendingLineItems, item?.pendingSplits, item?.costCenterName);
}
