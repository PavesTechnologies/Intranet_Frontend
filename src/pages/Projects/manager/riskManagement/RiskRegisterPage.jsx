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

const TYPE_ICON = {
  All: <LayoutGridIcon className="w-4 h-4" />,
  Stories: <DocumentIcon className="w-4 h-4" />,
  Epics: <BookmarkIcon className="w-4 h-4" />,
  Tasks: <CheckIcon className="w-4 h-4" />,
  Bugs: <AlertIcon className="w-4 h-4" />,
};

export default function RiskRegisterPage({ projectId = "P-123" }) {
  const [showCreateRisk, setShowCreateRisk] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  const [issueTypeSummary, setIssueTypeSummary] = useState([]);

  const [activeIssueType, setActiveIssueType] = useState("All");

  const [issuePage, setIssuePage] = useState(1);

  const [selectedIssue, setSelectedIssue] = useState(null);

  const [selectedRisk, setSelectedRisk] = useState(null);

  // ✅ TOKEN SAFE AXIOS INSTANCE
  const axiosInstance = useMemo(() => {
    const instance = axios.create({
      baseURL: window.__APP_CONFIG__.PMS_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    instance.interceptors.request.use(
      (config) => {
        const latestToken = localStorage.getItem("token");

        if (latestToken) {
          config.headers.Authorization = `Bearer ${latestToken}`;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    return instance;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchSummary() {
      try {
        const res = await axiosInstance.get(
          `/api/risk-links/${projectId}/risk-summary/by-issue-type`
        );

        if (!cancelled) {
          setIssueTypeSummary(res.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch issue summary", err);

        if (!cancelled) {
          setIssueTypeSummary([]);
        }
      }
    }

    fetchSummary();

    return () => {
      cancelled = true;
    };
  }, [projectId, refreshKey, axiosInstance]);

  const issueTypeCards = useMemo(() => {
    const total = issueTypeSummary.reduce(
      (sum, item) => sum + (item.riskCount || 0),
      0
    );

    return [
      {
        issueType: "All",
        riskCount: total,
      },

      ...issueTypeSummary.map((item) => ({
        issueType: item.issueType,
        riskCount: item.riskCount ?? 0,
      })),
    ];
  }, [issueTypeSummary]);

  function issueTypeLabel(raw) {
    const map = {
      story: "Stories",
      epic: "Epics",
      task: "Tasks",
      bug: "Bugs",
    };

    return map[raw?.toLowerCase()] ?? raw;
  }

  return (
    <div
      className="flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100"
      style={{ height: "calc(100vh - 64px)" }}
    >
      {/* ───────────────────────────── */}
      {/* TOP BAR */}
      {/* ───────────────────────────── */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {issueTypeCards.map((item) => {
            const label = issueTypeLabel(item.issueType);

            const active = activeIssueType === label;

            return (
              <button
                key={label}
                onClick={() => {
                  setActiveIssueType(label);

                  setIssuePage(1);

                  setSelectedIssue(null);
                }}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-900 text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span
                  className={active ? "text-white" : "text-slate-500"}
                >
                  {TYPE_ICON[label] ?? (
                    <LayoutGridIcon className="w-4 h-4" />
                  )}
                </span>

                <span>{label}</span>

                <span
                  className={`text-xs ${
                    active ? "text-indigo-200" : "text-slate-400"
                  }`}
                >
                  {item.riskCount} issues
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <Button variant="outline" size="small">
            <FilterIcon className="h-3.5 w-3.5" />
            Filter
          </Button>

          <Button
            variant="primary"
            size="small"
            onClick={() => setShowCreateRisk(true)}
          >
            <AddIcon className="h-3.5 w-3.5" />
            New Risk
          </Button>
        </div>
      </div>

      {/* ───────────────────────────── */}
      {/* BODY */}
      {/* ───────────────────────────── */}
      <div className="flex min-h-0 flex-1 gap-4 p-4">
        {/* LEFT PANEL */}
        <div className="flex min-h-0 w-72 flex-shrink-0 flex-col">
          <IssuesPanel
            projectId={projectId}
            activeIssueType={activeIssueType}
            issuePage={issuePage}
            setIssuePage={setIssuePage}
            selectedIssue={selectedIssue}
            onSelectIssue={(issue) => setSelectedIssue(issue)}
          />
        </div>

        {/* RIGHT PANEL */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <RisksPanel
            projectId={projectId}
            selectedIssue={selectedIssue}
            refreshKey={refreshKey}
            onSelectRisk={(risk) => {
              setSelectedRisk(risk);

              setShowRiskModal(true);
            }}
          />
        </div>
      </div>

      {/* ───────────────────────────── */}
      {/* CREATE MODAL */}
      {/* ───────────────────────────── */}
      <CreateRiskModal
        projectId={projectId}
        isOpen={showCreateRisk}
        onClose={() => setShowCreateRisk(false)}
        onCreate={() => {
          setShowCreateRisk(false);

          setRefreshKey((prev) => prev + 1);
        }}
      />

      {/* ───────────────────────────── */}
      {/* DETAIL MODAL */}
      {/* ───────────────────────────── */}
      <RiskDetailModal
        risk={showRiskModal ? selectedRisk : null}
        selectedIssue={selectedIssue}
        onClose={() => setShowRiskModal(false)}
        projectId={projectId}
        onUpdated={() => setRefreshKey((prev) => prev + 1)}
      />
    </div>
  );
}