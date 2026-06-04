import React, { useEffect, useState } from "react";
import api from "../../../../api/axiosInstance";
import { useParams } from "react-router-dom";
import { getBugsByAssignee, updateBugStatus } from "../api/bugApi";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import StatCard from "../../../../components/Cards/StatCard";
import Button from "../../../../components/Button/Button";
import FilterListbox from "../../../../components/filter/FilterListbox";
import Modal from "../../../../components/Modal/modal";
import { showStatusToast } from "../../../../components/toastfy/toast";

const STATUS_OPTIONS = [
  { value: "NEW",              label: "New" },
  { value: "IN_PROGRESS",     label: "In Progress" },
  { value: "READY_FOR_RETEST",label: "Ready For Retest" },
  { value: "REOPENED",        label: "Reopened" },
  { value: "CLOSED",          label: "Closed" },
];

const STATUS_COLORS = {
  NEW:               "bg-blue-50 text-blue-700 border border-blue-200",
  IN_PROGRESS:       "bg-amber-50 text-amber-700 border border-amber-200",
  READY_FOR_RETEST:  "bg-purple-50 text-purple-700 border border-purple-200",
  REOPENED:          "bg-orange-50 text-orange-700 border border-orange-200",
  CLOSED:            "bg-emerald-50 text-emerald-700 border border-emerald-200",
};

const SEVERITY_COLORS = {
  MINOR:    "bg-emerald-50 text-emerald-700",
  MAJOR:    "bg-amber-50 text-amber-700",
  CRITICAL: "bg-red-100 text-red-700",
  BLOCKER:  "bg-rose-200 text-rose-800",
};

const PRIORITY_COLORS = {
  LOW:      "bg-slate-100 text-slate-700",
  MEDIUM:   "bg-amber-50 text-amber-700",
  HIGH:     "bg-orange-50 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

const getLoggedInUserId = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.user_id;
  } catch {
    return null;
  }
};

