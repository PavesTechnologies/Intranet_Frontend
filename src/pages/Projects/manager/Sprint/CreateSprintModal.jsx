// src/pages/Projects/manager/Sprint/CreateSprintModal.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import FilterListbox from "../../../../components/filter/FilterListbox";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const getCurrentDateTime = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
};
const CreateSprintModal = ({
  isOpen,
  sprint, // <-- EDIT MODE sprint object
  projectId,
  onClose,
  onCreated,
}) => {
  if (!isOpen) return null;

  const token = localStorage.getItem("token");

  // ---------------------------
  // Default Form State
  // ---------------------------
  const emptyState = {
    name: "",
    goal: "",
    startDate: "",
    endDate: "",
    status: "PLANNING",
    projectId: projectId?.toString(),
  };

  const [formData, setFormData] = useState(emptyState);
  const [duration, setDuration] = useState("1W");
  const [customWeeks, setCustomWeeks] = useState("");
  const [projectName, setProjectName] = useState("");
  const [showDecimalWarning, setShowDecimalWarning] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTime());

  useEffect(() => {
    if (isOpen) {
      setCurrentDateTime(getCurrentDateTime());
    }
  }, [isOpen]);

  // ---------------------------
  // Fetch Project Name
  // ---------------------------
  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setProjectName(res.data.name);
      } catch (e) {
        toast.error("Failed to load project details");
      }
    };
    load();
  }, [projectId, token]);

  // ---------------------------
  // EDIT MODE: Load sprint data
  // ---------------------------
  useEffect(() => {
    if (sprint) {
      setFormData({
        name: sprint.name || "",
        goal: sprint.goal || "",
        startDate: sprint.startDate ? sprint.startDate.slice(0, 16) : "",
        endDate: sprint.endDate ? sprint.endDate.slice(0, 16) : "",
        status: sprint.status || "PLANNING",
        projectId: projectId.toString(),
      });

      setDuration("CUSTOM"); // because edit sprint uses actual dates
      setCustomWeeks("");
    } else {
      setFormData(emptyState);
      setDuration("1W");
      setCustomWeeks("");
    }
  }, [sprint]);

  // ---------------------------
  // Helpers
  // ---------------------------
  const toLocalDateTime = (val) => (val.length === 16 ? `${val}:00` : val);

  const calculateEndDate = (start, weeks) => {
    if (!start || !weeks) return "";
    const d = new Date(start);
    d.setDate(d.getDate() + weeks * 7);
    return d.toISOString().slice(0, 16);
  };

  // ---------------------------
  // Start Date Change
  // ---------------------------
  const handleStartDateChange = (e) => {
    const newStart = e.target.value;
    if (!sprint && new Date(newStart) < new Date()) {
      toast.error("Start date cannot be in the past");
      return;
    }
    let newEnd = formData.endDate;

    if (duration !== "CUSTOM") {
      const w = parseInt(duration.replace("W", ""));
      newEnd = calculateEndDate(newStart, w);
    } else if (customWeeks) {
      newEnd = calculateEndDate(newStart, parseInt(customWeeks));
    }

    setFormData({
      ...formData,
      startDate: newStart,
      endDate: newEnd,
    });
  };

  // ---------------------------
  // Duration Change
  // ---------------------------
  const handleDurationChange = (e) => {
    const value = e.target.value;
    setDuration(value);

    if (value !== "CUSTOM") {
      const w = parseInt(value.replace("W", ""));
      const end = calculateEndDate(formData.startDate, w);
      setFormData({ ...formData, endDate: end });
      setCustomWeeks("");
    }
  };

  // ---------------------------
  // Generic input handler
  // ---------------------------
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ---------------------------
  // SUBMIT (Create or Update)
  // ---------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      name: formData.name,
      goal: formData.goal || null,
      startDate: toLocalDateTime(formData.startDate),
      endDate: toLocalDateTime(formData.endDate),
      status: formData.status,
      projectId: Number(formData.projectId),
    };

    try {
      let res;

  if (sprint) {
        // -------------------------
        // EDIT MODE
        // -------------------------
        res = await axios.put(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/sprints/${sprint.id}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        toast.success("Sprint updated successfully!", {containerId: "global"});
      } else {
        // -------------------------
        // CREATE MODE
        // -------------------------
        res = await axios.post(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/sprints`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        toast.success("Sprint created successfully!", {containerId: "global"});
      }

      onCreated(res.data);
      onClose(); // ← close immediately, toast will show on top of nothing

    } catch (err) {
      console.log('[sprint-modal] handleSubmit - caught error', { err: err?.response?.data || err?.message, ts: Date.now() });

      toast.error(err.response?.data?.message || "Error saving sprint", {
          autoClose: 3000,
          toastId: `sprint-error-${Date.now()}`, // ✅ prevents duplicate toasts on rapid clicks
          containerId: "global",
      });
    }
  };

  // ---------------------------
  // Render
  // ---------------------------
  return (
    //<div className="fixed inset-0 bg-black/40 z-50 flex justify-center items-center">
    <div className="fixed inset-0 bg-black/40 z-[100] flex justify-center items-center">
  <div className="bg-white rounded-xl shadow-xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto relative z-[101]"></div>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto relative">
  {/* Use global ToastContainer in App.jsx */}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
        >
          <X size={20} />
        </button>

        <h2 className="text-2xl font-semibold text-center mb-6">
          {sprint ? "Edit Sprint" : "Create New Sprint"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Sprint Name */}
          <div>
            <label className="block text-gray-700 mb-1 font-medium">
              Sprint Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="border rounded-lg w-full p-2"
            />
          </div>

          {/* Goal */}
          <div>
            <label className="block text-gray-700 mb-1 font-medium">
              Goal <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              name="goal"
              value={formData.goal}
              onChange={handleChange}
              className="border rounded-lg w-full p-2"
              rows={3}
            />
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-gray-700 mb-1 font-medium">
              Start Date *
            </label>
            <input
              type="datetime-local"
              name="startDate"
              value={formData.startDate}
              onChange={handleStartDateChange}
              min={!sprint ? currentDateTime : undefined}
              required
              className="border rounded-lg w-full p-2"
            />
          </div>

          {/* Duration */}
          {!sprint && (
            <div>
              <label className="block text-gray-700 mb-1 font-medium">
                Duration
              </label>
              <FilterListbox
                options={[{value:"1W",label:"1 Week"},{value:"2W",label:"2 Weeks"},{value:"3W",label:"3 Weeks"},{value:"CUSTOM",label:"Custom"}]}
                value={duration}
                onChange={(val) => handleDurationChange({ target: { value: val } })}
              />
            </div>
          )}

          {/* Custom weeks */}
          {!sprint && duration === "CUSTOM" && (
            <div>
              {showDecimalWarning && (
                <p className="text-red-500 text-sm mb-1">
                  Decimal weeks not allowed
                </p>
              )}

              <label className="block font-medium text-gray-700 mb-1">
                Enter Weeks *
              </label>

              <input
                type="text"
                value={customWeeks}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.includes(".")) {
                    setShowDecimalWarning(true);
                    return;
                  }
                  if (/^\d*$/.test(value)) {
                    setShowDecimalWarning(false);
                    setCustomWeeks(value);

                    if (value !== "" && value !== "0" && formData.startDate) {
                      const end = calculateEndDate(
                        formData.startDate,
                        Number(value),
                      );
                      setFormData({ ...formData, endDate: end });
                    }
                  }
                }}
                className="border rounded-lg w-full p-2"
              />
            </div>
          )}

          {/* End Date */}
          <div>
            <label className="block text-gray-700 mb-1 font-medium">
              End Date *
            </label>
            <input
              type="datetime-local"
              name="endDate"
              value={formData.endDate}
              readOnly
              disabled={!sprint}
              className="border rounded-lg w-full p-2 bg-gray-100"
            />
          </div>

          {/* Project (readonly) */}
          <div>
            <label className="block text-gray-700 mb-1 font-medium">
              Project
            </label>
            <input
              type="text"
              value={projectName}
              disabled
              className="border rounded-lg w-full p-2 bg-gray-100"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-gray-200 rounded-lg text-gray-700"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 text-white rounded-lg"
            >
              {sprint ? "Update Sprint" : "Create Sprint"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSprintModal;
