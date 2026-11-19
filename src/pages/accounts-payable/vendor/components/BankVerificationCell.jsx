import { useState } from "react";
import clsx from "clsx";
import { toast } from "react-toastify";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Button from "../../../../components/Button/Button";
import { getApiErrorMessage } from "../../utils/apiError";
import { validateDocumentFile } from "../../utils/documentUpload";
import bankVerificationService from "../services/bankVerificationService";

export const BANK_VERIFICATION_KEY = (vendorId) => ["accountsPayable", "bankVerification", Number(vendorId)];

/** bank_id -> verification state for one vendor (GET /vendor-bank-verification/vendor/{id}). */
export function useBankVerifications(vendorId) {
  return useQuery({
    queryKey: BANK_VERIFICATION_KEY(vendorId),
    queryFn: () => bankVerificationService.forVendor(vendorId),
    enabled: Boolean(vendorId),
    retry: false,
  });
}

export function verificationLabel(v) {
  if (!v || v.status === "UNVERIFIED") return { text: "Not verified", tone: "bg-slate-100 text-slate-600" };
  if (v.status === "FAILED") return { text: "Check failed", tone: "bg-rose-50 text-rose-700" };
  if (v.status === "NAME_MISMATCH") return { text: "Name mismatch", tone: "bg-amber-50 text-amber-700" };
  if (v.approval_status === "APPROVED") return { text: "Approved for payment", tone: "bg-emerald-50 text-emerald-700" };
  if (v.approval_status === "REJECTED") return { text: "Rejected", tone: "bg-rose-50 text-rose-700" };
  return { text: "Verified · awaiting approval", tone: "bg-indigo-50 text-indigo-700" };
}

/**
 * One bank account's verification: state badge, and for Finance the next step - check with the bank
 * (penny-drop), or upload a cancelled cheque / bank letter, then a second person approves.
 */
export default function BankVerificationCell({ vendorId, bankId, verification, canVerify }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState(null); // document | reject
  const [file, setFile] = useState(null);
  const [remarks, setRemarks] = useState("");
  const refresh = () => queryClient.invalidateQueries({ queryKey: BANK_VERIFICATION_KEY(vendorId) });
  const act = useMutation({ mutationFn: (fn) => fn(), onSuccess: refresh });
  const label = verificationLabel(verification);

  const run = async (fn, ok) => {
    try {
      const result = await act.mutateAsync(fn);
      toast[result?.status === "VERIFIED" || result?.approval_status === "APPROVED" ? "success" : "info"](
        result?.message && result.status !== "VERIFIED" ? result.message : ok);
      setMode(null);
      setRemarks("");
      setFile(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not update the bank verification."));
    }
  };

  const v = verification || {};
  const canApprove = v.status === "VERIFIED" && v.approval_status !== "APPROVED";
  return (
    <div className="flex min-w-[14rem] flex-col items-start gap-1.5">
      <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium", label.tone)} title={v.message || undefined}>{label.text}</span>
      {v.name_at_bank && <span className="text-[11px] text-slate-500">At bank: {v.name_at_bank}{v.name_match_score != null ? ` (${Number(v.name_match_score)}%)` : ""}</span>}
      {canVerify && !mode && (
        <span className="flex flex-wrap gap-1">
          {v.approval_status !== "APPROVED" && (
            <>
              <Button size="small" variant="outline" loading={act.isPending}
                onClick={() => run(() => bankVerificationService.pennyDrop(vendorId, bankId), "Account verified with the bank.")}>
                Check with bank
              </Button>
              <Button size="small" variant="ghost" onClick={() => setMode("document")}>Upload cheque / letter</Button>
            </>
          )}
          {canApprove && (
            <>
              <Button size="small" variant="primary" loading={act.isPending}
                onClick={() => run(() => bankVerificationService.approve(vendorId, bankId, null), "Approved - this account can now be paid.")}>
                Approve
              </Button>
              <Button size="small" variant="ghost" onClick={() => setMode("reject")}>Reject</Button>
            </>
          )}
        </span>
      )}
      {mode === "document" && (
        <span className="flex flex-col gap-1.5">
          <input type="file" accept=".pdf,.png,.jpg,.jpeg" aria-label="Cancelled cheque or bank letter" className="text-xs"
            onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <input aria-label="What you checked" className="h-8 w-64 rounded-md border border-slate-300 px-2 text-xs"
            placeholder="e.g. Cancelled cheque matches account & IFSC" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          <span className="flex gap-1">
            <Button size="small" variant="primary" disabled={!file || remarks.trim().length < 5} loading={act.isPending}
              onClick={() => {
                const problem = validateDocumentFile(file);
                if (problem) return toast.error(problem);
                return run(() => bankVerificationService.document(vendorId, bankId, file, remarks), "Verified from the document.");
              }}>
              Save
            </Button>
            <Button size="small" variant="ghost" onClick={() => setMode(null)}>Cancel</Button>
          </span>
        </span>
      )}
      {mode === "reject" && (
        <span className="flex flex-wrap items-center gap-1">
          <input aria-label="Reason for rejecting" className="h-8 w-56 rounded-md border border-slate-300 px-2 text-xs" placeholder="Why (min 5 chars)"
            value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          <Button size="small" variant="primary" disabled={remarks.trim().length < 5} loading={act.isPending}
            onClick={() => run(() => bankVerificationService.reject(vendorId, bankId, remarks), "Account rejected.")}>Reject</Button>
          <Button size="small" variant="ghost" onClick={() => setMode(null)}>Cancel</Button>
        </span>
      )}
    </div>
  );
}
