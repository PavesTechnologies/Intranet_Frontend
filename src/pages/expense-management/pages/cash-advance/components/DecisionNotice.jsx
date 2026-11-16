import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Clock3, RotateCcw, Send } from "lucide-react";
import Button from "@/components/Button/Button";
import { showStatusToast } from "@/components/toastfy/toast";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";

const REQUEST_PATH = "/expense-management/cash-advance/request";

const dateOf = (value) => {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

/**
 * Tells everyone who can see the request why it was rejected or deferred, and gives the owner the next step:
 * a deferred request can be sent to the manager again as it is; a rejected one is requested again as a new request,
 * with the earlier details filled in. Dates are not copied, since they must be new.
 */
export default function DecisionNotice({ advance, isOwner, onChanged }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const status = String(advance.status || "").toUpperCase();

  if (status === "REJECTED") {
    return (
      <Notice tone="rose" icon={AlertTriangle} title="This request was rejected" reason={advance.rejectionReason}>
        {isOwner && (
          <Button
            variant="outline"
            size="small"
            onClick={() =>
              navigate(REQUEST_PATH, {
                state: {
                  prefill: {
                    title: advance.title || "",
                    purpose: advance.purpose || "",
                    amount: advance.amount ?? "",
                    currencyId: advance.currencyId ?? "",
                    costCenterId: advance.costCenterId ?? "",
                    notes: advance.notes || "",
                  },
                },
              })
            }
          >
            <RotateCcw size={13} className="mr-1.5" /> Request again
          </Button>
        )}
      </Notice>
    );
  }

  if (status === "DEFERRED") {
    const submitAgain = async () => {
      setBusy(true);
      try {
        await cashAdvanceApi.submit(advance.advanceId);
        showStatusToast("Sent to your manager again.", "success");
        onChanged?.();
      } catch (err) {
        showStatusToast(err.response?.data?.message || err.message || "Could not send the request again", "error", 8000);
      } finally {
        setBusy(false);
      }
    };
    return (
      <Notice
        tone="amber"
        icon={Clock3}
        title={`This request was deferred${advance.deferredAt ? ` on ${dateOf(advance.deferredAt)}` : ""}`}
        reason={advance.deferredReason}
      >
        {isOwner && (
          <>
            <p className="text-[11px] text-amber-800">
              It is not in your manager's queue until you send it again. Send it again once the reason no longer applies.
            </p>
            <Button variant="outline" size="small" disabled={busy} loading={busy} onClick={submitAgain}>
              <Send size={13} className="mr-1.5" /> Send to manager again
            </Button>
          </>
        )}
      </Notice>
    );
  }

  return null;
}

const TONE = {
  rose: "border-rose-200 bg-rose-50 text-rose-900",
  amber: "border-amber-200 bg-amber-50 text-amber-900",
};

function Notice({ tone, icon: Icon, title, reason, children }) {
  return (
    <div className={`space-y-2 rounded-lg border p-3 ${TONE[tone]}`}>
      <div className="flex items-start gap-2">
        <Icon size={16} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-semibold">{title}</p>
          <p className="whitespace-pre-line">
            {reason ? `Reason: ${reason}` : "No reason was recorded."}
          </p>
        </div>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2 pl-6">{children}</div>}
    </div>
  );
}