export default function DevDashboard() {
  const { projectId } = useParams();
  const userId = getLoggedInUserId();

  const [bugs, setBugs]               = useState([]);
  const [loading, setLoading]         = useState(false);
  const [selectedBug, setSelectedBug] = useState(null);
  const [bugDetails, setBugDetails]   = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [employeeMap, setEmployeeMap] = useState({});

  const fetchBugs = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const res = await getBugsByAssignee(userId);
      setBugs(res.data || []);
    } catch (err) {
      console.error("Failed to load assigned bugs:", err);
      showStatusToast("Failed to load your bugs", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBugs(); }, [userId]);

  useEffect(() => {
    if (!projectId) return;
    api
      .get(`${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/members-with-owner`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => {
        const map = {};
        (res.data || []).forEach((m) => { map[m.id] = m.name; });
        setEmployeeMap(map);
      })
      .catch((err) => console.error("Failed to load members:", err));
  }, [projectId]);

  const handleStatusChange = async (bugId, status) => {
    try {
      await updateBugStatus(bugId, { status });
      setBugs((prev) => prev.map((b) => b.id === bugId ? { ...b, status } : b));
      showStatusToast("Status updated successfully", "success");
    } catch (err) {
      console.error("Status update failed:", err);
      showStatusToast("Failed to update status", "error");
    }
  };

  const openDetails = async (bug) => {
    setSelectedBug(bug);
    setLoadingDetails(true);
    setBugDetails(null);
    try {
      const res = await api.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/testing/bugs/${bug.id}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
      );
      setBugDetails(res.data);
    } catch (err) {
      console.error("Failed to load bug details:", err);
      showStatusToast("Failed to load bug details", "error");
    } finally {
      setLoadingDetails(false);
    }
  };

  // Stat counts
  const counts = bugs.reduce((acc, bug) => {
    acc[bug.status] = (acc[bug.status] || 0) + 1;
    return acc;
  }, {});

  const stats = [
    { title: "Total Assigned",    value: bugs.length,                   textColor: "text-slate-800" },
    { title: "New",               value: counts.NEW || 0,               textColor: "text-blue-600" },
    { title: "In Progress",       value: counts.IN_PROGRESS || 0,       textColor: "text-amber-600" },
    { title: "Ready for Retest",  value: counts.READY_FOR_RETEST || 0,  textColor: "text-purple-600" },
    { title: "Reopened",          value: counts.REOPENED || 0,          textColor: "text-orange-600" },
    { title: "Closed",            value: counts.CLOSED || 0,            textColor: "text-emerald-600" },
  ];

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Page Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 flex-shrink-0">
        <div>
          <h1 className="text-base font-semibold text-slate-900">My Bug Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Bugs assigned to you — update the status as you resolve them.
          </p>
        </div>
        <Button variant="outline" size="small" onClick={fetchBugs}>
          Refresh
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map((s) => (
            <StatCard
              key={s.title}
              title={s.title}
              value={s.value}
              textColor={s.textColor}
            />
          ))}
        </div>

        {/* Bug Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-5 py-3 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-blue-50 flex-shrink-0">
            <h2 className="font-semibold text-slate-900 text-sm">Assigned Bugs</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  {["#", "Title", "Type", "Priority", "Severity", "Current Status", "Update Status", "Last Updated", "Details"].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center">
                      <LoadingSpinner text="Loading your bugs..." />
                    </td>
                  </tr>
                ) : bugs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <span className="text-3xl">🎉</span>
                        <p className="text-sm font-medium">No bugs assigned to you!</p>
                        <p className="text-xs">You're all clear.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  bugs.map((bug) => (
                    <tr key={bug.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                        #{bug.id}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800 max-w-[220px] truncate">
                        {bug.title}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          {bug.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${PRIORITY_COLORS[bug.priority] || "bg-slate-100 text-slate-600"}`}>
                          {bug.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${SEVERITY_COLORS[bug.severity] || "bg-slate-100 text-slate-600"}`}>
                          {bug.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_COLORS[bug.status] || "bg-slate-100 text-slate-600"}`}>
                          {bug.status?.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 min-w-[190px]">
                        <FilterListbox
                          options={STATUS_OPTIONS}
                          value={bug.status}
                          onChange={(val) => handleStatusChange(bug.id, val)}
                        />
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {new Date(bug.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openDetails(bug)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bug Detail Modal */}
      <Modal
        isOpen={!!selectedBug}
        onClose={() => { setSelectedBug(null); setBugDetails(null); }}
        title={selectedBug?.title || "Bug Details"}
        subtitle="Full context, reproduction steps and status update"
        size="3xl"
        maxHeight="max-h-[88vh]"
        footer={
          <div className="flex justify-end w-full">
            <Button
              variant="primary"
              size="small"
              onClick={() => { setSelectedBug(null); setBugDetails(null); }}
            >
              Close
            </Button>
          </div>
        }
      >
        {loadingDetails && (
          <div className="py-10 text-center">
            <LoadingSpinner text="Loading details..." />
          </div>
        )}

        {!loadingDetails && bugDetails && (
          <div className="space-y-5 text-sm text-slate-800">
            {/* Badges row */}
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[bugDetails.status] || "bg-slate-100"}`}>
                {bugDetails.status?.replace(/_/g, " ")}
              </span>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${SEVERITY_COLORS[bugDetails.severity] || "bg-slate-100"}`}>
                {bugDetails.severity}
              </span>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${PRIORITY_COLORS[bugDetails.priority] || "bg-slate-100"}`}>
                {bugDetails.priority}
              </span>
              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-600">
                {bugDetails.type}
              </span>
            </div>

            {/* Description / expected / actual / repro */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                {[
                  ["Description",     bugDetails.description],
                  ["Expected Result", bugDetails.expectedResult],
                ].map(([label, val]) => (
                  <div key={label}>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
                    <div className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-slate-700 border border-slate-100">
                      {val || "—"}
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {[
                  ["Actual Result",      bugDetails.actualResult],
                  ["Reproduction Steps", bugDetails.reproductionSteps],
                ].map(([label, val]) => (
                  <div key={label}>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
                    <div className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-slate-700 whitespace-pre-line border border-slate-100">
                      {val || "—"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Update Status in modal */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-indigo-600 mb-3">
                Update Status
              </h4>
              <div className="flex items-center gap-3">
                <FilterListbox
                  options={STATUS_OPTIONS}
                  value={bugDetails.status}
                  onChange={async (val) => {
                    await handleStatusChange(bugDetails.id, val);
                    setBugDetails((prev) => ({ ...prev, status: val }));
                  }}
                />
                <span className="text-xs text-slate-500">
                  Set to <strong>Ready For Retest</strong> once you have fixed the bug.
                </span>
              </div>
            </div>

            {/* Linked items */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
                Linked Context
              </h4>
              <div className="grid gap-3 grid-cols-2 md:grid-cols-3 text-xs">
                {[
                  ["Test Story",   bugDetails.testStory?.title    || selectedBug?.testStoryId    || "—"],
                  ["Test Scenario",bugDetails.testScenario?.title || selectedBug?.testScenarioId || "—"],
                  ["Test Case",    bugDetails.testCase?.title     || selectedBug?.testCaseId     || "—"],
                  ["Test Run",     bugDetails.run?.name           || selectedBug?.runId          || "—"],
                  ["Reported By",  employeeMap[bugDetails.reporterId] || bugDetails.reporterId   || "—"],
                  ["Assigned To",  employeeMap[bugDetails.assignedTo] || bugDetails.assignedTo   || "—"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
                    <p className="mt-1 font-medium text-slate-800">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
