import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Eye, MessageSquareWarning, XCircle } from "lucide-react";
import Button from "@/components/Button/Button";
import Modal from "@/components/Modal/modal";
import { showStatusToast } from "@/components/toastfy/toast";
import EmployeeLabel from "./EmployeeLabel";
import RowActionButton, { RowActions } from "./RowActionButton";
import { formatMoney } from "../constants/approvalLabels";
import {
  SUPP_STATUS,
  SUPP_STATUS_LABEL,
  errorMessage,
  financeClaimService,
  managerClaimService,
  unwrapList,
} from "@/pages/expense-management/api/supplementaryClaimApi";

const MIN_REASON = 5;

/** Says why a review queue could not load. A 403 names the missing permission, so the cause is clear to the user. */
function queueFailureMessage({ err, role }) {
  const status = err?.response?.status;
  if (status === 401) return "Your session has expired. Please log in again.";
  if (status === 403) {
    return role === "finance"
      ? "Supplementary claims waiting for Finance can't be shown: your account does not have the Finance Executive role for them. Ask your administrator."
      : "Supplementary claims waiting for your review can't be shown: your account does not have manager review access for them. Ask your administrator.";
  }
  return errorMessage(err, `Could not load supplementary claims waiting for ${role === "finance" ? "Finance" : "your review"}.`);
}

/**
 * Supplementary claims waiting for this approver, shown in the same table as expense reports and cash advances.
 * Managers see claims waiting for the manager; Finance sees claims waiting for Finance. The backend decides which
 * claims each user may act on, and every action here calls the same endpoint as the claim's own review screen.
 */
