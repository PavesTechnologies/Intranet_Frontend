import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  createBug,
  updateBugStatus,
  listBugs,
  bugSummaries,
} from "../api/bugApi";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import axios from "axios";
import Select from "react-select";
import { toast } from "react-toastify";

const BugPage = () => {
  const { projectId } = useParams();
  const [bugs, setBugs] = useState([]);
  const [summaries, setSummaries] = useState([]);
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

  // Fetch Bugs
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

  // Fetch Summaries
  const fetchSummaries = async () => {
    try {
      const res = await bugSummaries(projectId);
      setSummaries(res.data);
    } catch (err) {
      console.error("Failed to load summaries", err);
    }
  };

  useEffect(() => {
    fetchBugs();
    fetchSummaries();
  }, [projectId, page]);

  const loadEmployees = async () => {
    try {
      const res = await axios.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/members-with-owner`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      setEmployees(res.data);
      console.log("Loaded employees:", res);
    } catch (err) {
      console.error("Error loading employees:", err);
    }
  };

  const openBugDetails = async (bugId) => {
    setSelectedBug(bugId);
    setLoadingBugDetails(true);
    setBugDetails(null);

    try {
      const res = await axios.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/testing/bugs/${bugId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      setBugDetails(res.data);
    } catch (err) {
      console.error("Failed to load bug details", err);
    } finally {
      setLoadingBugDetails(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const options = employees.map((option) => ({
    value: option.user_id,
    label: option.name,
  }));

  // Create Bug Handler
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
      const res = await axios.put(
        `${
          window.__APP_CONFIG__.PMS_BASE_URL
        }/api/testing/bugs/${bugId}/assign`,
        {
          assigneeId: userId,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      toast.success("Assignee added successfully");
      // fetchBugs();
    } catch (err) {
      toast.error("Failed to add assignee");
      console.error("Error adding assignee:", err);
    } finally {
      setAssignLoading(false);
    }
  };

  const customStyles = {
    control: (base) => ({
      ...base,
      minHeight: "32px",
      height: "32px",
      fontSize: "14px",
      width: "180px",
    }),
    menu: (base) => ({
      ...base,
      width: "180px",
      zIndex: 9999,
      position: "absolute",
    }),
    menuList: (base) => ({
      ...base,
      maxHeight: "160px", // controls dropdown height
    }),
  };

  // Update Status Handler
  const handleStatusChange = async (bugId, status) => {
    try {
      await updateBugStatus(bugId, { status });
      fetchBugs();
    } catch (e) {
      console.error("Status update failed", e);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Bug Management</h2>
        {/* <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
        >
          + Create Bug
        </button> */}
      </div>

      {/* Summary Cards */}
      {/* <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {summaries.map((s) => (
          <div key={s.id} className="p-4 bg-white shadow rounded-lg border">
            <div className="font-semibold">{s.title}</div>
            <div className="text-gray-500">{s.status.label}</div>
            <div className="text-sm">Priority: {s.priority}</div>
          </div>
        ))}
      </div> */}

      {/* Bug List Table */}
      <div className="bg-white shadow border rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-center text-sm font-semibold">
                Title
              </th>
              <th className="px-4 py-2 text-center text-sm font-semibold">
                Priority
              </th>
              <th className="px-4 py-2 text-center text-sm font-semibold">
                Status
              </th>
              <th className="px-4 py-2 text-center text-sm font-semibold">
                Assigned To
              </th>
              <th className="px-4 py-2 text-center text-sm font-semibold">
                Details
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-4 text-center" colSpan={5}>
                  <LoadingSpinner text="Loading..." />
                </td>
              </tr>
            ) : bugs.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-4 text-center text-gray-500 italic font-semibold"
                >
                  No bugs found.
                </td>
              </tr>
            ) : (
              bugs.map((bug) => (
                <tr key={bug.id} className="border-b">
                  <td className="px-4 py-2 text-center">{bug.title}</td>
                  <td className="px-4 py-2 text-center">{bug.priority}</td>

                  {/* Status Dropdown */}
                  <td className="px-4 py-2 text-center">
                    <select
                      className="border px-2 py-1 rounded"
                      value={bug.status}
                      onChange={(e) =>
                        handleStatusChange(bug.id, e.target.value)
                      }
                    >
                      <option value="NEW">New</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="READY_FOR_RETEST">Ready For Retest</option>
                      <option value="REOPENED">Reopened</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </td>

                  <td className="px-4 py-2 text-center">
                    <Select
                      styles={customStyles}
                      options={options}
                      placeholder="Select Employee"
                      isSearchable
                      onChange={(selected) => {
                        addAssignee(bug.id, selected.value);
                      }}
                      value={options.find(
                        (option) => option.value === bug.assignedTo,
                      )}
                      isDisabled={assignLoading}
                    />
                  </td>

                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => openBugDetails(bug.id)}
                      className="text-blue-600 hover:underline"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex justify-between p-4">
          <button
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-sm">
            Page {page + 1} of {totalPages}
          </span>
          <button
            disabled={page + 1 >= totalPages}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {/* CREATE BUG MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center p-4">
          <div className="bg-white rounded-lg p-6 shadow-xl w-full max-w-2xl">
            <h3 className="text-xl font-semibold mb-4">Create Bug</h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Form Inputs */}
              {[
                "runCaseId",
                "runCaseStepId",
                "title",
                "description",
                "expected",
                "actual",
                "reproductionSteps",
                "assignedTo",
              ].map((field) => (
                <div className="col-span-2" key={field}>
                  <label className="block text-sm font-medium capitalize">
                    {field.replace(/([A-Z])/g, " $1")}
                  </label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2 mt-1"
                    value={form[field]}
                    onChange={(e) =>
                      setForm({ ...form, [field]: e.target.value })
                    }
                  />
                </div>
              ))}

              {/* Severity */}
              <div>
                <label className="block text-sm font-medium">Severity</label>
                <select
                  className="w-full border rounded px-3 py-2 mt-1"
                  value={form.severity}
                  onChange={(e) =>
                    setForm({ ...form, severity: e.target.value })
                  }
                >
                  <option>LOW</option>
                  <option>MEDIUM</option>
                  <option>HIGH</option>
                  <option>CRITICAL</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium">Priority</label>
                <select
                  className="w-full border rounded px-3 py-2 mt-1"
                  value={form.priority}
                  onChange={(e) =>
                    setForm({ ...form, priority: e.target.value })
                  }
                >
                  <option>NORMAL</option>
                  <option>HIGH</option>
                  <option>URGENT</option>
                </select>
              </div>
            </div>

            {/* Button Row */}
            <div className="flex justify-end mt-6 space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBug}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow"
              >
                Create Bug
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedBug && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white/90 shadow-2xl border border-slate-200">
            {/* Top accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400 rounded-t-2xl" />

            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-4 pb-3">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  Bug Details
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Review the full context, links and reproduction steps for this
                  bug.
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedBug(null);
                  setBugDetails(null);
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 hover:shadow-sm transition"
              >
                ✕
              </button>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-100" />

            {/* Loading */}
            {loadingBugDetails && (
              <div className="py-12 text-center">
                <LoadingSpinner text="Loading Bug Details..." />
              </div>
            )}

            {/* Details */}
            {!loadingBugDetails && bugDetails && (
              <div className="px-6 pb-6 pt-4 space-y-6 text-sm text-slate-800">
                {/* Primary info */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                      Title
                    </span>
                    <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900">
                      {bugDetails.title}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        Status
                      </span>
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                        {bugDetails.status}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        Severity
                      </span>
                      <span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
                        {bugDetails.severity}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        Priority
                      </span>
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                        {bugDetails.priority}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Long text section */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <div>
                      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        Description
                      </span>
                      <div className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        {bugDetails.description || "—"}
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        Expected Result
                      </span>
                      <div className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        {bugDetails.expectedResult || "—"}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        Actual Result
                      </span>
                      <div className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        {bugDetails.actualResult || "—"}
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        Reproduction Steps
                      </span>
                      <div className="mt-1 whitespace-pre-line rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        {bugDetails.reproductionSteps || "—"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Linked entities */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Linked Items
                  </h4>
                  <div className="mt-3 grid gap-3 md:grid-cols-3 lg:grid-cols-5 text-xs">
                    <div>
                      <p className="text-[11px] font-medium text-slate-500">
                        Story
                      </p>
                      <p className="mt-1 font-medium text-slate-800">
                        {bugDetails.testStory?.title || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-slate-500">
                        Scenario
                      </p>
                      <p className="mt-1 font-medium text-slate-800">
                        {bugDetails.testScenario?.title || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-slate-500">
                        Test Case
                      </p>
                      <p className="mt-1 font-medium text-slate-800">
                        {bugDetails.testCase?.title || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-slate-500">
                        Run Case
                      </p>
                      <p className="mt-1 font-medium text-slate-800">
                        {bugDetails.runCase?.title || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-slate-500">
                        Run Case Step
                      </p>
                      <p className="mt-1 font-medium text-slate-800">
                        {bugDetails.runCaseStep?.stepDescription || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end pt-2 border-t border-slate-100 mt-2">
                  <button
                    onClick={() => {
                      setSelectedBug(null);
                      setBugDetails(null);
                    }}
                    className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 focus:ring-offset-slate-900 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BugPage;
