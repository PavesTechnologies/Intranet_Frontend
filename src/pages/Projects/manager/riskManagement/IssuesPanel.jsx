import React, { useEffect, useRef, useState } from "react";
import { AlertIcon } from "../../../../components/icons";
import axios from "axios";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import Pagination from "../../../../components/Pagination/pagination";
import SearchInput from "../../../../components/filter/Searchbar";

// UI label → Backend enum
const ISSUE_TYPE_MAP = {
  Epics: "Epic",
  Stories: "Story",
  Tasks: "Task",
  Bugs: "Bug",
};

// Status color helper
const getStatusColor = (status) => {
  switch (status) {
    case "To Do":
      return "bg-slate-100 text-slate-700";
    case "In Progress":
      return "bg-blue-100 text-blue-700";
    case "Done":
      return "bg-green-100 text-green-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

export default function IssuesPanel({
  projectId,
  activeIssueType,
  issuePage,
  setIssuePage,
  onSelectIssue,
  selectedIssue,
}) {
  const [issueSearch, setIssueSearch] = useState("");
  const [issuesPageItems, setIssuesPageItems] = useState([]);
  const [issuesTotal, setIssuesTotal] = useState(0);
  const [isLoadingIssues, setIsLoadingIssues] = useState(false);

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(issuesTotal / PAGE_SIZE));

  const lastFetchKey = useRef("");

  useEffect(() => {
    let cancelled = false;

    async function fetchIssues() {
      const paramsKey = JSON.stringify({
        projectId,
        activeIssueType,
        issuePage,
        issueSearch,
      });

      if (lastFetchKey.current === paramsKey) return;
      lastFetchKey.current = paramsKey;

      setIsLoadingIssues(true);

      try {
        const token = localStorage.getItem("token");
        const BASE_URL = window.__APP_CONFIG__.PMS_BASE_URL;

        const params = {
          page: issuePage - 1,
          size: PAGE_SIZE,
        };

        if (activeIssueType !== "All") {
          params.issueType = ISSUE_TYPE_MAP[activeIssueType];
        }

        if (issueSearch?.trim()) {
          params.search = issueSearch.trim();
        }

        const res = await axios.get(
          `${BASE_URL}/api/projects/${projectId}/risks/issues`,
          {
            headers: { Authorization: `Bearer ${token}` },
            params,
          },
        );

        if (cancelled) return;

        // ✅ Ensure only unique issues by linkedType + linkedId
        const uniqueIssues = Array.from(
          new Map(
            res.data.content.map((i) => [`${i.linkedType}-${i.linkedId}`, i]),
          ).values(),
        );

        setIssuesPageItems(uniqueIssues);
        setIssuesTotal(res.data.totalElements ?? uniqueIssues.length);
      } catch (e) {
        console.error("Failed to load issues", e);
        if (!cancelled) {
          setIssuesPageItems([]);
          setIssuesTotal(0);
        }
      } finally {
        if (!cancelled) setIsLoadingIssues(false);
      }
    }

    fetchIssues();
    return () => {
      cancelled = true;
    };
  }, [projectId, activeIssueType, issuePage, issueSearch]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="p-5 border-b bg-gradient-to-r from-indigo-50 to-blue-50">
        <h2 className="font-semibold text-slate-900 mb-3">
          {activeIssueType} Issues
        </h2>
        <SearchInput
          value={issueSearch}
          onSearch={(val) => {
            setIssueSearch(val);
            setIssuePage(1);
          }}
          placeholder={`Search ${activeIssueType}...`}
        />
      </div>

      {/* Selected Issue */}
      {selectedIssue && (
        <div className="p-4 bg-indigo-50 border-b-2 border-indigo-200 sticky top-0 z-10">
          <div className="flex justify-between">
            <div>
              <div className="text-xs font-semibold text-indigo-600 mb-1">
                SELECTED
              </div>
              <div className="font-semibold text-sm">
                {selectedIssue.linkedType}-{selectedIssue.linkedId}
              </div>
              <div className="text-xs text-slate-600 line-clamp-1">
                {selectedIssue.title}
              </div>
            </div>
            <button
              onClick={() => onSelectIssue(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Issues List */}
      <div className="flex-1 overflow-y-auto">
        {isLoadingIssues ? (
          <LoadingSpinner size="md" text="Loading issues…" />
        ) : issuesPageItems.length === 0 ? (
          <div className="p-6 text-center text-slate-500">
            <AlertIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No issues found</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {issuesPageItems.map((issue) => {
              const isSelected =
                selectedIssue?.linkedType === issue.linkedType &&
                selectedIssue?.linkedId === issue.linkedId;

              return (
                <button
                  key={`${issue.linkedType}-${issue.linkedId}`}
                  onClick={() => onSelectIssue(issue)}
                  className={`w-full text-left p-3 rounded-lg transition ${
                    isSelected
                      ? "bg-indigo-100 border-2 border-indigo-400"
                      : "hover:bg-slate-50 border border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm text-slate-900">
                        {issue.linkedType}-{issue.linkedId}
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2 mt-1">
                        {issue.title}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={`text-xs px-2 py-1 rounded ${getStatusColor(
                            issue.issueStatus,
                          )}`}
                        >
                          {issue.issueStatus}
                        </span>
                        {issue.riskCount > 0 && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-semibold">
                            {issue.riskCount} risks
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="border-t border-slate-200">
        <Pagination
          currentPage={issuePage}
          totalPages={totalPages}
          onPrevious={() => setIssuePage((p) => p - 1)}
          onNext={() => setIssuePage((p) => p + 1)}
        />
      </div>
    </div>
  );
}
