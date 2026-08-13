import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  CalendarClock, Download, FileSpreadsheet, FileText, History, Package,
  Pause, Play, ShieldCheck, Trash2,
} from "lucide-react";
import Button from "../../../../components/Button/Button";
import Modal from "../../../../components/Modal/modal";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { useAuth } from "../../../../contexts/AuthContext";
import {
  deleteExportSchedule, exportAuditTrail, exportCandidateList,
  exportComplianceSummary, exportShortlistPackage, getExportHistory,
  getExportSchedule, previewCandidateExport, saveExportSchedule,
  setExportSchedulePaused,
} from "../services/exportService";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const fmtDate = (v) => {
  if (!v) return "—";
  try { return new Date(v).toLocaleString(); } catch { return v; }
};

function ExportButton({ icon: Icon, label, hint, onClick, disabled }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={async () => {
        setBusy(true);
        try { await onClick(); } finally { setBusy(false); }
      }}
      className="flex items-start gap-2.5 text-left p-3 rounded-xl border border-slate-200 bg-white
                 hover:border-indigo-300 hover:bg-indigo-50/40 transition disabled:opacity-50"
    >
      <Icon className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-slate-900">
          {busy ? "Generating…" : label}
        </span>
        <span className="block text-[10px] text-slate-500">{hint}</span>
      </span>
    </button>
  );
}

/**
 * Every export for one campaign, in one place.
 * Grouped by what the user is trying to do (take the list away, brief a hiring
 * manager, satisfy an auditor) rather than by output format, because the format
 * is an implementation detail they don't choose between.
 */
