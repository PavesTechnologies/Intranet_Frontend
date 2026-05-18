import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import FilterListbox from "../../../../components/filter/FilterListbox";
import {
  createBug,
  updateBugStatus,
  listBugs,
  bugSummaries,
} from "../api/bugApi";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import Pagination from "../../../../components/Pagination/pagination";
import Button from "../../../../components/Button/Button";
import axios from "axios";
import Select from "react-select";
import { showStatusToast } from "../../../../components/toastfy/toast";
import Modal from "../../../../components/Modal/modal";

import {jwtDecode} from "jwt-decode";

const token = localStorage.getItem("token");

let canCreateTestPlan = false;

if (token) {
  const decoded = jwtDecode(token);

  const roles = decoded?.roles || [];

  canCreateTestPlan =
    roles.includes("Tester") ||
    roles.includes("Project_Manager");
}
const severityColors = {
  LOW:      "bg-emerald-50 text-emerald-700",
  MEDIUM:   "bg-amber-50 text-amber-700",
  HIGH:     "bg-orange-50 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

const priorityColors = {
  NORMAL: "bg-slate-100 text-slate-700",
  HIGH:   "bg-orange-50 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

const selectStyles = {
  control: (base) => ({
    ...base,
    minHeight: "32px",
    height: "32px",
    fontSize: "13px",
    borderRadius: "0.5rem",
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    boxShadow: "none",
    "&:hover": { borderColor: "#94a3b8" },
  }),
  menu: (base) => ({ ...base, width: "180px", zIndex: 9999, position: "absolute" }),
  menuList: (base) => ({ ...base, maxHeight: "160px" }),
};

const STATUS_OPTIONS = [
  { value: "NEW",               label: "New" },
  { value: "IN_PROGRESS",       label: "In Progress" },
  { value: "READY_FOR_RETEST",  label: "Ready For Retest" },
  { value: "REOPENED",          label: "Reopened" },
  { value: "CLOSED",            label: "Closed" },
];

const BugPage = () => {
  const { projectId } = useParams();
  const [bugs, setBugs] = useState([]);
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [selectedBug, setSelectedBug] = useState(null);
  const [bugDetails, setBugDetails] = useState(null);
  const [loadingBugDetails, setLoadingBugDetails] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);

  const [form, setForm] = useState({
    runCaseId: "",
    runCaseStepId: "",
    title: "",
    description: "",
    expected: "",
    actual: "",
    reproductionSteps: "",
    severity: "MEDIUM",
    priority: "NORMAL",
    assignedTo: "",
  });

  const fetchBugs = async () => {
    try {
      setLoading(true);
      const res = await listBugs(projectId, page, size);
      setBugs(res.data.content);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error("Failed to load bugs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBugs(); }, [projectId, page]);

  const loadEmployees = async () => {
    try {
      const res = await axios.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/members-with-owner`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
      );
      setEmployees(res.data);
    } catch (err) {
      console.error("Error loading employees:", err);
    }
  };

  useEffect(() => { loadEmployees(); }, []);

  const employeeOptions = employees.map((e) => ({ value: e.id, label: e.name }));

  const openBugDetails = async (bugId) => {
    setSelectedBug(bugId);
    setLoadingBugDetails(true);
    setBugDetails(null);
    try {
      const res = await axios.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/testing/bugs/${bugId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
      );
      setBugDetails(res.data);
    } catch (err) {
      console.error("Failed to load bug details", err);
    } finally {
      setLoadingBugDetails(false);
    }
  };

  const handleCreateBug = async () => {
    try {
      const payload = {
        ...form,
        runCaseId: Number(form.runCaseId),
        runCaseStepId: form.runCaseStepId ? Number(form.runCaseStepId) : null,
        assignedTo: form.assignedTo ? Number(form.assignedTo) : null,
      };
      await createBug(payload);
      setShowModal(false);
      fetchBugs();
    } catch (e) {
      console.error("Error creating bug", e);
    }
  };

  const addAssignee = async (bugId, userId) => {
    setAssignLoading(true);
    try {
      await axios.put(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/testing/bugs/${bugId}/assign`,
        { assigneeId: userId },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
      );
      showStatusToast("Assignee added successfully", "success");
    } catch (err) {
      showStatusToast("Failed to add assignee", "error");
      console.error("Error adding assignee:", err);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleStatusChange = async (bugId, status) => {
    try {
      await updateBugStatus(bugId, { status });
      fetchBugs();
    } catch (e) {
      console.error("Status update failed", e);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 flex-shrink-0">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Bug Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">Track and resolve bugs reported during test execution.</p>
        </div>
      </div>

      {/* Table area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-5 py-3 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-blue-50 flex-shrink-0">
            <h2 className="font-semibold text-slate-900 text-sm">Bug Registry</h2>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  {["Title", "Priority", "Severity", "Raised By", "Status", "Assigned To", "Details"].map((col) => (
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
                    <td colSpan={7} className="px-4 py-8 text-center">
                      <LoadingSpinner text="Loading bugs..." />
                    </td>
                  </tr>
                ) : bugs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm">
                      No bugs found.
                    </td>
                  </tr>
                ) : (
                  bugs.map((bug) => (
                    <tr key={bug.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800 max-w-xs truncate">
                        {bug.title}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${priorityColors[bug.priority] || "bg-slate-100 text-slate-600"}`}>
                          {bug.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${severityColors[bug.severity] || "bg-slate-100 text-slate-600"}`}>
                          {bug.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                        {employees.find((e) => e.id === bug.reporterId)?.name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {canCreateTestPlan ? (
                          <FilterListbox
                            options={STATUS_OPTIONS}
                            value={bug.status}
                            onChange={(val) => handleStatusChange(bug.id, val)}
                          />
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded font-medium bg-slate-100 text-slate-700">
                            {bug.status}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {canCreateTestPlan ? (
                          <Select
                            styles={selectStyles}
                            options={employeeOptions}
                            placeholder="Assign..."
                            isSearchable
                            onChange={(selected) => addAssignee(bug.id, selected.value)}
                            value={employeeOptions.find((o) => o.value === bug.assignedTo) || null}
                            isDisabled={assignLoading}
                            menuPortalTarget={document.body}
                          />
                        ) : (
                          <span className="text-sm text-slate-700">
                            {employeeOptions.find((o) => o.value === bug.assignedTo)?.label || "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openBugDetails(bug.id)}
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

          <div className="border-t border-slate-200 flex-shrink-0">
            <Pagination
              currentPage={page + 1}
              totalPages={totalPages}
              onPrevious={() => setPage((p) => Math.max(p - 1, 0))}
              onNext={() => setPage((p) => p + 1)}
            />
          </div>
        </div>
      </div>

      {/* Create Bug Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create Bug"
        size="2xl"
      >
        <div className="grid grid-cols-2 gap-4">
          {["runCaseId", "runCaseStepId", "title", "description", "expected", "actual", "reproductionSteps", "assignedTo"].map((field) => (
            <div className="col-span-2" key={field}>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                {field.replace(/([A-Z])/g, " $1")}
              </label>
              <input
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Severity</label>
            <FilterListbox
              options={[{value:"LOW",label:"LOW"},{value:"MEDIUM",label:"MEDIUM"},{value:"HIGH",label:"HIGH"},{value:"CRITICAL",label:"CRITICAL"}]}
              value={form.severity}
              onChange={(val) => setForm({ ...form, severity: val })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Priority</label>
            <FilterListbox
              options={[{value:"NORMAL",label:"NORMAL"},{value:"HIGH",label:"HIGH"},{value:"URGENT",label:"URGENT"}]}
              value={form.priority}
              onChange={(val) => setForm({ ...form, priority: val })}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" size="small" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button variant="primary" size="small" onClick={handleCreateBug}>Create Bug</Button>
        </div>
      </Modal>

      {/* Bug Detail Modal */}
      <Modal
        isOpen={!!selectedBug}
        onClose={() => { setSelectedBug(null); setBugDetails(null); }}
        title="Bug Details"
        subtitle="Full context, links and reproduction steps"
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
        {loadingBugDetails && (
          <div className="py-10 text-center">
            <LoadingSpinner text="Loading Bug Details..." />
          </div>
        )}

        {!loadingBugDetails && bugDetails && (
          <div className="space-y-5 text-sm text-slate-800">
            {/* Primary info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Title</span>
                <div className="rounded-lg bg-slate-50 px-3 py-2 font-semibold text-slate-900 border border-slate-100">
                  {bugDetails.title}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700`}>
                    {bugDetails.status}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Severity</span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${severityColors[bugDetails.severity] || "bg-slate-100 text-slate-700"}`}>
                    {bugDetails.severity}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Priority</span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${priorityColors[bugDetails.priority] || "bg-slate-100 text-slate-700"}`}>
                    {bugDetails.priority}
                  </span>
                </div>
              </div>
            </div>

            {/* Long text */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                {[["Description", bugDetails.description], ["Expected Result", bugDetails.expectedResult]].map(([label, val]) => (
                  <div key={label}>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
                    <div className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-slate-700 border border-slate-100">{val || "—"}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {[["Actual Result", bugDetails.actualResult], ["Reproduction Steps", bugDetails.reproductionSteps]].map(([label, val]) => (
                  <div key={label}>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
                    <div className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-slate-700 whitespace-pre-line border border-slate-100">{val || "—"}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Linked items */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Linked Items</h4>
              <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 text-xs">
                {[
                  ["Story",         bugDetails.testStory?.title],
                  ["Scenario",      bugDetails.testScenario?.title],
                  ["Test Case",     bugDetails.testCase?.title],
                  ["Run Case",      bugDetails.runCase?.title],
                  ["Run Case Step", bugDetails.runCaseStep?.stepDescription],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
                    <p className="mt-1 font-medium text-slate-800">{value || "—"}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BugPage;
