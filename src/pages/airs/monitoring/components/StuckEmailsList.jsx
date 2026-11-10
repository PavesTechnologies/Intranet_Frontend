import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import Button from "../../../../components/Button/Button";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import { getStuckEmails, resolveStuckEmail } from "../services/scoringMonitoringService";
import { apiErrorMessage } from "../../settings/services/aiProviderService";

// Emails stuck in SENDING: their delivery is unknown, so AIRS never re-sends them. An HR admin checks the
// email provider (by the message id shown here) and records the result. Audited; nothing is sent.
export default function StuckEmailsList({ count, onResolved }) {
  const [rows, setRows] = useState([]);
  const [resolving, setResolving] = useState(null); // { row, outcome }
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await getStuckEmails());
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not load the stuck emails."));
    }
  }, []);

  useEffect(() => {
    if (count > 0) load();
    else setRows([]);
  }, [count, load]);

  if (!rows.length) return null;

  const confirm = async () => {
    setSaving(true);
    try {
      await resolveStuckEmail(resolving.row.id, resolving.outcome);
      toast.success(resolving.outcome === "SENT" ? "Recorded as delivered." : "Recorded as not delivered.");
      setResolving(null);
      await load();
      onResolved?.();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not resolve the email."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/50 p-2">
      <p className="text-[11px] text-slate-600 mb-1.5">
        Check each email with the email provider by its message id, then record what happened.
      </p>
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="py-1 pr-2 font-semibold">Type</th>
            <th className="py-1 pr-2 font-semibold">Sending for</th>
            <th className="py-1 pr-2 font-semibold">Message id</th>
            <th className="py-1" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-amber-100">
              <td className="py-1 pr-2">{r.trigger_event}</td>
              <td className="py-1 pr-2 tabular-nums">{r.minutes != null ? `${r.minutes} min` : "—"}</td>
              <td className="py-1 pr-2 font-mono break-all">{r.provider_message_id || "not recorded"}</td>
              <td className="py-1 text-right whitespace-nowrap">
                <Button variant="outline" size="small" onClick={() => setResolving({ row: r, outcome: "SENT" })}>
                  Delivered
                </Button>{" "}
                <Button variant="outline" size="small" onClick={() => setResolving({ row: r, outcome: "FAILED" })}>
                  Not delivered
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ConfirmationModal
        isOpen={!!resolving}
        title={resolving?.outcome === "SENT" ? "Record as delivered?" : "Record as not delivered?"}
        message={resolving?.outcome === "SENT"
          ? "Only if the email provider shows this email was delivered. It is marked sent; nothing is sent again."
          : "Only if the email provider shows it was not delivered. It is marked failed; nothing is sent. "
            + "To send it, use the original action again (for example Send Rejection Email)."}
        confirmText="Record"
        variant={resolving?.outcome === "SENT" ? "primary" : "danger"}
        isLoading={saving}
        onConfirm={confirm}
        onCancel={() => setResolving(null)}
      />
    </div>
  );
}
