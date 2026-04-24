import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Plus, Edit, Trash2 } from "lucide-react";

import CreateTestPlan from "./CreateTestPlan";
import EditTestPlan from "./EditTestPlan";
import TestPlanTableRow from "../../components/TestPlanTableRow";
import Loader from "../../../../components/ui/Loader";
import Modal from "../../../../components/ui/Modal";

const TestPlansList = ({ projectId }) => {
  const [testPlans, setTestPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editPlanData, setEditPlanData] = useState(null);

  const token = localStorage.getItem("token");

  // Fetch Test Plans
  const fetchTestPlans = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/test-plans`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      setTestPlans(res.data);
    } catch (err) {
      toast.error("Failed to fetch Test Plans.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestPlans();
  }, [projectId]);

  // Handle delete
  const handleDelete = async (planId) => {
    if (!window.confirm("Are you sure you want to delete this Test Plan?"))
      return;
    try {
      await axios.delete(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/test-plans/${planId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      toast.success("Test Plan deleted successfully.");
      fetchTestPlans();
    } catch (err) {
      toast.error("Failed to delete Test Plan.");
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Test Plans</h2>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus size={16} />
          Create Test Plan
        </button>
      </div>

      {/* Table */}
      <div className="bg-white shadow rounded-md overflow-hidden">
        {loading ? (
          <Loader />
        ) : testPlans.length === 0 ? (
          <div className="p-6 text-slate-500">No Test Plans available.</div>
        ) : (
          <table className="min-w-full table-auto border-collapse">
            <thead className="bg-gray-100 text-left text-sm font-semibold text-gray-700">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Created At</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {testPlans.map((plan) => (
                <TestPlanTableRow
                  key={plan.id}
                  plan={plan}
                  onEdit={() => setEditPlanData(plan)}
                  onDelete={() => handleDelete(plan.id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <Modal
          title="Create Test Plan"
          onClose={() => setShowCreateModal(false)}
        >
          <CreateTestPlan
            projectId={projectId}
            onSuccess={() => {
              fetchTestPlans();
              setShowCreateModal(false);
            }}
          />
        </Modal>
      )}

      {/* Edit Modal */}
      {editPlanData && (
        <Modal title="Edit Test Plan" onClose={() => setEditPlanData(null)}>
          <EditTestPlan
            projectId={projectId}
            planData={editPlanData}
            onSuccess={() => {
              fetchTestPlans();
              setEditPlanData(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
};

export default TestPlansList;
