import React, { useState, Fragment, useEffect} from "react"; // Added Fragment
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useNotification } from "../../../contexts/NotificationContext";
import { X } from "lucide-react";

// ++ NEW Helper to format dates for the UI (from your other modal)
function formatDateForDisplay(date) {
  if (!date) return "";
  // This modal uses Date objects, so we can format directly
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const CompOffRequestModal = ({ onSuccess, onSubmit, onClose, loading }) => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  // const [isHalfDay, setIsHalfDay] = useState(false); // -- REMOVED
  const [note, setNote] = useState("");
  const { showNotification } = useNotification();

  // ++ NEW state for custom half-day logic
  const [showCustomHalfDay, setShowCustomHalfDay] = useState(false);
  const [halfDayConfig, setHalfDayConfig] = useState({
    start: "none", // 'none' is treated as a full day in calculation
    end: "none",
  });




  const formatDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // ++ NEW: Check for multi-day selection
  const isMultiDay =
    startDate && endDate && formatDate(startDate) !== formatDate(endDate);

  // ++ UPDATED: Calculate duration based on halfDayConfig
  const calculateDays = () => {
    if (!startDate) return 0;

    // Normalize dates to start of day for accurate comparison
    const start = new Date(startDate.setHours(0, 0, 0, 0));
    const end = endDate
      ? new Date(endDate.setHours(0, 0, 0, 0))
      : new Date(start);

    if (end < start) return 0; // Should not happen with minDate logic

    let total = 0;
    const current = new Date(start);

    while (current <= end) {
      const isStartDate = current.getTime() === start.getTime();
      const isEndDate = current.getTime() === end.getTime();

      // Note: Comp-off calculation DOES include weekends, unlike regular leave.

      if (isStartDate && isEndDate) {
        // Single Day
        total +=
          halfDayConfig.start === "first" || halfDayConfig.start === "second"
            ? 0.5
            : 1;
      } else if (isStartDate) {
        // Multi-day Start
        total +=
          halfDayConfig.start === "first" || halfDayConfig.start === "second"
            ? 0.5
            : 1;
      } else if (isEndDate) {
        // Multi-day End
        total +=
          halfDayConfig.end === "first" || halfDayConfig.end === "second"
            ? 0.5
            : 1;
      } else {
        // Middle Day
        total += 1;
      }

      current.setDate(current.getDate() + 1);
    }
    return total;
  };

  // ++ NEW: Handler for the Full/Custom toggle
  const handleHalfDayModeChange = (isCustom) => {
    setShowCustomHalfDay(isCustom);

    if (isCustom) {
      // When switching to custom, default to Full Day selections
      setHalfDayConfig({ start: "fullday", end: "fullday" });
    } else {
      // When switching to "Full days" mode, reset to 'none'
      setHalfDayConfig({ start: "none", end: "none" });
    }
  };

  // ++ UPDATED: Add startSession and endSession to payload
  const handleSubmit = async () => {
    if (loading) return;
    if (!startDate) {
      showNotification("Please select a start date", "error");
      return;
    }

    const payload = {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate || startDate),
      note,
      duration: calculateDays(),
      startSession: halfDayConfig.start,
      endSession: isMultiDay ? halfDayConfig.end : "none", 
    };

    const isSuccess = await onSubmit(payload);
    if (isSuccess) {
      if (onSuccess) onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white rounded-xl p-6 shadow-xl w-[90%] max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            Request Comp-Off
          </h2>
          <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              type="button"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
        </div>

        {/* Start Date */}
        <label className="block text-sm font-medium text-gray-700">
          Start Date
        </label>
        <DatePicker
          selected={startDate}
          onChange={(date) => {
            setStartDate(date);
            // Also update end date if it's not set or before new start date
            if (!endDate || endDate < date) {
              setEndDate(date);
            }
          }}
          className="border rounded px-3 py-2 w-full"
          maxDate={new Date()}
          placeholderText="Select start date"
        />

        {/* End Date */}
        <>
          <label className="block text-sm font-medium text-gray-700">
            End Date
          </label>
          <DatePicker
            selected={endDate}
            onChange={(date) => setEndDate(date)}
            className="border rounded px-3 py-2 w-full"
            maxDate={new Date()}
            minDate={startDate} // Ensures end date is on or after start date
            disabled={!startDate}
            placeholderText="Select end date"
          />
        </>

        {/* ++ NEW: Half Day Config UI (copied from RequestLeaveModal) */}
        <div className="space-y-3 pt-2">
          <div className="p-1 inline-flex items-center bg-gray-200 rounded-lg">
            <button
              type="button"
              onClick={() => handleHalfDayModeChange(false)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                !showCustomHalfDay
                  ? "bg-white text-gray-800 shadow"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Full days
            </button>
            <button
              type="button"
              onClick={() => handleHalfDayModeChange(true)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                showCustomHalfDay
                  ? "bg-white text-gray-800 shadow"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Custom
            </button>
          </div>

          {showCustomHalfDay && (
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border">
              {/* Start Date Section */}
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium text-gray-600">
                  From {formatDateForDisplay(startDate)}
                </label>
                <select
                  value={halfDayConfig.start}
                  onChange={(e) =>
                    setHalfDayConfig((p) => ({
                      ...p,
                      start: e.target.value,
                    }))
                  }
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="fullday">Full Day</option>
                  <option value="first">First Half</option>
                  <option value="second">Second Half</option>
                </select>
              </div>

              {/* End Date Section */}
              {isMultiDay && (
                <>
                  <div className="pt-8 text-gray-500 font-medium"> – </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-gray-600">
                      To {formatDateForDisplay(endDate)}
                    </label>
                    <select
                      value={halfDayConfig.end}
                      onChange={(e) =>
                        setHalfDayConfig((p) => ({
                          ...p,
                          end: e.target.value,
                        }))
                      }
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="fullday">Full Day</option>
                      <option value="first">First Half</option>
                      <option value="second">Second Half</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        {/* -- END of new UI -- */}

        {/* Note */}
        <label className="block text-sm font-medium text-gray-700">Note</label>
        <textarea
          maxLength="100"
          rows="3"
          cols="40"
          className="border rounded px-3 py-2 w-full"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Comment or note..."
        />

        {/* Days */}
        {startDate && (
          <div className="text-sm text-gray-600">
            <strong>Days:</strong> {calculateDays()}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-600 hover:text-gray-800 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-sm text-white ${
              loading ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {loading ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompOffRequestModal;