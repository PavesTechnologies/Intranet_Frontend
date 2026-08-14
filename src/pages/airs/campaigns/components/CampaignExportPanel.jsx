import React, { useState } from "react";
import { toast } from "react-toastify";
import { Download, FileSpreadsheet, FileText, Package, ShieldCheck } from "lucide-react";
import Button from "../../../../components/Button/Button";
import Modal from "../../../../components/ui/Modal";
import { useAuth } from "../../../../contexts/AuthContext";
import {
  exportAuditTrail, exportCandidateList, exportComplianceSummary,
  exportShortlistPackage,
} from "../services/exportService";

function ExportButton({ icon: Icon, label, hint, onClick }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
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

// Grouped by intent (take the list away, brief a hiring manager, satisfy an
// auditor) rather than by output format, which users don't choose between.
export default function CampaignExportPanel({ campaignId }) {
  const { hasRole } = useAuth();
  const isHrAdmin = hasRole(["HR_ADMIN"]);

  const [listDialog, setListDialog] = useState(false);
  const [includeRejected, setIncludeRejected] = useState(false);
  const [queued, setQueued] = useState(null);

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

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900">Exports</h3>
        <p className="text-[11px] text-slate-500">
          Candidate data is exported by ID only — no names, emails or phone numbers.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <ExportButton
          icon={FileSpreadsheet}
          label="Candidate list (XLSX)"
          hint="Ranked list, optionally with a rejected-candidates sheet"
          onClick={() => { setQueued(null); setListDialog(true); }}
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

      <Modal isOpen={listDialog} onClose={() => setListDialog(false)}
        title="Export candidate list" width="520px">
        <div className="space-y-3">
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
    </div>
  );
}
