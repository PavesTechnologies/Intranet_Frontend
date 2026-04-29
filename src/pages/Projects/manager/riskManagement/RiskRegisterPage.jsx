import React, { useEffect, useMemo, useState } from "react";
import { Plus, LayoutGrid, AlertCircle, ShieldAlert } from "lucide-react";
import axios from "axios";

import CreateRiskModal from "./createRiskModal";
import IssuesPanel from "./IssuesPanel";
import RisksPanel from "./RisksPanel";
import RiskDetailModal from "./RiskDetailModal";

export default function RiskRegisterPage({ projectId = "P-123" }) {
  const RISKS_PAGE_SIZE = 10;

  /* ---------- UI State ---------- */
  const [showCreateRisk, setShowCreateRisk] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  /* ---------- Issue Summary ---------- */
  const [issueTypeSummary, setIssueTypeSummary] = useState([]);
  const [activeIssueType, setActiveIssueType] = useState("All");
  const [issuePage, setIssuePage] = useState(1);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [selectedRisk, setSelectedRisk] = useState(null);

  const [isLoadingIssues] = useState(false);
  const [isLoadingRisks, setIsLoadingRisks] = useState(false);

  /* ---------- Risks ---------- */
  const [riskData, setRiskData] = useState(null);
  const [riskPage, setRiskPage] = useState(1);

  /* =========================
      Logic (Unchanged)
  ========================= */
  useEffect(() => {
    async function fetchSummary() {
      try {
        const token = localStorage.getItem("token");
        const BASE_URL = window.__APP_CONFIG__.PMS_BASE_URL;
        const res = await axios.get(
          `${BASE_URL}/api/risk-links/${projectId}/risk-summary/by-issue-type`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setIssueTypeSummary(res.data || []);
      } catch (err) {
        console.error("Failed to fetch issue summary", err);
      }
    }
    fetchSummary();
  }, [projectId, refreshKey]);

  const issueTypeCards = useMemo(() => {
    const total = issueTypeSummary.reduce((sum, it) => sum + (it.riskCount || 0), 0);
    return [
      { issueType: "All", riskCount: total },
      ...issueTypeSummary.map((it) => ({
        issueType: it.issueType,
        riskCount: it.riskCount ?? 0,
      })),
    ];
  }, [issueTypeSummary]);

  function issueTypeLabel(raw) {
    if (!raw) return raw;
    const lower = raw.toLowerCase();
    if (lower === "story") return "Stories";
    if (lower === "epic") return "Epics";
    if (lower === "task") return "Tasks";
    if (lower === "bug") return "Bugs";
    return raw;
  }

  useEffect(() => {
    let cancelled = false;
    async function loadRisks() {
      setIsLoadingRisks(true);
      try {
        const token = localStorage.getItem("token");
        const BASE_URL = window.__APP_CONFIG__.PMS_BASE_URL;
        const params = {
          projectId,
          page: riskPage,
          size: RISKS_PAGE_SIZE,
          linkedType: null,
          linkedId: null,
        };
        if (selectedIssue) {
          params.linkedType = selectedIssue.linkedType;
          params.linkedId = selectedIssue.linkedId;
        }
        const res = await axios.get(`${BASE_URL}/api/risks/linked`, {
          params,
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) setRiskData(res.data);
      } catch (err) {
        console.error("Failed loading risks", err);
        if (!cancelled) setRiskData(null);
      } finally {
        if (!cancelled) setIsLoadingRisks(false);
      }
    }
    loadRisks();
    return () => (cancelled = true);
  }, [selectedIssue, activeIssueType, riskPage, projectId, refreshKey]);

  /* =========================
      Visual Improvements
  ========================= */
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header Section */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* <div className="bg-indigo-600 p-2 rounded-lg">
              <ShieldAlert className="text-white w-6 h-6" />
            </div> */}
            {/* <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Risk Register
              </h1>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                Project Management • {projectId}
              </p>
            </div> */}
          </div>

          <button
            onClick={() => setShowCreateRisk(true)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow-md flex items-center gap-2 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            New Risk
          </button>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-8 py-8">
        {/* Navigation / Filter Pills */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 text-slate-600">
            <LayoutGrid className="w-4 h-4" />
            <span className="text-sm font-semibold uppercase tracking-widest">Filter by category</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {issueTypeCards.map((t) => {
              const label = issueTypeLabel(t.issueType);
              const active = activeIssueType === label;

              return (
                <button
                  key={label}
                  onClick={() => {
                    setActiveIssueType(label);
                    setIssuePage(1);
                    setRiskPage(1);
                    setSelectedIssue(null);
                    setRiskData(null);
                  }}
                  className={`group relative flex items-center gap-4 px-6 py-3 rounded-2xl transition-all duration-200 border-2 ${
                    active 
                      ? "bg-white border-indigo-600 shadow-lg shadow-indigo-100" 
                      : "bg-white border-transparent hover:border-slate-200 shadow-sm"
                  }`}
                >
                  <div className={`text-sm font-bold ${active ? "text-indigo-600" : "text-slate-600"}`}>
                    {label}
                  </div>
                  <div className={`px-2 py-0.5 rounded-md text-xs font-black ${
                    active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                  }`}>
                    {t.riskCount}
                  </div>
                  {active && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-600 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Panels */}
        <div className="grid grid-cols-12 gap-8">
          {/* Issues Selection List */}
          <div className="col-span-12 lg:col-span-4 xl:col-span-4 h-fit">
             <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                   <h3 className="text-sm font-bold text-slate-700 uppercase tracking-tighter">Issues List</h3>
                   {selectedIssue && (
                     <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold uppercase">Selected</span>
                   )}
                </div>
                <div className="max-h-[600px] overflow-y-auto">
                  <IssuesPanel
                    projectId={projectId}
                    activeIssueType={activeIssueType}
                    issuePage={issuePage}
                    selectedIssue={selectedIssue}
                    isLoadingIssues={isLoadingIssues}
                    onSelectIssue={(issue) => {
                      setSelectedIssue(issue);
                      setRiskPage(1);
                      setRiskData(null);
                    }}
                  />
                </div>
             </div>
          </div>

          {/* Risks Details List */}
          <div className="col-span-12 lg:col-span-8 xl:col-span-8 h-fit">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                   <AlertCircle className="w-4 h-4 text-slate-500" />
                   <h3 className="text-sm font-bold text-slate-700 uppercase tracking-tighter">
                     {selectedIssue ? `Risks linked to ${selectedIssue.linkedId}` : "All Risks"}
                   </h3>
                </div>
                <div className="p-2">
                  <RisksPanel
                    selectedIssue={selectedIssue}
                    data={riskData}
                    isLoadingRisks={isLoadingRisks}
                    onPageChange={setRiskPage}
                    onSelectRisk={(risk) => {
                      setSelectedRisk(risk);
                      setShowRiskModal(true);
                    }}
                  />
                </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <CreateRiskModal
        projectId={projectId}
        isOpen={showCreateRisk}
        onClose={() => setShowCreateRisk(false)}
        onCreate={() => {
          setShowCreateRisk(false);
          setRiskPage(1);
          setRefreshKey((prev) => prev + 1);
        }}
      />

      <RiskDetailModal
        risk={showRiskModal ? selectedRisk : null}
        onClose={() => setShowRiskModal(false)}
        projectId={projectId}
      />
    </div>
  );
}