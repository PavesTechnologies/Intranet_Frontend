import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, Check, Copy, Minus } from "lucide-react";
import Button from "../../../components/Button/Button";
import LoadingSpinner from "../../../components/LoadingSpinner";
import FilterListbox from "../../../components/filter/FilterListbox";
import { getAllCampaignsHrAdmin, compareCampaigns, copyScoringConfig } from "./services/campaignservice";
import useCampaignPermissions from "./hooks/useCampaignPermissions";

const unwrap = (res) => (res && res.data !== undefined ? res.data : res);
const MIN_SELECT = 2;
const MAX_SELECT = 4;

const FIELD_ROWS = [
  { key: "jd_title", label: "Job Description" },
  { key: "status", label: "Status" },
  { key: "weight_deterministic", label: "Deterministic Weight", suffix: "%" },
  { key: "weight_semantic", label: "Semantic Weight", suffix: "%" },
  { key: "weight_ai", label: "AI Weight", suffix: "%" },
  { key: "semantic_threshold", label: "Semantic Threshold" },
  { key: "ai_threshold", label: "AI Threshold", suffix: "%" },
  { key: "total_candidates", label: "Total Candidates" },
];

// E02-S04 — Compare Weight Configurations Across Campaigns (HR_ADMIN only).
export default function CampaignComparePage() {
  const navigate = useNavigate();
  const { canCompareCampaigns } = useCampaignPermissions();
  const [campaigns, setCampaigns] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [comparing, setComparing] = useState(false);

  const [sourceId, setSourceId] = useState("");
  const [targetIds, setTargetIds] = useState([]);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    // Route-level ProtectedRoute already blocks non-HR_ADMIN; this is the
    // API-level backstop so no HR_ADMIN-only call is ever attempted if this
    // page is somehow reached by another role.
    if (!canCompareCampaigns) {
      setLoadingList(false);
      return;
    }
    (async () => {
      try {
        const res = await getAllCampaignsHrAdmin();
        setCampaigns(unwrap(res) || []);
      } catch {
        toast.error("Failed to load campaigns.");
      } finally {
        setLoadingList(false);
      }
    })();
  }, [canCompareCampaigns]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SELECT) {
        toast.error(`You can compare up to ${MAX_SELECT} campaigns at a time.`);
        return prev;
      }
      return [...prev, id];
    });
    setComparison(null);
  };

  const handleCompare = async () => {
    if (selectedIds.length < MIN_SELECT) {
      return toast.error(`Select at least ${MIN_SELECT} campaigns to compare.`);
    }
    setComparing(true);
    try {
      const res = await compareCampaigns(selectedIds);
      setComparison(unwrap(res));
      setSourceId(selectedIds[0]);
      setTargetIds([]);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to compare campaigns.");
    } finally {
      setComparing(false);
    }
  };

  const targetOptions = useMemo(
    () => (comparison?.campaigns || []).filter((c) => c.campaign_id !== sourceId),
    [comparison, sourceId]
  );

  const toggleTarget = (id) => {
    setTargetIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleCopy = async () => {
    if (!sourceId) return toast.error("Select a source campaign.");
    if (targetIds.length === 0) return toast.error("Select at least one target campaign.");
    setCopying(true);
    try {
      await copyScoringConfig(sourceId, targetIds);
      toast.success("Scoring configuration copied successfully.");
      setTargetIds([]);
      handleCompare();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to copy scoring configuration.");
    } finally {
      setCopying(false);
    }
  };

  // Placed after every hook (Rules of Hooks). Route-level ProtectedRoute
  // already blocks non-HR_ADMIN; this is the in-page backstop.
  if (!canCompareCampaigns) {
    return (
      <div className="bg-[#F8FAFC] min-h-screen p-6 flex flex-col items-center justify-center">
        <p className="text-sm font-bold text-slate-700">You don't have permission to compare campaigns.</p>
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
        <div>
          <h1 className="text-xl font-bold text-slate-900">Compare Weight Configurations</h1>
          <p className="text-xs text-slate-500 mt-0.5">Select 2–4 campaigns to compare scoring config side-by-side.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-6">
        {loadingList ? (
          <div className="py-8 flex justify-center"><LoadingSpinner text="Loading campaigns..." /></div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto mb-4">
              {campaigns.map((c) => (
                <label
                  key={c.id}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition ${
                    selectedIds.includes(c.id) ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(c.id)}
                    onChange={() => toggleSelect(c.id)}
                    className="accent-indigo-600"
                  />
                  <span className="truncate">{c.name}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-slate-400">{selectedIds.length} / {MAX_SELECT} selected (min {MIN_SELECT})</span>
              <Button variant="primary" size="small" onClick={handleCompare} loading={comparing} loadingText="Comparing...">
                Compare
              </Button>
            </div>
          </>
        )}
      </div>

      {comparison && (
        <>
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto mb-6">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left p-3 font-bold text-slate-400 uppercase text-[10px]">Field</th>
                  {comparison.campaigns.map((c) => (
                    <th key={c.campaign_id} className="text-left p-3 font-bold text-slate-900">{c.campaign_name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FIELD_ROWS.map((row) => {
                  const isConsistent = comparison.consistent_fields?.[row.key];
                  return (
                    <tr key={row.key} className="border-b border-slate-50">
                      <td className="p-3 font-semibold text-slate-500 flex items-center gap-1.5">
                        {row.label}
                        {isConsistent === true && <Check className="h-3 w-3 text-emerald-500" title="Consistent across all" />}
                        {isConsistent === false && <Minus className="h-3 w-3 text-amber-500" title="Differs" />}
                      </td>
                      {comparison.campaigns.map((c) => (
                        <td key={c.campaign_id} className="p-3 font-bold text-slate-800">
                          {c[row.key]}{row.suffix || ""}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                <tr>
                  <td className="p-3 font-semibold text-slate-500">Score Distribution</td>
                  {comparison.campaigns.map((c) => (
                    <td key={c.campaign_id} className="p-3 text-[11px] text-slate-600">
                      {c.score_distribution?.has_processed_candidates ? (
                        <>
                          Avg {c.score_distribution.average_composite_score?.toFixed(1)}% ·
                          Median {c.score_distribution.median_composite_score?.toFixed(1)}%
                        </>
                      ) : (
                        <span className="text-slate-400">{c.score_distribution?.message || "No processed candidates yet"}</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Copy className="h-4 w-4" /> Copy Scoring Configuration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Source Campaign</label>
                <FilterListbox
                  options={comparison.campaigns.map((c) => ({ value: c.campaign_id, label: c.campaign_name }))}
                  value={sourceId}
                  onChange={(v) => { setSourceId(v); setTargetIds([]); }}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Target Campaign(s)</label>
                <div className="space-y-1.5">
                  {targetOptions.map((c) => (
                    <label key={c.campaign_id} className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <input
                        type="checkbox"
                        checked={targetIds.includes(c.campaign_id)}
                        onChange={() => toggleTarget(c.campaign_id)}
                        className="accent-indigo-600"
                      />
                      {c.campaign_name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="primary" size="small" onClick={handleCopy} loading={copying} loadingText="Copying...">
                Copy Configuration
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
