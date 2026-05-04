import React, { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import axios from "axios";

import CreateRiskModal from "./createRiskModal";
import IssuesPanel from "./IssuesPanel";
import RisksPanel from "./RisksPanel";
import RiskDetailModal from "./RiskDetailModal";

/* =========================
   Page
========================= */

export default function RiskRegisterPage({ projectId = "P-123" }) {
  const RISKS_PAGE_SIZE = 10;

  /* ---------- UI State ---------- */

  const [showCreateRisk, setShowCreateRisk] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);

  /* ---------- Refresh Trigger ---------- */

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
     Fetch Issue-Type Summary
  ========================= */

  useEffect(() => {
    async function fetchSummary() {
      try {
        const token = localStorage.getItem("token");
        const BASE_URL = window.__APP_CONFIG__.PMS_BASE_URL;

        const res = await axios.get(
          `${BASE_URL}/api/risk-links/${projectId}/risk-summary/by-issue-type`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        setIssueTypeSummary(res.data || []);
      } catch (err) {
        console.error("Failed to fetch issue summary", err);
      }
    }

    fetchSummary();
  }, [projectId, refreshKey]);

  /* =========================
     Issue Type Cards
  ========================= */

  const issueTypeCards = useMemo(() => {
    const total = issueTypeSummary.reduce(
      (sum, it) => sum + (it.riskCount || 0),
      0,
    );

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

  /* =========================
     Load Risks
  ========================= */

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
    return () => {
      cancelled = true;
    };
  }, [selectedIssue, activeIssueType, riskPage, projectId, refreshKey]);

  /* =========================
     Render
  ========================= */

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between">
        <h1 className="text-3xl font-bold">Risk Management</h1>

        <button
          onClick={() => setShowCreateRisk(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Risk
        </button>

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
      </div>

      {/* Issue Type Cards */}
      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-5 gap-4">
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
              className={`p-4 rounded-lg ${
                active ? "bg-indigo-600 text-white" : "bg-white border"
              }`}
            >
              <div className="font-semibold">{label}</div>
              <div className="text-xs opacity-80">{t.riskCount} items</div>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-3 gap-6">
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