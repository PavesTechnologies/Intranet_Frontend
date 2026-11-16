// "SharePoint import" card on the AP Automation page: daily pickup of payment / TDS sheets from the
// AP SharePoint library (Backend/scripts/run_sharepoint_import.py). OFF by default.
import { useState } from "react";
import clsx from "clsx";
import { toast } from "react-toastify";
import { FolderSync } from "lucide-react";
import Button from "../../../../components/Button/Button";
import { getApiErrorMessage } from "../../utils/apiError";
import { useSetSharePointImport, useSharePointImport } from "../hooks/useApAutomation";
import { fmtDateTime } from "../../bulk-import/components/BulkImportParts";

function lastRunText(run) {
  if (!run?.at) return "No run recorded yet";
  if (run.status === "error") return `${fmtDateTime(run.at)} · failed${run.error ? `: ${run.error}` : ""}`;
  return `${fmtDateTime(run.at)} · ${run.sheets ?? 0} sheet(s) · ${run.recorded ?? 0} recorded · ${run.review ?? 0} to review`;
}

export default function SharePointImportCard() {
  const { data, isLoading, isError } = useSharePointImport();
  const toggle = useSetSharePointImport();
  const [confirming, setConfirming] = useState(false);
  if (isLoading || isError || !data) return null;

  const apply = async () => {
    setConfirming(false);
    try {
      await toggle.mutateAsync(!data.enabled);
      toast.success(data.enabled ? "SharePoint import switched off." : "SharePoint import switched on.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not change SharePoint import."));
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="sp-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className={clsx("flex h-9 w-9 items-center justify-center rounded-full", data.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>
            <FolderSync className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 id="sp-title" className="text-base font-semibold text-slate-900">
              SharePoint import (daily){" "}
              <span className={clsx("ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1", data.enabled ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-slate-200")}>
                {data.enabled ? "On" : "Off"}
              </span>
            </h2>
            <p className="mt-0.5 max-w-3xl text-sm text-slate-600">
              Sheets dropped in the library&apos;s Inbox folders are imported once a day. Rows confirmed by their receipt / challan / acknowledgement are recorded;
              the rest wait in Bulk import for review. Results are written back next to the sheet.
            </p>
            <dl className="mt-2 grid gap-x-6 gap-y-1 text-xs text-slate-500 sm:grid-cols-2">
              <div><dt className="inline font-medium text-slate-600">Site: </dt><dd className="inline">{data.site || "not configured (SHAREPOINT_SITE)"}</dd></div>
              <div><dt className="inline font-medium text-slate-600">Folders: </dt><dd className="inline">{data.library} / {data.root_folder} / {data.folders.join(", ")}</dd></div>
              <div><dt className="inline font-medium text-slate-600">Last run: </dt><dd className="inline">{lastRunText(data.last_run)}</dd></div>
              {data.updated_at && <div><dt className="inline font-medium text-slate-600">Last changed: </dt><dd className="inline">{fmtDateTime(data.updated_at)}{data.updated_by ? ` by ${data.updated_by}` : ""}</dd></div>}
            </dl>
          </div>
        </div>
        {confirming ? (
          <div className="flex items-center gap-2" role="group" aria-label="Confirm change">
            <span className="text-xs text-slate-600">{data.enabled ? "Stop the daily import?" : "Start the daily import?"}</span>
            <Button size="small" variant="primary" onClick={apply} loading={toggle.isPending}>{data.enabled ? "Switch off" : "Switch on"}</Button>
            <Button size="small" variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button>
          </div>
        ) : (
          <button
            type="button"
            role="switch"
            aria-checked={data.enabled}
            aria-label="SharePoint import"
            disabled={!data.configured && !data.enabled}
            title={data.configured ? undefined : "Set SHAREPOINT_SITE in the backend .env first"}
            onClick={() => setConfirming(true)}
            className={clsx("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition", data.enabled ? "bg-emerald-500" : "bg-slate-300", !data.configured && !data.enabled && "cursor-not-allowed opacity-60")}
          >
            <span className={clsx("inline-block h-5 w-5 transform rounded-full bg-white shadow transition", data.enabled ? "translate-x-5" : "translate-x-0.5")} />
          </button>
        )}
      </div>
    </section>
  );
}
