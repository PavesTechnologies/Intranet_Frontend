import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Paperclip } from "lucide-react";
import { showStatusToast } from "@/components/toastfy/toast";
import LateReceiptPanel from "@/pages/expense-management/components/expense-reports/LateReceiptPanel";
import {
  LATE_RECEIPT_REPORT_STATUSES,
  expenseReportService,
  lineItemService,
} from "@/pages/expense-management/api/expenseReportsApi";

const STATUS_LABEL = {
  APPROVED: "Approved",
  REIMBURSED: "Reimbursed",
  CLOSED: "Closed",
};

// The report list comes back either as an array or as an object holding the rows under one of these keys.
const reportRows = (res) => {
  const payload = res?.data?.data;
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    return payload.reports || payload.expenseReports || payload.content || payload.data || [];
  }
  return [];
};

const lineRows = (res) => {
  const payload = res?.data?.data;
  return Array.isArray(payload) ? payload : payload?.lineItems || payload?.content || payload?.data || [];
};

/**
 * Outdated expense: attach a receipt found after a report was settled. The employee picks one of their settled
 * reports (approved, reimbursed or closed), then uses the same late-receipt panel as the report page. The attach rules
 * (status, date, reason, duplicate check) are enforced by the backend, not here.
 */
export default function OutdatedExpensePage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [lineItems, setLineItems] = useState([]);
  const [loadingLines, setLoadingLines] = useState(false);

  const settled = useMemo(
    () => reports.filter((r) => LATE_RECEIPT_REPORT_STATUSES.includes((r.reportStatus || "").toUpperCase())),
    [reports],
  );
  const selected = settled.find((r) => r.reportId === selectedId) || null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await expenseReportService.getAll({ limit: 1000, page: 1 });
        if (!cancelled) setReports(reportRows(res));
      } catch (err) {
        if (!cancelled) setLoadError(err?.response?.data?.message || "Could not load your expense reports.");
      } finally {
        if (!cancelled) setLoadingReports(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setLineItems([]);
      return undefined;
    }
    let cancelled = false;
    setLoadingLines(true);
    lineItemService
      .getAll(selectedId)
      .then((res) => {
        if (!cancelled) setLineItems(lineRows(res));
      })
      .catch((err) => {
        if (!cancelled) {
          setLineItems([]);
          showStatusToast(err?.response?.data?.message || "Could not load the expenses of this report.", "error");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingLines(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-indigo-50 p-2.5 text-[#0A0082]">
            <Paperclip size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0a174e]">Outdated expense</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Attach a receipt you found after a report was settled. Choose the report, then add the receipt to its expense.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        {loadingReports ? (
          <p className="text-sm text-gray-500">Loading your settled reports…</p>
        ) : loadError ? (
          <p className="text-sm text-red-600" role="alert">{loadError}</p>
        ) : settled.length === 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-700">No settled expense reports yet.</p>
            <p className="text-xs text-gray-500">
              A receipt can be attached only to a report that is approved, reimbursed or closed.
            </p>
            <button
              type="button"
              className="text-sm font-medium text-blue-700 hover:underline"
              onClick={() => navigate("/expense-management/expenses/my")}
            >
              Go to my expense reports
            </button>
          </div>
        ) : (
          <>
            <label htmlFor="outdated-report" className="block text-sm font-medium text-gray-700">
              Settled expense report
            </label>
            <select
              id="outdated-report"
              name="settledReport"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select a report</option>
              {settled.map((r) => (
                <option key={r.reportId} value={r.reportId}>
                  {r.reportNumber || "Report"} · {r.title || "Untitled"} · {STATUS_LABEL[(r.reportStatus || "").toUpperCase()] || r.reportStatus}
                </option>
              ))}
            </select>

            {selected && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                <span className="font-semibold">{selected.reportNumber}</span> · {selected.title || "Untitled"} ·{" "}
                {STATUS_LABEL[(selected.reportStatus || "").toUpperCase()] || selected.reportStatus}
              </div>
            )}

            {selected && loadingLines && <p className="text-sm text-gray-500">Loading expenses…</p>}

            {selected && !loadingLines && lineItems.length === 0 && (
              <p className="text-sm text-gray-500">This report has no expenses to attach a receipt to.</p>
            )}

            {selected && !loadingLines && lineItems.length > 0 && (
              <LateReceiptPanel
                reportId={selected.reportId}
                reportStatus={(selected.reportStatus || "").toUpperCase()}
                lineItems={lineItems}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
