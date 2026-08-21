import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageCircleWarning, Send } from "lucide-react";
import { showStatusToast } from "@/components/toastfy/toast";
import EmployeeLabel from "@/pages/expense-management/approval-engine/components/EmployeeLabel";
import CommentPromptModal from "@/pages/expense-management/approval-engine/components/CommentPromptModal";
import { formatDateTime } from "@/pages/expense-management/approval-engine/constants/approvalLabels";
import { verificationQueryApi, VERIFICATION_QUERY_STATUS } from "@/pages/expense-management/api/verificationQueryApi";

const unwrapList = (res) => {
  const payload = res.data?.data ?? res.data;
  return Array.isArray(payload) ? payload : payload?.content || [];
};

/**
 * Surfaces Finance queries raised against this report's line items and lets the employee respond.
 * There is no report-scoped query endpoint (GET /xms/finance/verifications returns every query in
 * the system) so this filters client-side against the report's own line item ids.
 */
export default function FinanceQueryPanel({ reportId, lineItems }) {
  const queryClient = useQueryClient();
  const [respondingTo, setRespondingTo] = useState(null);

  const lineItemIds = useMemo(() => new Set((lineItems || []).map((li) => li.lineItemId)), [lineItems]);
  const lineItemLabel = (lineItemId) => {
    const li = (lineItems || []).find((l) => l.lineItemId === lineItemId);
    return li ? li.merchantName || li.categoryName || "Line item" : "Line item";
  };

  const { data: allQueries } = useQuery({
    queryKey: ["financeVerificationQueries"],
    queryFn: () => verificationQueryApi.getAll().then(unwrapList),
    enabled: lineItemIds.size > 0,
    staleTime: 15_000,
  });

  const reportQueries = useMemo(
    () =>
      (allQueries || [])
        .filter((q) => lineItemIds.has(q.lineItemId))
        .sort((a, b) => new Date(b.raisedAt || 0) - new Date(a.raisedAt || 0)),
    [allQueries, lineItemIds]
  );

  const respond = useMutation({
    mutationFn: ({ query, employeeResponse }) =>
      verificationQueryApi.update(query.queryId, {
        lineItemId: query.lineItemId,
        raisedBy: query.raisedBy,
        queryText: query.queryText,
        status: query.status,
        employeeResponse,
      }),
    onSuccess: () => {
      showStatusToast("Response sent to Finance", "success");
      queryClient.invalidateQueries({ queryKey: ["financeVerificationQueries"] });
      setRespondingTo(null);
    },
    onError: (err) => showStatusToast(err.response?.data?.message || "Failed to send response", "error"),
  });

  if (reportQueries.length === 0) return null;

  return (
    <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-blue-900">
        <MessageCircleWarning className="h-4 w-4" />
        Finance {reportQueries.length > 1 ? "queries" : "query"} on this report
      </p>
      <ul className="mt-3 space-y-3">
        {reportQueries.map((q) => {
          const isOpen = q.status === VERIFICATION_QUERY_STATUS.RAISED;
          return (
            <li key={q.queryId} className="rounded-lg border border-blue-100 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-800">{lineItemLabel(q.lineItemId)}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    isOpen ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {isOpen ? "Awaiting your response" : "Resolved"}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-gray-700">{q.queryText}</p>
              <p className="mt-1 text-xs text-gray-400">
                Raised by <EmployeeLabel employeeId={q.raisedBy} className="font-medium text-gray-500" /> · {formatDateTime(q.raisedAt)}
              </p>

              {q.employeeResponse && (
                <div className="mt-2 rounded-md bg-gray-50 border border-gray-200 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Your response</p>
                  <p className="mt-0.5 text-sm text-gray-700">{q.employeeResponse}</p>
                </div>
              )}

              {isOpen && (
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setRespondingTo(q)}
                    className="inline-flex items-center gap-1 rounded-md border border-blue-300 bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                  >
                    <Send className="h-3 w-3" /> {q.employeeResponse ? "Update Response" : "Respond"}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <CommentPromptModal
        key={respondingTo?.queryId || "closed"}
        isOpen={!!respondingTo}
        title="Respond to Finance Query"
        description={respondingTo ? `Query: "${respondingTo.queryText}"` : ""}
        contextLabel={respondingTo ? lineItemLabel(respondingTo.lineItemId) : ""}
        confirmLabel="Send Response"
        initialValue={respondingTo?.employeeResponse || ""}
        isLoading={respond.isPending}
        onCancel={() => setRespondingTo(null)}
        onConfirm={(text) => respond.mutate({ query: respondingTo, employeeResponse: text })}
      />
    </div>
  );
}
