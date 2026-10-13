// "Mailbox intake" card on the Bulk Upload page: shows whether invoices are being read from the AP
// mailbox, and lets EMAIL_INTAKE_MANAGE users switch it on / off (stored in system_configuration,
// read by Backend/scripts/run_email_intake.py at the start of every run).
import { useState } from "react";
import clsx from "clsx";
import { toast } from "react-toastify";
import { Mail } from "lucide-react";
import Button from "../../../../../components/Button/Button";
import { getApiErrorMessage } from "../../../utils/apiError";
import { useEmailIntakeStatus, useSetEmailIntakeMutation } from "../../hooks/useBulkUpload";
import { formatDateTime } from "./BulkUploadParts";

function Switch({ checked, disabled, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082]/40",
        checked ? "bg-emerald-500" : "bg-slate-300",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      )}
    >
      <span className={clsx("inline-block h-5 w-5 transform rounded-full bg-white shadow transition", checked ? "translate-x-5" : "translate-x-0.5")} />
    </button>
  );
}

function lastRunText(lastRun) {
  if (!lastRun?.at) return "No run recorded yet";
  const when = formatDateTime(lastRun.at);
  if (lastRun.status === "error") return `${when} · failed${lastRun.error ? `: ${lastRun.error}` : ""}`;
  const imported = lastRun.imported ?? 0;
  return `${when} · ${imported} email${imported === 1 ? "" : "s"} imported${lastRun.errors ? ` · ${lastRun.errors} error(s)` : ""}`;
}

export default function EmailIntakeCard() {
  const { data, isLoading, isError } = useEmailIntakeStatus();
  const setEnabled = useSetEmailIntakeMutation();
  const [confirming, setConfirming] = useState(false);

  if (isLoading || isError || !data) return null;

  const apply = async (enabled) => {
    setConfirming(false);
    try {
      await setEnabled.mutateAsync(enabled);
      toast.success(enabled ? "Mailbox intake switched on." : "Mailbox intake switched off.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not change mailbox intake."));
    }
  };

  const filter = data.sender_filter?.length
    ? `Only mail from ${data.sender_filter.join(", ")}`
    : "All mail with an invoice-like subject or attachment";

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="email-intake-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className={clsx("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", data.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>
            <Mail className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id="email-intake-title" className="text-base font-semibold text-slate-900">
              Mailbox intake{" "}
              <span className={clsx("ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1", data.enabled ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-slate-200")}>
                {data.enabled ? "On" : "Off"}
              </span>
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">
              {data.enabled
                ? `Invoices emailed to ${data.mailbox || "the AP mailbox"} are read every ${data.interval_minutes} minutes and sent to OCR review.`
                : `Invoices emailed to ${data.mailbox || "the AP mailbox"} are not being read.`}
            </p>
            <dl className="mt-2 grid gap-x-6 gap-y-1 text-xs text-slate-500 sm:grid-cols-2">
              <div>
                <dt className="inline font-medium text-slate-600">Senders: </dt>
                <dd className="inline">{filter}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-slate-600">Last run: </dt>
                <dd className="inline">{lastRunText(data.last_run)}</dd>
              </div>
              {data.start_date && (
                <div>
                  <dt className="inline font-medium text-slate-600">Mail received from: </dt>
                  <dd className="inline">{data.start_date}</dd>
                </div>
              )}
              {data.updated_at && (
                <div>
                  <dt className="inline font-medium text-slate-600">Last changed: </dt>
                  <dd className="inline">{formatDateTime(data.updated_at)}{data.updated_by ? ` by ${data.updated_by}` : ""}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {data.can_manage ? (
            confirming ? (
              <div className="flex items-center gap-2" role="group" aria-label="Confirm change">
                <span className="text-xs text-slate-600">{data.enabled ? "Stop reading the mailbox?" : "Start reading the mailbox?"}</span>
                <Button size="small" variant="primary" onClick={() => apply(!data.enabled)} loading={setEnabled.isPending}>
                  {data.enabled ? "Switch off" : "Switch on"}
                </Button>
                <Button size="small" variant="ghost" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Switch checked={data.enabled} disabled={setEnabled.isPending} onChange={() => setConfirming(true)} label="Mailbox intake" />
            )
          ) : (
            <span className="text-xs text-slate-400">Only users with mailbox intake rights can change this.</span>
          )}
        </div>
      </div>
    </section>
  );
}
