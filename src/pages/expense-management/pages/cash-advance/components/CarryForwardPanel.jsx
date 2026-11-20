import React, { useEffect, useState } from "react";
import Button from "@/components/Button/Button";
import { showStatusToast } from "@/components/toastfy/toast";
import { carryForwardApi } from "@/pages/expense-management/api/carryForwardApi";

const MIN_REASON_LENGTH = 10;
const STANDARD_REASON = "Balance carried forward from the settlement screen";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20";

const formatMoney = (amount, currencyCode) =>
  `${currencyCode || "INR"} ${Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Carry-forward of the unused balance. Clicking Carry forward moves it off this advance at once and holds it in the
 * employee's outstanding. The employee's next request (Cash Advance + Outstanding) takes it in, and Finance then pays
 * only the new cash. Nothing is paid now.
 */
export default function CarryForwardPanel({ advanceId, currencyCode, outstanding, onChanged }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [readyAmount, setReadyAmount] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const ready = Number(readyAmount) > 0;

  // The ready amount lives on the server, so load it when the panel opens and after each change.
  useEffect(() => {
    let cancelled = false;
    carryForwardApi
      .getReady(advanceId)
      .then((res) => {
        if (!cancelled) setReadyAmount(res?.readyAmount ?? null);
      })
      .catch(() => {
        if (!cancelled) setReadyAmount(null);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [advanceId]);

  // One click carries the full outstanding balance. The server requires a reason, so a standard one is sent.
  const markReady = async () => {
    const amountNumber = Number(outstanding);
    if (!(amountNumber > 0)) {
      showStatusToast("There is no balance to carry forward.", "error");
      return;
    }
    setBusy(true);
    try {
      const updated = await carryForwardApi.markReady({ advanceId, amount: amountNumber, reason: STANDARD_REASON });
      setReadyAmount(updated?.readyAmount ?? null);
      showStatusToast("Balance carried forward. It is now in the employee's outstanding for the next advance.", "success", 6000);
      onChanged?.();
    } catch (err) {
      showStatusToast(err.response?.data?.message || "Could not carry the balance forward", "error", 8000);
    } finally {
      setBusy(false);
    }
  };

  const cancelReady = async () => {
    if (reason.trim().length < MIN_REASON_LENGTH) {
      showStatusToast(`Enter a reason of at least ${MIN_REASON_LENGTH} characters to cancel.`, "error");
      return;
    }
    setBusy(true);
    try {
      const updated = await carryForwardApi.cancelReady(advanceId, reason.trim());
      setReadyAmount(updated?.readyAmount ?? null);
      setReason("");
      showStatusToast("Carry-forward returned to this advance.", "success");
      onChanged?.();
    } catch (err) {
      showStatusToast(err.response?.data?.message || "Could not cancel the carry-forward", "error", 8000);
    } finally {
      setBusy(false);
    }
  };

  if (!loaded) {
    return <div className="h-16 animate-pulse rounded-lg bg-gray-100" />;
  }

  if (ready) {
    return (
      <div className="space-y-3 rounded-lg border border-emerald-300 bg-white p-4 text-xs">
        <p className="text-sm font-semibold text-gray-900">Carry-forward confirmation</p>
        <p className="text-gray-800">
          <span className="font-semibold">{formatMoney(readyAmount, currencyCode)}</span> is carried forward and held in the employee's outstanding.
        </p>
        <p className="text-gray-600">
          The employee's next INR request takes it in as outstanding, and Finance then pays only the new cash. Cancelling
          returns it to this advance.
        </p>
        <label className="block text-xs font-semibold text-gray-700" htmlFor="carry-forward-cancel-reason">
          Reason to cancel (at least {MIN_REASON_LENGTH} characters)
        </label>
        <textarea
          id="carry-forward-cancel-reason"
          className={inputClass}
          rows={2}
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="small" disabled={busy} onClick={cancelReady}>
            Cancel carry-forward
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-600">
        Move the {formatMoney(outstanding, currencyCode)} unused balance off this advance now and into the employee's
        outstanding. Their next INR request takes it in, and Finance pays only the new cash. Nothing is paid now.
      </p>
      <div className="flex justify-end">
        <Button type="button" variant="success" disabled={busy} loading={busy} onClick={markReady}>
          Carry forward {formatMoney(outstanding, currencyCode)}
        </Button>
      </div>
    </div>
  );
}
