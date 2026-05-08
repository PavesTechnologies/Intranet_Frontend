import React, { useState } from "react";
import Button from "../../../../components/Button/Button";
import axios from "axios";
import FilterListbox from "../../../../components/filter/FilterListbox";
import { toast } from "react-toastify"; // <-- FIX ADDED

const SprintPendingModal = ({
  isOpen,
  pendingData,
  sprints,
  onClose,
  refresh,
}) => {
  // Prevent crash when pendingData is null
  if (!isOpen || !pendingData) return null; // <-- FIXED

  const [selectedSprint, setSelectedSprint] = useState("");

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const completeWithOption = async (option) => {
    try {
      await axios.post(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/sprints/${pendingData.sprintId}/finish`,
        {},
        {
          params:
            option === "NEXT"
              ? { option: "NEXT_SPRINT", nextSprintId: selectedSprint }
              : { option: "BACKLOG" },
          headers,
        },
      );

      toast.success("Sprint finalized successfully", { autoClose: 3000, containerId: "global" });
      refresh();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to finalize sprint", { autoClose: 3000, containerId: "global" });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white shadow-xl rounded-2xl w-[600px] p-6 space-y-6 animate-fadeIn">
        <h2 className="text-2xl font-semibold text-indigo-900">
          Sprint Completion Validation
        </h2>

        <p className="text-gray-700">
          These work items must be handled before sprint closure:
        </p>

        {/* Pending Tasks */}
        {pendingData.tasks?.length > 0 && (
          <div>
            <h3 className="font-semibold text-red-600">⛔ Pending Tasks</h3>
            <ul className="list-disc ml-6 text-gray-700">
              {pendingData.tasks.map((t, idx) => (
                <li key={idx}>{t}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Pending Stories */}
        {pendingData.stories?.length > 0 && (
          <div>
            <h3 className="font-semibold text-orange-500 mt-3">
              📝 Pending Stories
            </h3>
            <ul className="list-disc ml-6 text-gray-700">
              {pendingData.stories.map((s, idx) => (
                <li key={idx}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Options */}
        <div className="mt-6 space-y-3">
          {/* Move to next sprint */}
          <div className="flex items-center">
            <FilterListbox
              options={[{value:"",label:"Select Next Sprint"},...sprints.filter(sp=>sp.status==="PLANNING").map(sp=>({value:sp.id,label:sp.name}))]}
              value={selectedSprint}
              onChange={setSelectedSprint}
            />
            <Button
              disabled={!selectedSprint}
              className="ml-4 bg-green-600 text-white px-4 py-2 rounded-lg disabled:bg-green-300"
              onClick={() => completeWithOption("NEXT")}
            >
              Move to Next Sprint
            </Button>
          </div>

          <div className="flex justify-between mt-5">
            <Button
              className="bg-gray-300 px-4 py-2 rounded-lg"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              className="bg-indigo-700 text-white px-4 py-2 rounded-lg"
              onClick={() => completeWithOption("BACKLOG")}
            >
              Move to Backlog
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SprintPendingModal;
