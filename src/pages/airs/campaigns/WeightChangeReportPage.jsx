import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, Download } from "lucide-react";
import Button from "../../../components/Button/Button";
import LoadingSpinner from "../../../components/LoadingSpinner";
import FilterListbox from "../../../components/filter/FilterListbox";
import { getWeightChangeReport, exportWeightChangeReport } from "./services/campaignservice";
import useCampaignPermissions from "./hooks/useCampaignPermissions";

const unwrap = (res) => (res && res.data !== undefined ? res.data : res);
const fmtDate = (d) => (d ? new Date(d).toLocaleString() : "—");

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "" },
  { label: "Active", value: "ACTIVE" },
  { label: "Paused", value: "PAUSED" },
  { label: "Closed", value: "CLOSED" },
];

const fmtWeights = (w) => (w ? `${w.weight_deterministic}/${w.weight_semantic}/${w.weight_ai}` : "—");

// E02-S05-T03 — Consolidated Weight Change Report (HR_ADMIN only), for compliance review.
export default function WeightChangeReportPage() {
  const navigate = useNavigate();
  const { canViewWeightReport } = useCampaignPermissions();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchReport = async () => {
    if (!canViewWeightReport) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getWeightChangeReport({
        date_from: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        date_to: dateTo ? new Date(dateTo).toISOString() : undefined,
        campaign_status: status || undefined,
      });
      setReport(unwrap(res));
    } catch {
      toast.error("Failed to load weight change report.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExport = async () => {
    setExporting(true);
    try {
      const blobData = await exportWeightChangeReport({
        date_from: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        date_to: dateTo ? new Date(dateTo).toISOString() : undefined,
        campaign_status: status || undefined,
      });
      const blob = new Blob([blobData], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Weight_Change_Report_${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to export weight change report.");
    } finally {
      setExporting(false);
    }
  };

  const rows = report?.rows || [];

  // Placed after every hook (Rules of Hooks). Route-level ProtectedRoute
  // already blocks non-HR_ADMIN; this is the in-page backstop.
  if (!canViewWeightReport) {
    return (
      <div className="bg-[#F8FAFC] min-h-screen p-6 flex flex-col items-center justify-center">
        <p className="text-sm font-bold text-slate-700">You don't have permission to view the weight change report.</p>
        <Button variant="primary" size="small" className="mt-4" onClick={() => navigate("/airs/campaigns")}>
          Back to Campaigns
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-[#F8FAFC] text-slate-900 font-sans min-h-screen p-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 shadow-sm shrink-0"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">Weight Change Report</h1>
          <p className="text-xs text-slate-500 mt-0.5">All scoring weight changes across every campaign, for compliance review.</p>
        </div>
        <Button variant="outline" size="small" onClick={handleExport} loading={exporting} loadingText="Exporting...">
          <Download className="h-4 w-4" /> Export XLSX
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs"
          />
        </div>
        <div className="w-40">
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Campaign Status</label>
          <FilterListbox options={STATUS_OPTIONS} value={status} onChange={setStatus} />
        </div>
        <Button variant="primary" size="small" onClick={fetchReport} loading={loading} loadingText="Loading...">
          Apply Filters
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
        {loading ? (
          <div className="py-12 flex justify-center"><LoadingSpinner text="Loading report..." /></div>
        ) : rows.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-12">No weight changes found for this filter.</p>
        ) : (
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left p-3 font-bold text-slate-400 uppercase text-[10px]">Campaign</th>
                <th className="text-left p-3 font-bold text-slate-400 uppercase text-[10px]">Status</th>
                <th className="text-left p-3 font-bold text-slate-400 uppercase text-[10px]">Changed At</th>
                <th className="text-left p-3 font-bold text-slate-400 uppercase text-[10px]">Changed By</th>
                <th className="text-left p-3 font-bold text-slate-400 uppercase text-[10px]">Before (D/S/AI)</th>
                <th className="text-left p-3 font-bold text-slate-400 uppercase text-[10px]">After (D/S/AI)</th>
                <th className="text-left p-3 font-bold text-slate-400 uppercase text-[10px]">Candidates Under New Config</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className="border-b border-slate-50">
                  <td className="p-3 font-bold text-slate-800">{row.campaign_name}</td>
                  <td className="p-3 text-slate-600">{row.campaign_status}</td>
                  <td className="p-3 text-slate-500">{fmtDate(row.change_date)}</td>
                  <td className="p-3 text-slate-500">{row.changed_by}</td>
                  <td className="p-3 text-slate-500">{fmtWeights(row.previous_weights)}</td>
                  <td className="p-3 font-semibold text-slate-800">{fmtWeights(row.new_weights)}</td>
                  <td className="p-3 text-slate-600 tabular-nums">{row.candidates_processed_with_this_config}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {report && <p className="text-[11px] text-slate-400 mt-2">{report.total_count} total change(s)</p>}
    </div>
  );
}
