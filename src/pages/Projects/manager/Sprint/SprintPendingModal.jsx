import React, { useState } from "react";
import Button from "../../../../components/Button/Button";
import api from "../../../../api/axiosInstance";
import FilterListbox from "../../../../components/filter/FilterListbox";
import { showStatusToast } from "../../../../components/toastfy/toast";
import Modal from "../../../../components/Modal/modal";

const SprintPendingModal = ({
  isOpen,
  pendingData,
  sprints,
  onClose,
  refresh,
}) => {
  const [selectedSprint, setSelectedSprint] = useState("");

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const completeWithOption = async (option) => {
    try {
      await api.post(
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

      showStatusToast("Sprint finalized successfully", "success");
      refresh();
      onClose();
    } catch (err) {
      showStatusToast(err.response?.data?.message || "Failed to finalize sprint", "error");
    }
  };

  return (
    <Modal
      isOpen={isOpen && !!pendingData}
      onClose={onClose}
      title="Sprint Completion Validation"
      className="max-w-xl"
    >
      <div className="space-y-4">
        <p className="text-gray-700">
          These work items must be handled before sprint closure:
        </p>

        {/* Pending Tasks */}
        {pendingData?.tasks?.length > 0 && (
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
        {pendingData?.stories?.length > 0 && (
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
        <div className="space-y-3 pt-2">
          {/* Move to next sprint */}
          <div className="flex items-center">
            <FilterListbox
              options={[{value:"",label:"Select Next Sprint"},...sprints.filter(sp=>sp.status==="PLANNING").map(sp=>({value:sp.id,label:sp.name}))]}
              value={selectedSprint}
              onChange={setSelectedSprint}
            />
            <Button
              variant="success"
              disabled={!selectedSprint}
              onClick={() => completeWithOption("NEXT")}
            >
              Move to Next Sprint
            </Button>
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => completeWithOption("BACKLOG")}>
              Move to Backlog
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SprintPendingModal;