export default function SupplementaryApprovalsList({
  activeTab = "pending",
  searchTerm = "",
  isManager = false,
  isFinance = false,
  onRowCount,
  windowStart = 0,
  windowEnd,
}) {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [pending, setPending] = useState(null); // { claim, decision: "reject" | "clarify" }
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  // Only the pending tab has claims to act on; the approved and rejected tabs have no supplementary history here.
  useEffect(() => {
    if (activeTab !== "pending" || (!isManager && !isFinance)) {
      setRows([]);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    // A failed queue is reported, not shown as an empty list: a missing permission would otherwise look like "nothing to do".
    const failures = [];
    const track = (request, role) =>
      request.then(unwrapList).catch((err) => {
        failures.push({ err, role });
        return [];
      });
    const requests = [];
    if (isManager) requests.push(track(managerClaimService.queue(), "manager"));
    if (isFinance) requests.push(track(financeClaimService.queue(), "finance"));
    Promise.all(requests).then((lists) => {
      if (cancelled) return;
      const merged = lists.flat();
      // A claim can appear in both queues only if one person is both; keep one row per claim.
      const unique = [...new Map(merged.map((c) => [c.claimId, c])).values()];
      setRows(unique);
      setLoadError(failures.length ? queueFailureMessage(failures[0]) : "");
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [activeTab, isManager, isFinance, refreshKey]);

  const matches = (c) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return [c.claimNumber, c.employeeId, c.reportNumber].some((v) => String(v || "").toLowerCase().includes(q));
  };
  const filtered = rows.filter(matches);

  useEffect(() => {
    if (!loading && onRowCount) onRowCount(filtered.length);
  }, [loading, filtered.length, onRowCount]);

  const visible = windowEnd === undefined ? filtered : filtered.slice(windowStart, windowEnd);

  const reviewFor = (claim) =>
    claim.status === SUPP_STATUS.PENDING_FINANCE
      ? financeClaimService
      : managerClaimService;

  const approve = async (claim) => {
    setBusy(true);
    try {
      await reviewFor(claim).approve(claim.claimId);
      showStatusToast(`Approved ${claim.claimNumber}.`, "success");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      showStatusToast(errorMessage(err, "Could not approve this claim."), "error");
    } finally {
      setBusy(false);
    }
  };

  const submitReason = async () => {
    if (!pending) return;
    if (reason.trim().length < MIN_REASON) {
      showStatusToast(`Give a reason (at least ${MIN_REASON} characters).`, "error");
      return;
    }
    setBusy(true);
    try {
      const service = reviewFor(pending.claim);
      if (pending.decision === "reject") await service.reject(pending.claim.claimId, reason.trim());
      else await service.clarify(pending.claim.claimId, reason.trim());
      showStatusToast(pending.decision === "reject" ? "Claim rejected." : "Clarification requested.", "success");
      setPending(null);
      setReason("");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      showStatusToast(errorMessage(err, "Could not record the decision."), "error");
    } finally {
      setBusy(false);
    }
  };

  const openClaim = (claim) => {
    const base = claim.status === SUPP_STATUS.PENDING_FINANCE
      ? "/expense-management/finance/supplementary-claims"
      : "/expense-management/manager/supplementary-claims";
    navigate(`${base}/${claim.claimId}`);
  };

  if (activeTab !== "pending" || loading) return null;

  return (
    <>
      <tbody className="divide-y divide-gray-100">
        {loadError && (
          <tr>
            <td colSpan={9} role="alert" className="bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {loadError}
            </td>
          </tr>
        )}
        {visible.map((c) => (
          <tr key={c.claimId} className="transition hover:bg-gray-50/80">
            <td className="px-2.5 py-1.5 text-left">
              <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-800">
                Supplementary
              </span>
            </td>
            <td className="px-2.5 py-1.5 text-left text-xs font-medium text-gray-900 whitespace-nowrap">
              <EmployeeLabel employeeId={c.employeeId} />
            </td>
            <td className="px-2.5 py-1.5 text-left max-w-[220px]">
              <p className="font-semibold text-gray-900 truncate text-xs">{c.reportNumber ? `For ${c.reportNumber}` : "Supplementary claim"}</p>
              <p className="text-[11px] text-gray-500 truncate mt-0.5">{c.lateReasonText || c.creationReason || "Missed expenses"}</p>
            </td>
            <td className="px-2.5 py-1.5 text-left text-xs text-gray-600 truncate">—</td>
            <td className="px-2.5 py-1.5 text-left whitespace-nowrap">
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
                {SUPP_STATUS_LABEL[c.status] || c.status}
              </span>
            </td>
            <td className="px-2.5 py-1.5 text-right font-semibold text-gray-900 whitespace-nowrap text-xs">
              {formatMoney(c.totalAmount, c.currencyCode)}
            </td>
            <td className="px-2.5 py-1.5 text-right text-xs text-gray-300" title="Shown for cash advances only">—</td>
            <td className="px-2.5 py-1.5 text-right text-xs text-gray-300" title="Shown for cash advances only">—</td>
            <td className="px-2.5 py-1.5 text-right whitespace-nowrap">
              <RowActions>
                <RowActionButton tone="view" icon={Eye} label={`View ${c.claimNumber}`} title="View claim" onClick={() => openClaim(c)} />
                <RowActionButton tone="approve" icon={CheckCircle2} label={`Approve ${c.claimNumber}`} title="Approve" disabled={busy} onClick={() => approve(c)} />
                <RowActionButton tone="clarify" icon={MessageSquareWarning} label={`Ask for clarification on ${c.claimNumber}`} title="Ask for clarification"
                  disabled={busy} onClick={() => setPending({ claim: c, decision: "clarify" })} />
                <RowActionButton tone="reject" icon={XCircle} label={`Reject ${c.claimNumber}`} title="Reject" disabled={busy}
                  onClick={() => setPending({ claim: c, decision: "reject" })} />
              </RowActions>
            </td>
          </tr>
        ))}
      </tbody>

      <Modal
        isOpen={!!pending}
        onClose={() => !busy && setPending(null)}
        title={pending?.decision === "reject" ? "Reject supplementary claim" : "Ask for clarification"}
        subtitle={pending ? `${pending.claim.claimNumber} · ${pending.claim.employeeId}` : ""}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPending(null)} disabled={busy}>Cancel</Button>
            <Button variant={pending?.decision === "reject" ? "danger" : "primary"} onClick={submitReason} loading={busy}>
              {pending?.decision === "reject" ? "Reject claim" : "Send request"}
            </Button>
          </div>
        }
      >
        <textarea
          rows={4}
          maxLength={2000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Give the reason (at least 5 characters)"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </Modal>
    </>
  );
}
