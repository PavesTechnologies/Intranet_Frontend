import React, { useState } from "react";
import { AlertTriangle, Check, Layers, MessageSquareWarning } from "lucide-react";
import Button from "@/components/Button/Button";
import CommentPromptModal from "./CommentPromptModal";
import { formatMoney } from "../constants/approvalLabels";

/**
 * One report's approver-relevant line items, resolved by utils/approvalAmounts.js from the queue's
 * own ApprovalQueueItemResponse - full context per line (merchant/date/description/amount/category/
 * violations) so an approver never has to tab-switch to decide. Approve and Needs Correction are
 * per-line (or per-split); whole-report Reject lives one level up (a distinct, more consequential
 * action, not buried in this panel).
 */
export default function LineItemReviewPanel({ reportId, relevantLines, onApproveLine, onFlagLine, isBusy }) {
  const [flaggingLine, setFlaggingLine] = useState(null);

  if (!relevantLines?.length) {
    return <p className="text-sm text-gray-500 px-4 py-3">No line items currently pending your review.</p>;
  }

  return (
    <>
      <div className="divide-y divide-gray-100">
        {relevantLines.map((line) => {
          const info = line.source || {};
          const violations = info.policyViolations || [];
          return (
            <div key={line.lineItemId} className="px-4 py-3 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-gray-900">{info.merchantName || "(no merchant)"}</span>
                  <span className="text-xs text-gray-400">{info.categoryName}</span>
                  <span className="text-xs text-gray-400">{info.expenseDate}</span>
                  {line.isSplit && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                      <Layers className="h-3 w-3" /> Split
                    </span>
                  )}
                </div>
                {info.description && <p className="text-sm text-gray-600 mt-0.5">{info.description}</p>}

                {line.isSplit && (
                  <div className="mt-1.5 space-y-0.5 text-xs">
                    {line.mySplits.map((s) => (
                      <p key={s.splitId} className="font-medium text-indigo-700">
                        {s.costCenterName} — {formatMoney(s.allocatedAmount, line.currencyCode)}{" "}
                        <span className="font-normal text-indigo-400">(your allocation)</span>
                      </p>
                    ))}
                    <p className="text-gray-400">Full expense amount: {formatMoney(line.lineAmount, line.currencyCode)}</p>
                  </div>
                )}

                {violations.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {violations.map((v, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 text-xs text-amber-700">
                        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <span>{v.message}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="font-semibold text-sm text-gray-900 whitespace-nowrap">
                  {formatMoney(line.myAmount, line.currencyCode)}
                </span>
                <Button size="small" variant="success" disabled={isBusy} onClick={() => onApproveLine(line)}>
                  <Check className="h-3.5 w-3.5" /> Approve
                </Button>
                <Button size="small" variant="outline" disabled={isBusy} onClick={() => setFlaggingLine(line)}>
                  <MessageSquareWarning className="h-3.5 w-3.5" /> Needs Correction
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <CommentPromptModal
        isOpen={!!flaggingLine}
        title="Flag for correction"
        description="The employee will see this comment and can fix just this line, without restarting the whole approval."
        confirmLabel="Flag for Correction"
        confirmVariant="danger"
        isLoading={isBusy}
        onCancel={() => setFlaggingLine(null)}
        onConfirm={(comment) => {
          onFlagLine(flaggingLine, comment);
          setFlaggingLine(null);
        }}
      />
    </>
  );
}
