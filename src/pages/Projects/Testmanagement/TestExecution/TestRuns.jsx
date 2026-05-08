import axios from "axios";
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import RunTestCaseComponent from "./RunTestCaseComponent";
import TestCaseResultComponent from "./TestCaseResultComponent";
import Select from "react-select";
import { showStatusToast } from "../../../../components/toastfy/toast";
import Button from "../../../../components/Button/Button";
 
export default function TestRunAccordion({ run, projectId, refreshRuns, onDelete }) {
  const [isOpen, setIsOpen] = useState(false);
  const [testCases, setTestCases] = useState([]);
  const [runTestCaseId, setRunTestCaseId] = useState(null);
  const [viewResultCaseId, setViewResultCaseId] = useState(null);
  const [employee, setEmployee] = useState([]);
 
  // ── 3-dot menu state ──────────────────────────────────────────────────────
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: run.name || "",
    status: run.status || "CREATED",
    description: run.description || "",
  });
  const [saving, setSaving] = useState(false);
  const menuRef = useRef(null);
 
  const navigate = useNavigate();
 
  const status = (run.status || run.description)?.toUpperCase() || "CREATED";
 
  const executed = run.executedCount || 0;
  const total = run.totalCount || 0;
  const progress = total > 0 ? Math.round((executed / total) * 100) : 0;
 
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
 
  const goToAddCases = (e) => {
    e.stopPropagation();
    navigate(`/projects/${projectId}/cycles/runs/${run.id}/test-runs`);
  };
 
  // ── Load test cases ───────────────────────────────────────────────────────
  const loadTestCases = async () => {
    try {
      const res = await axiosInstance.get(
        `/test-execution/test-runs/${run.id}/cases`,
      );
      setTestCases(res.data || []);
    } catch (err) {
      console.error("Error loading test cases:", err);
    }
  };
 
  // ── Load employees ────────────────────────────────────────────────────────
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
      setEmployee(res.data || []);
    } catch (err) {
      console.error("Error loading employees:", err);
    }
  };
 
  // ── Assign ────────────────────────────────────────────────────────────────
  const addAssignee = async (testCaseId, userId) => {
    try {
      await axios.post(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-execution/test-runs/assign/apply`,
        {
          runId: run.id,
          objectType: "CASE",
          objectId: testCaseId,
          action: "REASSIGN_ALL",
          assignTo: userId,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      loadTestCases();
    } catch (err) {
      console.error("Error adding assignee:", err);
    }
  };
 
  // ── Edit submit ───────────────────────────────────────────────────────────
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.name || !editForm.status) {
      showStatusToast("Name and Status are required", "error");
      return;
    }
    try {
      setSaving(true);
      await axiosInstance.put(`/test-execution/test-runs/${run.id}`, {
        name: editForm.name,
        status: editForm.status,
        description: editForm.description || null,
        cycleId: run.cycleId,
      });
      showStatusToast("Test run updated successfully", "success");
      setIsEditing(false);
      refreshRuns && refreshRuns();
    } catch (err) {
      console.error("Error updating run:", err);
      showStatusToast("Failed to update test run", "error");
    } finally {
      setSaving(false);
    }
  };
 
  React.useEffect(() => {
    loadTestCases();
  }, [run.id]);
 
  React.useEffect(() => {
    loadEmployees();
  }, []);
 
  const options = employee.map((option) => ({
    value: option.id,
    label: option.name,
  }));
 
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
      maxHeight: "160px",
    }),
  };
 
  return (
<div className="bg-white border rounded-lg shadow-sm overflow-visible">
      {/* ACCORDION HEADER */}
<div
        className="p-4 flex justify-between items-start cursor-pointer bg-gray-50 hover:bg-gray-100"
        onClick={() => setIsOpen((s) => !s)}
>
<div>
<h4 className="font-semibold">{run.name}</h4>
<p className="text-sm text-gray-500">
            {run.executionDate || "No Date"}
</p>
          {/* STATUS BADGE */}
<span
            className={`inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded ${
              status === "COMPLETED"
                ? "bg-green-100 text-green-700"
                : status === "IN_PROGRESS"
                ? "bg-blue-100 text-blue-700"
                : status === "CANCELLED"
                ? "bg-red-100 text-red-700"
                : "bg-gray-100 text-gray-600"
            }`}
>
            {status}
</span>
</div>
 
        <div className="flex flex-col items-end gap-2">
<div className="flex items-center gap-2">
<div className="text-sm text-gray-600">{progress}%</div>
 
            {/* ── 3-DOT MENU ─────────────────────────────────────────────── */}
<div className="relative" ref={menuRef}>
<button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((s) => !s);
                }}
                className="p-1 rounded hover:bg-gray-200 text-gray-500 text-lg leading-none"
                title="Options"
>
                ⋮
</button>
 
              {menuOpen && (
<div className="absolute right-0 top-8 bg-white border rounded-lg shadow-lg z-50 w-36">
<button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditing(true);
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-gray-700"
>
                    ✏️ Edit
</button>
<button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onDelete && onDelete(run.id);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600"
>
                    🗑️ Delete
</button>
</div>
              )}
</div>
</div>
 
          <div className="w-24 bg-gray-200 h-2 rounded-full overflow-hidden">
<div
              className="h-2 bg-green-500"
              style={{ width: `${progress}%` }}
            />
</div>
<div className="text-lg">{isOpen ? "▲" : "▼"}</div>
</div>
</div>
 
      {/* ── EDIT MODAL ──────────────────────────────────────────────────────── */}
      {isEditing && (
<div
          className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50"
          onClick={() => setIsEditing(false)}
>
<div
            className="bg-white p-6 rounded-xl w-[480px] shadow-xl relative"
            onClick={(e) => e.stopPropagation()}
>
<h2 className="text-lg font-semibold mb-4">Edit Test Run</h2>
<button
              onClick={() => setIsEditing(false)}
              className="absolute top-3 right-4 text-gray-400 hover:text-black"
>
              ✕
</button>
 
            <form onSubmit={handleEditSubmit} className="grid grid-cols-1 gap-4">
              {/* Name */}
<div>
<label className="block text-sm font-medium mb-1">Run Name *</label>
<input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
</div>
 
              {/* Status */}
<div>
<label className="block text-sm font-medium mb-1">Status *</label>
<select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
>
<option value="CREATED">CREATED</option>
<option value="IN_PROGRESS">IN_PROGRESS</option>
<option value="COMPLETED">COMPLETED</option>
<option value="CANCELLED">CANCELLED</option>
</select>
</div>
 
              {/* Description */}
<div>
<label className="block text-sm font-medium mb-1">Description</label>
<textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  rows={3}
                  placeholder="Optional description..."
                />
</div>
 
              <Button variant="primary" className="w-full" disabled={saving} type="submit">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
</form>
</div>
</div>
      )}
 
      {/* ACCORDION BODY */}
      {isOpen && (
<div className="p-4 border-t">
          {testCases?.length > 0 ? (
<>
<h5 className="font-medium text-sm mb-4">Execution Worklist</h5>
<div className="overflow-x-auto">
<table className="min-w-full text-sm">
<thead>
<tr className="border-b text-gray-500">
<th className="py-2 px-3 text-center">ID</th>
<th className="py-2 px-3 text-center">Test Case Title</th>
<th className="py-2 px-3 text-center">Priority</th>
<th className="py-2 px-3 text-left">Status</th>
<th className="py-2 px-3 text-left">Assignee</th>
<th className="py-2 px-3 text-center">Action</th>
</tr>
</thead>
<tbody>
                    {testCases.map((tc) => (
<tr
                        key={tc.testCaseId}
                        className="border-b hover:bg-gray-50"
>
<td className="py-3 px-3 text-center font-medium text-gray-700">
                          {tc.testCaseId}
</td>
<td className="py-3 px-3 text-center text-gray-800">
                          {tc.title}
</td>
<td className="py-3 px-3 text-center">
<span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              tc.priority === "HIGH"
                                ? "bg-red-100 text-red-600"
                                : tc.priority === "MEDIUM"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-blue-100 text-blue-600"
                            }`}
>
                            {tc.priority}
</span>
</td>
<td className="py-3 px-3 font-medium text-gray-700">
                          {tc.runStatus}
</td>
<td className="py-3 px-3 text-center">
<Select
                            styles={customStyles}
                            options={options}
                            placeholder="Select Employee"
                            isSearchable
                            onChange={(selected) =>
                              addAssignee(tc.testCaseId, selected.value)
                            }
                            value={
                              options.find(
                                (option) => option.value === tc.assigneeId,
                              ) || null
                            }
                          />
</td>
<td className="py-3 px-3 text-center">
                          {tc.runStatus !== "COMPLETED" ? (
<Button variant="secondary" size="small" onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const idToRun = tc.testCaseId || tc.id;
                                console.log("▶️ Opening Run Modal for ID:", idToRun);
                                setRunTestCaseId(idToRun);
                              }}>▶ Run</Button>
                          ) : (
<button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const idToView = tc.testCaseId || tc.id;
                                console.log("🔍 Opening View Result Modal for ID:", idToView);
                                setViewResultCaseId(idToView);
                              }}
                              className="text-blue-600 hover:underline"
>
                              View Result
</button>
                          )}
</td>
</tr>
                    ))}
</tbody>
</table>
</div>
<Button variant="primary" onClick={goToAddCases}>+ Add More Cases</Button>
</>
          ) : (
<div className="text-center py-6">
<p className="text-gray-500 mb-3">No test cases added yet.</p>
<Button variant="primary" onClick={goToAddCases}>+ Add Test Cases</Button>
</div>
          )}
</div>
      )}
 
      {/* ⬇️ Use != null to prevent falsy zero bugs ⬇️ */}
      {runTestCaseId != null && (
<RunTestCaseComponent
          runId={run.id}
          testCaseId={runTestCaseId}
          onClose={() => {
            setRunTestCaseId(null);
            loadTestCases();
          }}
        />
      )}
 
      {viewResultCaseId != null && (
<TestCaseResultComponent
          runId={run.id}
          testCaseId={viewResultCaseId}
          onClose={() => setViewResultCaseId(null)}
        />
      )}
</div>
  );
}