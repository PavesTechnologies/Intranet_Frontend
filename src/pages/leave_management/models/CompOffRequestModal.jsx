import React, { useState, useEffect, Fragment } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import FilterListbox from "../../../components/filter/FilterListbox";
import { useNotification } from "../../../contexts/NotificationContext";
import { X, CalendarDays, StickyNote, Clock } from "lucide-react";
import Button from "../../../components/Button/Button";

function formatDateForDisplay(date) {
  if (!date) return "";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const SectionLabel = ({ icon: Icon, children }) => (
  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
    {Icon && <Icon className="w-3.5 h-3.5" />}
    {children}
  </label>
);

const StyledDatePicker = ({ ...props }) => (
  <DatePicker
    {...props}
    className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed"
    wrapperClassName="w-full"
  />
);

const CompOffRequestModal = ({ onSuccess, onSubmit, onClose, loading }) => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [note, setNote] = useState("");
  const { showNotification } = useNotification();

  const [showCustomHalfDay, setShowCustomHalfDay] = useState(false);
  const [halfDayConfig, setHalfDayConfig] = useState({
    start: "none",
    end: "none",
  });

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
  }, [onClose]);

  const formatDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const isMultiDay =
    startDate && endDate && formatDate(startDate) !== formatDate(endDate);

  const calculateDays = () => {
    if (!startDate) return 0;
    const start = new Date(startDate.setHours(0, 0, 0, 0));
    const end = endDate
      ? new Date(endDate.setHours(0, 0, 0, 0))
      : new Date(start);
    if (end < start) return 0;
    let total = 0;
    const current = new Date(start);
    while (current <= end) {
      const isStartDate = current.getTime() === start.getTime();
      const isEndDate = current.getTime() === end.getTime();
      if (isStartDate && isEndDate) {
        total +=
          halfDayConfig.start === "first" || halfDayConfig.start === "second"
            ? 0.5
            : 1;
      } else if (isStartDate) {
        total +=
          halfDayConfig.start === "first" || halfDayConfig.start === "second"
            ? 0.5
            : 1;
      } else if (isEndDate) {
        total +=
          halfDayConfig.end === "first" || halfDayConfig.end === "second"
            ? 0.5
            : 1;
      } else {
        total += 1;
      }
      current.setDate(current.getDate() + 1);
    }
    return total;
  };

  const handleHalfDayModeChange = (isCustom) => {
    setShowCustomHalfDay(isCustom);
    setHalfDayConfig(
      isCustom
        ? { start: "fullday", end: "fullday" }
        : { start: "none", end: "none" },
    );
  };

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

  const days = calculateDays();

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Request Comp-Off
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Submit compensatory leave request
            </p>
          </div>
          <Button
            onClick={onClose}
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <SectionLabel icon={CalendarDays}>Start Date</SectionLabel>
              <StyledDatePicker
                selected={startDate}
                onChange={(date) => {
                  setStartDate(date);
                  if (!endDate || endDate < date) setEndDate(date);
                }}
                maxDate={new Date()}
                placeholderText="DD Mon YYYY"
              />
            </div>
            <div>
              <SectionLabel icon={CalendarDays}>End Date</SectionLabel>
              <StyledDatePicker
                selected={endDate}
                onChange={(date) => setEndDate(date)}
                maxDate={new Date()}
                minDate={startDate}
                disabled={!startDate}
                placeholderText="DD Mon YYYY"
              />
            </div>
          </div>

          {/* Half Day Toggle */}
          <div className="space-y-3">
            <SectionLabel icon={Clock}>Duration Type</SectionLabel>
            <div className="p-1 inline-flex items-center bg-gray-100 rounded-lg w-full">
              {["Full days", "Custom"].map((label, i) => {
                const isActive =
                  i === 0 ? !showCustomHalfDay : showCustomHalfDay;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleHalfDayModeChange(i === 1)}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                      isActive
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {showCustomHalfDay && (
              <div className="flex items-start gap-3 p-4 bg-indigo-50/60 rounded-xl border border-indigo-100">
                <div className="flex-1 space-y-1.5">
                  <p className="text-xs font-semibold text-indigo-600">
                    From {formatDateForDisplay(startDate)}
                  </p>
                  <FilterListbox
                    options={[
                      { value: "fullday", label: "Full Day" },
                      { value: "first", label: "First Half" },
                      { value: "second", label: "Second Half" },
                    ]}
                    value={halfDayConfig.start}
                    onChange={(val) =>
                      setHalfDayConfig((p) => ({ ...p, start: val }))
                    }
                  />
                </div>

                {isMultiDay && (
                  <>
                    <div className="pt-8 text-gray-400 font-light text-lg select-none">
                      →
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <p className="text-xs font-semibold text-indigo-600">
                        To {formatDateForDisplay(endDate)}
                      </p>
                      <FilterListbox
                        options={[
                          { value: "fullday", label: "Full Day" },
                          { value: "first", label: "First Half" },
                          { value: "second", label: "Second Half" },
                        ]}
                        value={halfDayConfig.end}
                        onChange={(val) =>
                          setHalfDayConfig((p) => ({ ...p, end: val }))
                        }
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Duration Badge */}
          {startDate && (
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-sm text-gray-500 font-medium">
                Total Duration
              </span>
              <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                {days} {days === 1 ? "day" : "days"}
              </span>
            </div>
          )}

          {/* Note */}
          <div>
            <SectionLabel icon={StickyNote}>Note</SectionLabel>
            <textarea
              maxLength={100}
              rows={3}
              className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a reason or note..."
            />
            <p className="text-right text-xs text-gray-400 mt-1">
              {note.length}/100
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <Button
            onClick={onClose}
            disabled={loading}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="primary"
            size="medium"
            loading={loading}
            loadingText="Submitting..."
            disabled={!startDate}
          >
            Submit Request
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CompOffRequestModal;
