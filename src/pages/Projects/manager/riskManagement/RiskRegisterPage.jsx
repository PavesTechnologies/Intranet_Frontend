import React, { useEffect, useMemo, useState } from "react";
import {
  AddIcon,
  FilterIcon,
  LayoutGridIcon,
  BookmarkIcon,
  DocumentIcon,
  CheckIcon,
  AlertIcon,
} from "../../../../components/icons";
import axios from "axios";
import Button from "../../../../components/Button/Button";

import CreateRiskModal from "./createRiskModal";
import IssuesPanel from "./IssuesPanel";
import RisksPanel from "./RisksPanel";
import RiskDetailModal from "./RiskDetailModal";

/* ── Icon per issue type ── */
const TYPE_ICON = {
  All:     <LayoutGridIcon className="w-4 h-4" />,
  Stories: <DocumentIcon   className="w-4 h-4" />,
  Epics:   <BookmarkIcon   className="w-4 h-4" />,
  Tasks:   <CheckIcon      className="w-4 h-4" />,
  Bugs:    <AlertIcon      className="w-4 h-4" />,
};

export default function RiskRegisterPage({ projectId = "P-123" }) {
  const RISKS_PAGE_SIZE = 10;

  const [showCreateRisk, setShowCreateRisk]   = useState(false);
  const [showRiskModal,  setShowRiskModal]    = useState(false);
  const [refreshKey,     setRefreshKey]       = useState(0);

  const [issueTypeSummary,    setIssueTypeSummary]    = useState([]);
  const [activeIssueType,     setActiveIssueType]     = useState("All");
  const [issuePage,           setIssuePage]           = useState(1);
  const [selectedIssue,       setSelectedIssue]       = useState(null);
  const [selectedRisk,        setSelectedRisk]        = useState(null);
  const [isLoadingRisks,      setIsLoadingRisks]      = useState(false);
  const [riskData,            setRiskData]            = useState(null);
  const [riskPage,            setRiskPage]            = useState(1);

  /* ── Fetch issue-type summary ── */
  useEffect(() => {
    async function fetchSummary() {
      try {
        const token    = localStorage.getItem("token");
        const BASE_URL = window.__APP_CONFIG__.PMS_BASE_URL;
        const res = await axios.get(
          `${BASE_URL}/api/risk-links/${projectId}/risk-summary/by-issue-type`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setIssueTypeSummary(res.data || []);
      } catch (err) {
        console.error("Failed to fetch issue summary", err);
      }
    }
    fetchSummary();
  }, [projectId, refreshKey]);

  /* ── Issue-type tabs ── */
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
    if (lower === "epic")  return "Epics";
    if (lower === "task")  return "Tasks";
    if (lower === "bug")   return "Bugs";
    return raw;
  }

  /* ── Load risks ── */
  useEffect(() => {
    let cancelled = false;

    async function loadRisks() {
      setIsLoadingRisks(true);
      try {
        const token    = localStorage.getItem("token");
        const BASE_URL = window.__APP_CONFIG__.PMS_BASE_URL;

        const params = {
          projectId,
          page: riskPage,
          size: RISKS_PAGE_SIZE,
          linkedType: null,
          linkedId:   null,
        };
        if (selectedIssue) {
          params.linkedType = selectedIssue.linkedType;
          params.linkedId   = selectedIssue.linkedId;
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
    return () => { cancelled = true; };
  }, [selectedIssue, activeIssueType, riskPage, projectId, refreshKey]);

  /* ── Render ── */
  return (
    <div className="flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden"
      style={{ height: "calc(100vh - 64px)" }}
    >
      {/* ── Top tab bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200 flex-shrink-0">
        {/* Issue-type tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {issueTypeCards.map((t) => {
            const label  = issueTypeLabel(t.issueType);
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
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-900 text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className={active ? "text-white" : "text-slate-500"}>
                  {TYPE_ICON[label] ?? <LayoutGridIcon className="w-4 h-4" />}
                </span>
                <span>{label}</span>
                <span className={`text-xs ${active ? "text-indigo-200" : "text-slate-400"}`}>
                  {t.riskCount} issues
                </span>
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="small">
            <FilterIcon className="w-3.5 h-3.5" /> Filter
          </Button>
          <Button variant="primary" size="small" onClick={() => setShowCreateRisk(true)}>
            <AddIcon className="w-3.5 h-3.5" /> New Risk
          </Button>
        </div>
      </div>

      {/* ── Main 2-column content ── */}
      <div className="flex flex-1 min-h-0 gap-4 p-4">
        {/* Left: Issues panel */}
        <div className="w-72 flex-shrink-0 flex flex-col min-h-0">
          <IssuesPanel
            projectId={projectId}
            activeIssueType={activeIssueType}
            issuePage={issuePage}
            setIssuePage={setIssuePage}
            selectedIssue={selectedIssue}
            onSelectIssue={(issue) => {
              setSelectedIssue(issue);
              setRiskPage(1);
              setRiskData(null);
            }}
          />
        </div>

        {/* Right: Risks panel */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
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

      {/* ── Modals ── */}
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
        selectedIssue={selectedIssue}
        onClose={() => setShowRiskModal(false)}
        projectId={projectId}
        onUpdated={() => {
          setRefreshKey((prev) => prev + 1);
          setRiskPage(1);
        }}
      />
    </div>
  );
}
