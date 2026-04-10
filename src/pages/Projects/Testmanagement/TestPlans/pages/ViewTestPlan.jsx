import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const ViewTestPlan = ({ projectId, planId, onClose }) => {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchPlan = async () => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/test-plans/${planId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setPlan(res.data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch Test Plan details.");
      } finally {
        setLoading(false);
      }
    };

    if (projectId && planId) {
      fetchPlan();
    }
  }, [projectId, planId, token]);

  if (loading) {
    return <div className="p-6 text-slate-500">Loading Test Plan...</div>;
  }

  if (!plan) {
    return <div className="p-6 text-red-500">Test Plan not found.</div>;
  }

  return (
    <div className="p-6 space-y-4 bg-white rounded-md shadow">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">{plan.name}</h2>
        {onClose && (
          <button
            className="text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            ✕
          </button>
        )}
      </div>

      <div className="space-y-2">
        <div>
          <span className="font-semibold text-gray-700">Description:</span>
          <p className="text-gray-800 mt-1">{plan.description || "-"}</p>
        </div>

        <div>
          <span className="font-semibold text-gray-700">Status:</span>
          <span
            className={`ml-2 px-2 py-1 rounded-full text-sm font-semibold ${
              plan.status === "Active"
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {plan.status}
          </span>
        </div>

        <div>
          <span className="font-semibold text-gray-700">Created At:</span>
          <span className="ml-2 text-gray-800">
            {new Date(plan.createdAt).toLocaleString()}
          </span>
        </div>

        <div>
          <span className="font-semibold text-gray-700">Last Updated:</span>
          <span className="ml-2 text-gray-800">
            {new Date(plan.updatedAt).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ViewTestPlan;
