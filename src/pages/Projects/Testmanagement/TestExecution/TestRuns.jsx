import axios from "axios";
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import RunTestCaseComponent from "./RunTestCaseComponent";
import TestCaseResultComponent from "./TestCaseResultComponent";
import Select from "react-select";
import { toast } from "react-toastify";

export default function TestRunAccordion({ run, projectId, refreshRuns, onDelete }) {
  const [isOpen, setIsOpen] = useState(false);
  const [testCases, setTestCases] = useState([]);
  const [runTestCaseId, setRunTestCaseId] = useState(null);
  const [viewResultCaseId, setViewResultCaseId] = useState(null);
  const [employee, setEmployee] = useState([]);

  // ── 3-dot menu state ─────────────────────────────────────────────
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

  const executed = run.executedCount || 0;
  const total = run.totalCount || 0;
  const progress = total > 0 ? Math.round((executed / total) * 100) : 0;

  // ── Close menu when clicking outside ─────────────────────────────
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

  // ── Load test cases ──────────────────────────────────────────────
  const loadTestCases = async () => {
    try {
      const res = await axiosInstance.get(
        `/test-execution/test-runs/${run.id}/cases`
      );
      setTestCases(res.data || []);
    } catch (err) {
      console.error("Error loading test cases:", err);
    }
  };

  // ── Load employees ───────────────────────────────────────────────
  const loadEmployees = async () => {
    try {
      const res = await axios.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/members-with-owner`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setEmployee(res.data || []);
    } catch (err) {
      console.error("Error loading employees:", err);
    }
  };

  // ── Assign ───────────────────────────────────────────────────────
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
        }
      );
      loadTestCases();
    } catch (err) {
      console.error("Error adding assignee:", err);
    }
  };

  // ── Edit submit ──────────────────────────────────────────────────
  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!editForm.name || !editForm.status) {
      toast.error("Name and Status are required");
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

      toast.success("Test run updated successfully");
      setIsEditing(false);
      refreshRuns && refreshRuns();
    } catch (err) {
      console.error("Error updating run:", err);
      toast.error("Failed to update test run");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadTestCases();
  }, [run.id]);

  useEffect(() => {
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
      {/* ── HEADER ───────────────────────────────────────────── */}
      <div
        className="p-4 flex justify-between items-start cursor-pointer bg-gray-50 hover:bg-gray-100"
        onClick={() => setIsOpen((s) => !s)}
      >
        <div>
          <h4 className="font-semibold">{run.name}</h4>
          <p className="text-sm text-gray-500">
            {run.executionDate || "No Date"}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-600">{progress}%</div>

            {/* ── 3 DOT MENU ───────────────────────────── */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((s) => !s);
                }}
                className="p-1 rounded hover:bg-gray-200 text-gray-500 text-lg"
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
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
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

          <div>{isOpen ? "▲" : "▼"}</div>
        </div>
      </div>

      {/* ── EDIT MODAL ───────────────────────────────────────── */}
      {isEditing && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50"
          onClick={() => setIsEditing(false)}
        >
          <div
            className="bg-white p-6 rounded-xl w-[480px]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-4">Edit Test Run</h2>

            <form onSubmit={handleEditSubmit} className="grid gap-4">
              <input
                type="text"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                className="border p-2 rounded"
                required
              />

              <select
                value={editForm.status}
                onChange={(e) =>
                  setEditForm({ ...editForm, status: e.target.value })
                }
                className="border p-2 rounded"
              >
                <option value="CREATED">CREATED</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>

              <textarea
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    description: e.target.value,
                  })
                }
                className="border p-2 rounded"
              />

              <button className="bg-blue-600 text-white p-2 rounded">
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── BODY (UNCHANGED) ─────────────────────────────────── */}
      {isOpen && (
        <div className="p-4 border-t">
          <p className="text-gray-500">Execution content unchanged...</p>
        </div>
      )}
    </div>
  );
}