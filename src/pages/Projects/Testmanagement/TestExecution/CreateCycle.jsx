import React, { useState, useEffect } from "react";
import axiosInstance from "../api/axiosInstance";
import { toast } from "react-toastify";

export default function CreateTestCycleForm({
  projectId,
  onSuccess,
  onClose,
  editingCycle = null,
}) {
  const isEditMode = !!editingCycle;

  const [form, setForm] = useState({
    name: "",
    cycleType: "",
    status: "",
    startDate: "",
    endDate: "",
    sprintId: null,
  });

  const [loading, setLoading] = useState(false);
  const [sprints, setSprints] = useState([]);
  const [loadingSprints, setLoadingSprints] = useState(true);

  // ── Prefill when editing ──────────────────────────────────────────────────
  useEffect(() => {
    if (isEditMode && editingCycle) {
      setForm({
        name: editingCycle.name || "",
        cycleType: editingCycle.cycleType || "",
        status: editingCycle.status || "",
        startDate: editingCycle.startDate
          ? toDatetimeLocal(editingCycle.startDate)
          : "",
        endDate: editingCycle.endDate
          ? toDatetimeLocal(editingCycle.endDate)
          : "",
        sprintId: editingCycle.sprintId ?? null,
      });
    }
  }, [editingCycle]);

  const toDatetimeLocal = (isoString) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    if (isNaN(d)) return "";
    return d.toISOString().slice(0, 16);
  };

  // ── Fetch sprints ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!projectId) return;
    const fetchSprints = async () => {
      try {
        const res = await axiosInstance.get(
          `/projects/${projectId}/sprints`  // ✅ correct
        );
        setSprints(res.data || []);
      } catch (err) {
        console.error("Error fetching sprints:", err);
      } finally {
        setLoadingSprints(false);
      }
    };
    fetchSprints();
  }, [projectId]);

  // ── Input handler ─────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]:
        name === "sprintId"
          ? value === ""
            ? null
            : Number(value)
          : value,
    });
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.cycleType || !form.startDate) {
      toast.error("Please fill all required fields");
      return;
    }

    const payload = {
      projectId: Number(projectId),
      sprintId: form.sprintId,
      name: form.name,
      cycleType: form.cycleType,
      status: form.status || null,
      startDate: form.startDate,
      endDate: form.endDate || null,
    };

    try {
      setLoading(true);
      if (isEditMode) {
        await axiosInstance.put(
          `/test-execution/test-cycles/${editingCycle.id}`, // ✅ correct
          payload
        );
        toast.success("Test Cycle Updated Successfully!");
      } else {
        await axiosInstance.post(
          `/test-execution/test-cycles`, // ✅ correct
          payload
        );
        toast.success("Test Cycle Created Successfully!");
      }
      onSuccess && onSuccess();
    } catch (error) {
      console.error(error);
      toast.error(
        isEditMode
          ? "Failed to update test cycle"
          : "Failed to create test cycle"
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-lg relative">
      <div className="mb-5">
        <h2 className="text-xl font-semibold">
          {isEditMode ? "Edit Test Cycle" : "Create Test Cycle"}
        </h2>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-lg"
        >
          ✕
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {/* Cycle Name */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Cycle Name *</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Regression Cycle 1"
            required
          />
        </div>

        {/* Cycle Type */}
        <div>
          <label className="block text-sm font-medium mb-1">Cycle Type *</label>
          <select
            name="cycleType"
            value={form.cycleType}
            onChange={handleChange}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          >
            <option value="">Select Type</option>
            <option value="REGRESSION">REGRESSION</option>
            <option value="SMOKE">SMOKE</option>
            <option value="UAT">UAT</option>
            <option value="SIT">SIT</option>
            <option value="PERFORMANCE">PERFORMANCE</option>
            <option value="OTHER">OTHER</option>
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Select Status</option>
            <option value="PLANNED">PLANNED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        {/* Sprint */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Sprint (Optional)
          </label>
          {loadingSprints ? (
            <p className="text-gray-400 text-sm">Loading sprints...</p>
          ) : (
            <select
              name="sprintId"
              value={form.sprintId ?? ""}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">No Sprint</option>
              {sprints.map((sprint) => (
                <option key={sprint.id} value={sprint.id}>
                  {sprint.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium mb-1">Start Date *</label>
          <input
            type="datetime-local"
            name="startDate"
            value={form.startDate}
            onChange={handleChange}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-sm font-medium mb-1">End Date</label>
          <input
            type="datetime-local"
            name="endDate"
            value={form.endDate}
            onChange={handleChange}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Submit */}
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition"
          >
            {loading
              ? isEditMode
                ? "Updating..."
                : "Creating..."
              : isEditMode
              ? "Update Cycle"
              : "Create Cycle"}
          </button>
        </div>
      </form>
    </div>
  );
}