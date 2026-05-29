import React, { useEffect, useState } from "react";
import api from "../../../../../api/axiosInstance";
import { showStatusToast } from "../../../../../components/toastfy/toast";
import LoadingSpinner from "../../../../../components/LoadingSpinner";
import StatusBadge from "../../../../../components/status/statusbadge";

const ViewTestPlan = ({ projectId, planId, onClose }) => {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchPlan = async () => {
      setLoading(true);
      try {
        const res = await api.get(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/test-plans/${planId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setPlan(res.data);
      } catch (err) {
        console.error(err);
        showStatusToast("Failed to fetch Test Plan details.", "error");
      } finally {
        setLoading(false);
      }
    };

    if (projectId && planId) {
      fetchPlan();
    }
  }, [projectId, planId, token]);

  if (loading) {
    return <LoadingSpinner size="md" text="Loading Test Plan..." />;
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

        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-700">Status:</span>
          <StatusBadge label={plan.status} size="md" />
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
