import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { BellRing, MailX } from "lucide-react";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import { getAlertSettings, setAlertRecipient } from "../services/settingsService";
import { apiErrorMessage } from "../services/aiProviderService";

// Settings phase 1: who receives each internal alert. Every active HR admin receives it (also when HR admin
// is a secondary role in their login) unless switched off here; a switch is confirmed and audited.
export default function SettingsAlerts() {
  const [alerts, setAlerts] = useState(null);
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getAlertSettings().then(setAlerts).catch((error) => {
      toast.error(apiErrorMessage(error, "Couldn't load the alerts."));
      setAlerts([]);
    });
  }, []);

  const apply = async () => {
    setBusy(true);
    try {
      setAlerts(await setAlertRecipient(pending.alert.trigger_event, pending.recipient.user_id, !pending.recipient.enabled));
      toast.success("Alert recipients saved.");
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't change the recipient."));
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  if (!alerts) return <LoadingSpinner text="Loading alerts..." />;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
        <BellRing className="h-4 w-4 text-slate-500" /> Alert recipients
      </h2>
      <p className="text-[11px] text-slate-500 mt-1 max-w-2xl">
        Operational alerts go to every active HR admin. Switch a person off for an alert they shouldn't get.
        Thresholds and repeat intervals are on the General tab.
      </p>

      {alerts.map((alert) => (
        <div key={alert.trigger_event} className="mt-4 border border-slate-100 rounded-lg">
          <div className="px-3 py-2 border-b border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-800">{alert.label}</span>
            <span className="text-[11px] text-slate-500">{alert.description}</span>
            <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded ${alert.receiving ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              {alert.receiving} receiving
            </span>
          </div>
          {alert.receiving === 0 && (
            <p className="px-3 py-1.5 text-[11px] text-rose-600">Nobody receives this alert.</p>
          )}
          <ul className="divide-y divide-slate-100">
            {alert.recipients.map((r) => (
              <li key={r.user_id} className="flex items-center gap-3 px-3 py-1.5 text-xs">
                <span className="font-semibold text-slate-800">{r.name}</span>
                <span className="text-slate-400">{r.email || "no email address"}</span>
                {!r.has_email && <MailX className="h-3.5 w-3.5 text-amber-500" title="No email address: can't receive alerts" />}
                <span className="ml-auto inline-flex items-center gap-2">
                  <span className={`text-[10px] font-semibold ${r.enabled ? "text-emerald-700" : "text-slate-400"}`}>
                    {r.enabled ? "Receives" : "Switched off"}
                  </span>
                  {(() => {
                    // The server refuses switching off an alert's only recipient; say why up front.
                    const onlyOne = r.enabled && r.has_email && alert.receiving === 1;
                    return (
                      <Button variant="outline" size="small" disabled={busy || onlyOne}
                        title={onlyOne ? "The only HR admin receiving this alert. Switch another HR admin on first." : undefined}
                        onClick={() => setPending({ alert, recipient: r })}>
                        {r.enabled ? "Switch off" : "Switch on"}
                      </Button>
                    );
                  })()}
                </span>
              </li>
            ))}
            {alert.recipients.length === 0 && (
              <li className="px-3 py-2 text-[11px] text-slate-400">No active HR admins.</li>
            )}
          </ul>
        </div>
      ))}

      <ConfirmationModal
        isOpen={!!pending}
        title={pending?.recipient.enabled ? "Stop this alert for them?" : "Send this alert to them again?"}
        message={pending
          ? `${pending.recipient.name} will ${pending.recipient.enabled ? "no longer receive" : "receive"} "${pending.alert.label}". The change is recorded in the audit log.`
          : ""}
        confirmText={pending?.recipient.enabled ? "Switch off" : "Switch on"}
        variant={pending?.recipient.enabled ? "danger" : "primary"}
        isLoading={busy}
        onCancel={() => setPending(null)}
        onConfirm={apply}
      />
    </div>
  );
}
