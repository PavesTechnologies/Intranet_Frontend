import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const impactStyles = {
  Low: "border-teal-200 bg-teal-50 text-teal-700",
  Medium: "border-amber-200 bg-amber-50 text-amber-700",
  High: "border-rose-200 bg-rose-50 text-rose-700",
};

const ApprovalDrawer = ({ open, request, mode = "review", onClose, onApprove, onReject }) => {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setReason("");
    setError("");
  }, [request, mode, open]);

  if (!open || !request) return null;

  const requireReason = mode === "reject" || request.impact === "High";

  return (
    <div className="fixed inset-0 z-[130] flex justify-end bg-slate-900/30 backdrop-blur-[1px]">
      <div className="h-full w-full max-w-xl overflow-y-auto border-l border-gray-200 bg-white shadow-2xl">
        <div className="sticky top-0 border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                {mode === "reject" ? "Reject Request" : "Approval Review"}
              </p>
              <h2 className="mt-1 text-xl font-bold text-[#081534]">{request.resource}</h2>
              <p className="mt-1 text-sm text-gray-500">
                {request.project} · {request.role}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-5 px-6 py-6">
          <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#081534]">Request Context</p>
                <p className="mt-1 text-sm text-gray-600">{request.reason}</p>
              </div>
              <Badge className={cn("text-[11px] font-semibold", impactStyles[request.impact])}>
                {request.impact}
              </Badge>
            </div>
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Effective Date</p>
                <p className="mt-1 font-medium text-gray-800">{request.effectiveDate}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Type</p>
                <p className="mt-1 font-medium text-gray-800">{request.type}</p>
              </div>
            </div>
          </section>

          {request.impact === "High" ? (
            <section className="rounded-lg border border-rose-200 bg-rose-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-700" />
                <div>
                  <h3 className="text-sm font-semibold text-rose-900">High impact review required</h3>
                  <p className="mt-1 text-sm text-rose-800">
                    This request affects a critical allocation. Approval should confirm continuity, replacement coverage, and stakeholder communication.
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          <section>
            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
              {requireReason ? "Decision Notes / Rejection Reason" : "Decision Notes"}
            </label>
            <textarea
              rows={5}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                if (error) setError("");
              }}
              placeholder={
                mode === "reject"
                  ? "Provide the rejection reason"
                  : "Add review notes for audit trail"
              }
              className={cn(
                "mt-2 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-blue-500",
                error ? "border-rose-300" : "border-gray-300",
              )}
            />
            {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
          </section>
        </div>

        <div className="sticky bottom-0 border-t border-gray-200 bg-white px-6 py-4">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline" onClick={onClose} className="h-10 border-gray-300 bg-white text-sm">
              Close
            </Button>
            {mode !== "reject" ? (
              <Button
                variant="outline"
                className="h-10 border-rose-300 bg-white text-sm text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                onClick={() => {
                  if (!reason.trim()) {
                    setError("Rejection reason is required.");
                    return;
                  }
                  onReject?.(request, reason.trim());
                }}
              >
                Reject
              </Button>
            ) : null}
            <Button
              className="h-10 bg-[#081534] text-sm hover:bg-[#10214f]"
              onClick={() => {
                if (mode === "reject") {
                  if (!reason.trim()) {
                    setError("Rejection reason is required.");
                    return;
                  }
                  onReject?.(request, reason.trim());
                  return;
                }
                onApprove?.(request, reason.trim());
              }}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {mode === "reject" ? "Confirm Rejection" : "Approve Request"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalDrawer;