export default function CampaignExportPanel({ campaignId }) {
  const { hasRole } = useAuth();
  const isHrAdmin = hasRole(["HR_ADMIN"]);

  const [preview, setPreview] = useState(null);
  const [listDialog, setListDialog] = useState(false);
  const [includeRejected, setIncludeRejected] = useState(false);
  const [queued, setQueued] = useState(null);

  const [schedule, setSchedule] = useState(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState(null);
  const [form, setForm] = useState({
    frequency: "WEEKLY", day_of_week: "MONDAY", time: "09:00",
    top_n: 10, format: "XLSX", recipients: "",
  });

  const loadSchedule = useCallback(async () => {
    if (!isHrAdmin) return;
    try {
      const s = await getExportSchedule(campaignId);
      setSchedule(s);
      if (s?.configured) {
        setForm({
          frequency: s.frequency || "WEEKLY",
          day_of_week: s.day_of_week || "MONDAY",
          time: s.time || "09:00",
          top_n: s.top_n || 10,
          format: s.format || "XLSX",
          recipients: (s.recipients || []).join(", "),
        });
      }
    } catch {
      setSchedule(null);
    }
  }, [campaignId, isHrAdmin]);

  useEffect(() => { loadSchedule(); }, [loadSchedule]);

  const openListDialog = async () => {
    setListDialog(true);
    setQueued(null);
    try {
      setPreview(await previewCandidateExport(campaignId));
    } catch {
      setPreview(null);
    }
  };

  const runListExport = async () => {
    try {
      const res = await exportCandidateList(campaignId, { includeRejectedSheet: includeRejected });
      if (res?.queued) {
        // Deliberately keeps the dialog open: the user needs to read why no
        // file appeared, otherwise a large export looks like a broken button.
        setQueued(res);
      } else {
        setListDialog(false);
        toast.success("Export downloaded.");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Export failed.");
    }
  };

  const wrap = (fn, okMsg) => async () => {
    try {
      await fn();
      toast.success(okMsg);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Export failed.");
    }
  };

  const submitSchedule = async () => {
    const recipients = form.recipients.split(",").map((r) => r.trim()).filter(Boolean);
    if (recipients.length === 0) {
      toast.error("Add at least one recipient email.");
      return;
    }
    try {
      const saved = await saveExportSchedule(campaignId, {
        enabled: true,
        frequency: form.frequency,
        day_of_week: form.frequency === "DAILY" ? null : form.day_of_week,
        time: form.time,
        top_n: Number(form.top_n),
        format: form.format,
        recipients,
      });
      setSchedule(saved);
      setScheduleOpen(false);
      toast.success("Scheduled export saved.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not save the schedule.");
    }
  };

  const togglePause = async () => {
    try {
      setSchedule(await setExportSchedulePaused(campaignId, !schedule?.paused));
      toast.success(schedule?.paused ? "Schedule resumed." : "Schedule paused.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not update the schedule.");
    }
  };

  const removeSchedule = async () => {
    try {
      await deleteExportSchedule(campaignId);
      setSchedule({ configured: false });
      toast.success("Scheduled export disabled.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not disable the schedule.");
    }
  };

  const openHistory = async () => {
    setHistoryOpen(true);
    setHistory(null);
    try {
      setHistory(await getExportHistory(campaignId));
    } catch {
      setHistory([]);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900">Exports</h3>
        <p className="text-[11px] text-slate-500">
          Candidate data is exported by UUID only — no names, emails or phone numbers.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <ExportButton
          icon={FileSpreadsheet}
          label="Candidate list (XLSX)"
          hint="Ranked list, optionally with a rejected-candidates sheet"
          onClick={openListDialog}
        />
        {isHrAdmin && (
          <ExportButton
            icon={Package}
            label="Shortlist package (PDF)"
            hint="Cover page, ranking summary and a scorecard per shortlisted candidate"
            onClick={wrap(() => exportShortlistPackage(campaignId), "Shortlist package downloaded.")}
          />
        )}
        {isHrAdmin && (
          <ExportButton
            icon={FileText}
            label="Audit trail (XLSX)"
            hint="All events, stage transitions and score history"
            onClick={wrap(() => exportAuditTrail(campaignId), "Audit trail downloaded.")}
          />
        )}
        {isHrAdmin && (
          <ExportButton
            icon={ShieldCheck}
            label="Compliance summary (PDF)"
            hint="Aggregate figures only — no candidate or reviewer identities"
            onClick={wrap(() => exportComplianceSummary(campaignId), "Compliance summary downloaded.")}
          />
        )}
      </div>

      {/* Scheduled exports */}
      {isHrAdmin && (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
              Scheduled export
              {schedule?.configured && schedule?.paused && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  PAUSED
                </span>
              )}
              {schedule?.auto_suspended && (
                <span
                  title="The campaign is not active, so the schedule is suspended until it is."
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700"
                >
                  AUTO-SUSPENDED
                </span>
              )}
            </h4>
            <div className="flex items-center gap-1.5">
              {schedule?.configured && (
                <>
                  <Button variant="ghost" size="small" onClick={openHistory} title="Export history">
                    <History className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="small" onClick={togglePause}
                    title={schedule.paused ? "Resume" : "Pause"}>
                    {schedule.paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                  </Button>
                  <Button variant="ghost" size="small" onClick={removeSchedule} title="Disable">
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </>
              )}
              <Button variant="outline" size="small" onClick={() => setScheduleOpen(true)}>
                {schedule?.configured ? "Edit" : "Set up"}
              </Button>
            </div>
          </div>

          {schedule?.configured ? (
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div>
                <p className="text-slate-400 text-[10px]">Frequency</p>
                <p className="font-semibold text-slate-800">
                  {schedule.frequency}
                  {schedule.day_of_week ? ` · ${schedule.day_of_week.slice(0, 3)}` : ""} · {schedule.time}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px]">Contents</p>
                <p className="font-semibold text-slate-800">Top {schedule.top_n} · {schedule.format}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px]">Last sent</p>
                <p className="font-semibold text-slate-800">{fmtDate(schedule.last_sent_at)}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px]">Next run</p>
                <p className="font-semibold text-slate-800">{fmtDate(schedule.next_run_at)}</p>
              </div>
              <div className="col-span-2 sm:col-span-4">
                <p className="text-slate-400 text-[10px]">Recipients</p>
                <p className="text-slate-700 truncate">{(schedule.recipients || []).join(", ")}</p>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 mt-2">
              No recurring export configured for this campaign.
            </p>
          )}
        </div>
      )}

      {/* S01 export dialog */}
      <Modal isOpen={listDialog} onClose={() => setListDialog(false)}
        title="Export candidate list" size="md">
        <div className="space-y-3">
          {preview && (
            <p className="text-xs text-slate-600">
              {preview.row_count} candidate{preview.row_count === 1 ? "" : "s"} will be exported.
              {preview.will_be_async
                && ` That is above the ${preview.threshold}-row limit for immediate downloads, so it will be generated in the background.`}
            </p>
          )}
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={includeRejected}
              onChange={(e) => setIncludeRejected(e.target.checked)}
              className="accent-indigo-600 mt-0.5" />
            <span className="text-xs text-slate-700">
              Include rejected candidates sheet
              <span className="block text-[10px] text-slate-400">
                Every rejection event, including candidates rejected more than once.
              </span>
            </span>
          </label>

          {queued && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5">
              <p className="text-[11px] text-amber-900">{queued.detail}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="small" onClick={() => setListDialog(false)}>
              {queued ? "Close" : "Cancel"}
            </Button>
            {!queued && (
              <Button variant="primary" size="small" onClick={runListExport}>
                <Download className="h-3 w-3 mr-1" /> Export
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* S03 schedule dialog */}
      <Modal isOpen={scheduleOpen} onClose={() => setScheduleOpen(false)}
        title="Schedule recurring export" size="md">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Frequency</label>
              <select value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs">
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="BIWEEKLY">Bi-weekly</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Day</label>
              <select value={form.day_of_week} disabled={form.frequency === "DAILY"}
                onChange={(e) => setForm({ ...form, day_of_week: e.target.value })}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs disabled:bg-slate-50 disabled:text-slate-400">
                {DAYS.map((d) => <option key={d} value={d}>{d[0] + d.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Time</label>
              <input type="time" value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Top N</label>
              <input type="number" min="1" max="50" value={form.top_n}
                onChange={(e) => setForm({ ...form, top_n: e.target.value })}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Format</label>
              <select value={form.format}
                onChange={(e) => setForm({ ...form, format: e.target.value })}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs">
                <option value="XLSX">XLSX</option>
                <option value="PDF">PDF</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
              Recipients <span className="text-red-500">*</span>
            </label>
            <input type="text" value={form.recipients} placeholder="hm@example.com, lead@example.com"
              onChange={(e) => setForm({ ...form, recipients: e.target.value })}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
            <p className="text-[10px] text-slate-400 mt-1">Comma-separated.</p>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="small" onClick={() => setScheduleOpen(false)}>Cancel</Button>
            <Button variant="primary" size="small" onClick={submitSchedule}>Save schedule</Button>
          </div>
        </div>
      </Modal>

      {/* T03 history */}
      <Modal isOpen={historyOpen} onClose={() => setHistoryOpen(false)}
        title="Export history" size="lg">
        {history === null && <div className="py-6 flex justify-center"><LoadingSpinner text="Loading…" /></div>}
        {history !== null && history.length === 0 && (
          <p className="text-[11px] text-slate-400 py-6 text-center">
            No exports have been generated for this campaign yet.
          </p>
        )}
        {history !== null && history.length > 0 && (
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {history.map((h) => (
              <div key={h.task_id}
                className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border ${
                  h.failed ? "bg-red-50 border-red-200" : "bg-white border-slate-200"
                }`}>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">{h.title || "Export"}</p>
                  <p className="text-[10px] text-slate-500">
                    {fmtDate(h.generated_at)} · {h.status}
                    {h.scheduled ? " · scheduled" : " · manual"}
                    {h.error ? ` · ${h.error}` : ""}
                  </p>
                </div>
                {h.download_url && !h.failed && (
                  <a href={h.download_url} target="_blank" rel="noreferrer"
                    className="text-[11px] font-semibold text-indigo-600 hover:underline shrink-0">
                    Download
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
