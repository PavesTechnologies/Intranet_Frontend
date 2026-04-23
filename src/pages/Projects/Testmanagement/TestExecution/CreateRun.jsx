import React, { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import { toast } from "react-toastify";

export default function CreateTestRunForm({ projectId, onSuccess, onClose }) {
  const [cycles, setCycles] = useState([]);
  const [loadingCycles, setLoadingCycles] = useState(true);

  const [form, setForm] = useState({
    cycleId: "",
    name: "",
    status: "",
    description: "",
    executedBy: "",
    executedAt: "",
  });

  const [loadingSubmit, setLoadingSubmit] = useState(false);

  // Load cycles from API
  useEffect(() => {
    const fetchCycles = async () => {
      try {
        const res = await axiosInstance.get(
          `${
            window.__APP_CONFIG__.PMS_BASE_URL
          }/api/test-execution/test-cycles/projects/${projectId}`,
        );
        setCycles(res.data || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load test cycles");
      } finally {
        setLoadingCycles(false);
      }
    };

    fetchCycles();
  }, [projectId]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.cycleId || !form.name || !form.status) {
      toast.error("Cycle, Name & Status are required");
      return;
    }

    const payload = {
      cycleId: Number(form.cycleId),
      name: form.name,
      status: form.status,
      description: form.description || null,
      createdBy: 1, // replace with logged-in user id
      createdAt: new Date().toISOString(),
      executedBy: form.executedBy || null,
      executedAt: form.executedAt || null,
    };

    try {
      setLoadingSubmit(true);
      await axiosInstance.post(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-execution/test-runs`,
        payload,
      );

      toast.success("Test Run Created Successfully");
      onSuccess && onSuccess();
    } catch (err) {
      console.error(err);
      toast.error("Failed to create test run");
    } finally {
      setLoadingSubmit(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md w-[100%] max-w-lg relative">
      <div>
        <h2 className="text-xl font-semibold mb-5">Create Test Run</h2>

        {/* Fixed Close Button Position */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-600 hover:text-gray-900"
        >
          ✕
        </button>
      </div>

      {/* If cycles are loading */}
      {loadingCycles ? (
        <p className="text-gray-500">Loading cycles...</p>
      ) : cycles.length === 0 ? (
        <p className="text-red-500">
          No Test Cycles found for this project. Please create one first.
        </p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Select Cycle */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">
              Select Cycle *
            </label>
            <select
              name="cycleId"
              value={form.cycleId}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg"
              required
            >
              <option value="">-- Select Test Cycle --</option>
              {cycles.map((cycle) => (
                <option key={cycle.id} value={cycle.id}>
                  {cycle.name} ({cycle.cycleType})
                </option>
              ))}
            </select>
          </div>

          {/* Run Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Run Name *</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg"
              placeholder="Regression Run - Build 1.0"
              required
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium mb-1">Status *</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg"
              required
            >
              <option value="">Select Status</option>
              <option value="NOT_STARTED">NOT_STARTED</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="BLOCKED">BLOCKED</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>

          {/* Description (full width) */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg"
              rows={3}
              placeholder="Optional description..."
            />
          </div>

          {/* Executed By */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Executed By (User ID)
            </label>
            <input
              type="number"
              name="executedBy"
              value={form.executedBy}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg"
              placeholder="Enter executor user ID (optional)"
            />
          </div>

          {/* Executed At */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Executed At
            </label>
            <input
              type="datetime-local"
              name="executedAt"
              value={form.executedAt}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg"
            />
          </div>

          {/* Submit Button full width */}
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={loadingSubmit}
              className="w-full bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700"
            >
              {loadingSubmit ? "Creating..." : "Create Test Run"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
