import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import axios from "axios";
import Select from "react-select";
import debounce from "lodash.debounce";
import { X, Calendar, Calculator, Info, Link as LinkIcon } from "lucide-react";
import { toast } from "react-toastify";
import { format } from "date-fns";
import DateRangePicker from "./DateRangePicker";
import { useLeaveDropdownOptions } from "../hooks/useLeaveDropdownOptions";
import { LeaveTypeDropdown } from "./RequestLeaveModal";
import { useAuth } from "../../../contexts/AuthContext";
import { countWeekdaysBetween } from "./RequestLeaveModal";
import Button from "../../../components/Button/Button";

const BASE_URL = window.__APP_CONFIG__.BASE_URL;

export default function ApplyLeaveOnBehalf({ isOpen, onClose, onSuccess, year }) {
  const { user } = useAuth();
  const userId = user?.user_id;

  // --- State ---
  const [selectedEmployee, setSelectedEmployee] = useState(null); // store full {value, label} object
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const hasFetchedInitial = useRef(false); // prevent re-fetching on every open

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [reason, setReason] = useState("");
  const [driveLink, setDriveLink] = useState("");
  const [showCustomHalfDay, setShowCustomHalfDay] = useState(false);
  const [halfDayConfig, setHalfDayConfig] = useState({ start: "none", end: "none" });

  const [balances, setBalances] = useState({ regular: [], genderBasedLeaveBalances: [] });
  const [holidays, setHolidays] = useState([]);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const employeeId = selectedEmployee?.value ?? "";

  // --- Reset ---
  const resetForm = useCallback(() => {
    setSelectedEmployee(null);
    setStartDate("");
    setEndDate("");
    setLeaveTypeId("");
    setReason("");
    setDriveLink("");
    setShowCustomHalfDay(false);
    setHalfDayConfig({ start: "none", end: "none" });
    setBalances({ regular: [], genderBasedLeaveBalances: [] });
  }, []);

  // --- Logic ---
  const weekdays = useMemo(() => {
    return countWeekdaysBetween(startDate, endDate, halfDayConfig, holidays, leaveTypeId);
  }, [startDate, endDate, halfDayConfig, holidays, leaveTypeId]);

  const allBalances = useMemo(() => balances?.regular ?? [], [balances]);
  const leaveTypeOptions = useLeaveDropdownOptions(allBalances);
  const selectedLeave = leaveTypeOptions.find((l) => l.leaveTypeId === leaveTypeId);

  const shouldShowDriveLink = useCallback(() => {
    if (!selectedLeave) return false;
    if (selectedLeave.requiresDocumentation) return true;
    if (leaveTypeId === "L-SL" && weekdays > 3) return true;
    return false;
  }, [selectedLeave, leaveTypeId, weekdays]);

  // --- Fetch employees (only once on first open) ---
  const fetchEmployees = useCallback(async (searchText) => {
    try {
      const res = await axios.get(`${BASE_URL}/api/employee/search/${userId}`, {
        params: { search: searchText, page: 0 },
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const formatted = res.data.data.map((emp) => ({
        value: String(emp.employeeId),
        label: emp.name,
      }));
      setEmployeeOptions(formatted);
    } catch (err) {
      toast.error("Failed to load employees");
    }
  }, [userId]);

  // Fetch initial list only once per mount
  useEffect(() => {
    if (isOpen && !hasFetchedInitial.current) {
      fetchEmployees("");
      hasFetchedInitial.current = true;
    }
    // Reset flag when modal is closed so next open re-fetches if needed
    if (!isOpen) {
      hasFetchedInitial.current = false;
    }
  }, [isOpen, fetchEmployees]);

  // Only search/filter on user typing — don't re-run when selecting
  const debouncedSearch = useMemo(
    () => debounce((inputValue) => {
      // Don't search if input is empty (already have initial list)
      if (inputValue.trim()) {
        fetchEmployees(inputValue);
      } else {
        fetchEmployees(""); // restore full list when cleared
      }
    }, 400),
    [fetchEmployees]
  );

  // Fetch balances when employee changes
  useEffect(() => {
    if (!employeeId) return;
    setLoadingBalances(true);
    axios
      .get(`${BASE_URL}/api/leave-balance/employee/${employeeId}/${year}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => setBalances(res.data.data))
      .finally(() => setLoadingBalances(false));
  }, [employeeId, year]);

  // Reset half-day if leave type doesn't support it
  useEffect(() => {
    if (leaveTypeId && selectedLeave && !selectedLeave.allowHalfDay) {
      setShowCustomHalfDay(false);
      setHalfDayConfig({ start: "none", end: "none" });
    }
  }, [leaveTypeId, selectedLeave]);

  // --- Handlers ---
  const handleStartDateChange = (date) => {
    if (!date) return;
    const dateString = format(date, "yyyy-MM-dd");
    setStartDate(dateString);
    if (!endDate || new Date(endDate) < new Date(dateString)) {
      setEndDate(dateString);
    }
  };

  const handleEndDateChange = (date) => {
    if (!date) return;
    setEndDate(format(date, "yyyy-MM-dd"));
  };

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, handleClose]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (shouldShowDriveLink() && !driveLink.trim()) {
      toast.warn("Please provide a drive link for documentation");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(
        `${BASE_URL}/api/leave-requests/apply-on-behalf`,
        {
          employeeId,
          leaveTypeId,
          startDate,
          endDate,
          reason,
          driveLink: shouldShowDriveLink() ? driveLink : null,
          daysRequested: weekdays,
          appliedBy: userId,
          startSession: halfDayConfig.start,
          endSession: startDate === endDate ? "none" : halfDayConfig.end,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      toast.success("Leave applied successfully");
      onSuccess?.();
      handleClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to apply leave");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden border flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-gray-50 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-800">Apply Leave on Behalf</h2>
          <button onClick={handleClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form */}
        <form className="p-6 space-y-5 overflow-y-auto custom-scrollbar pb-10" onSubmit={handleSubmit}>

          {/* Employee Selection */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Employee
            </label>
            <Select
              className="mt-1 text-sm"
              value={selectedEmployee}           // ← store whole object, no find() needed
              onChange={(opt) => {
                setSelectedEmployee(opt ?? null); // ← save full {value, label}
                setLeaveTypeId("");
              }}
              onInputChange={(inputValue, { action }) => {
                // Only search on actual typing, not on menu-close or value-select
                if (action === "input-change") {
                  debouncedSearch(inputValue);
                }
              }}
              options={employeeOptions}
              placeholder="Search employee..."
              isClearable
              menuPortalTarget={document.body}
              styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
            />
          </div>

          {/* Date Range & Counter */}
          <div className="grid grid-cols-2 gap-3 bg-gray-50 p-4 rounded-xl border border-dashed border-gray-200">
            <DateRangePicker
              label="Start Date"
              defaultDate={startDate ? new Date(startDate) : null}
              onChange={handleStartDateChange}
              disabledDays={[{ dayOfWeek: [0, 6] }, ...holidays]}
            />
            <DateRangePicker
              label="End Date"
              defaultDate={endDate ? new Date(endDate) : null}
              onChange={handleEndDateChange}
              disabledDays={[
                { dayOfWeek: [0, 6] },
                ...holidays,
                startDate ? { before: new Date(startDate) } : {},
              ]}
              align="right"
            />
            <div className="col-span-2 flex items-center justify-between pt-2 border-t border-gray-200">
              <span className="flex items-center gap-1 text-xs font-bold text-indigo-600">
                <Calculator size={14} /> {weekdays} {weekdays === 1 ? "Day" : "Days"}
              </span>
              <span className="text-[10px] text-gray-400 font-medium">
                {leaveTypeId === "L-ML" ? "Includes All Days" : "Excludes Weekends"}
              </span>
            </div>
          </div>

          {/* Half-Day Functionality */}
          {selectedLeave && selectedLeave.allowHalfDay && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
              <div className="p-1 inline-flex items-center bg-gray-100 rounded-lg border">
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomHalfDay(false);
                    setHalfDayConfig({ start: "none", end: "none" });
                  }}
                  className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                    !showCustomHalfDay ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Full Days
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomHalfDay(true);
                    setHalfDayConfig({ start: "fullday", end: "fullday" });
                  }}
                  className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                    showCustomHalfDay ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Custom (Half-Day)
                </button>
              </div>

              {showCustomHalfDay && (
                <div className="flex items-start gap-3 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold text-indigo-600 uppercase">Start Day</label>
                    <select
                      value={halfDayConfig.start}
                      onChange={(e) => setHalfDayConfig((p) => ({ ...p, start: e.target.value }))}
                      className="w-full p-2 bg-white border border-indigo-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="fullday">Full Day</option>
                      <option value="first">First Half</option>
                      <option value="second">Second Half</option>
                    </select>
                  </div>
                  {startDate !== endDate && (
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-indigo-600 uppercase">End Day</label>
                      <select
                        value={halfDayConfig.end}
                        onChange={(e) => setHalfDayConfig((p) => ({ ...p, end: e.target.value }))}
                        className="w-full p-2 bg-white border border-indigo-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="fullday">Full Day</option>
                        <option value="first">First Half</option>
                        <option value="second">Second Half</option>
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Leave Type Selection */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Leave Type
            </label>
            {!employeeId ? (
              <div className="mt-1 p-3 text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed italic">
                Select employee first to see available balances...
              </div>
            ) : (
              <div className="mt-1">
                <LeaveTypeDropdown
                  options={leaveTypeOptions}
                  selectedId={leaveTypeId}
                  setSelectedId={setLeaveTypeId}
                />
              </div>
            )}
            {selectedLeave && (
              <p className="mt-2 text-[11px] text-emerald-600 font-bold flex items-center gap-1 px-1">
                <Info size={12} /> Available Balance: {selectedLeave.availableDays} Days
              </p>
            )}
          </div>

          {/* Drive Link */}
          {shouldShowDriveLink() && (
            <div className="space-y-1 animate-in zoom-in-95 duration-200">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex justify-between">
                <span>Supporting Document (Drive Link)</span>
                <span className="text-red-500 text-xs">* Required</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <LinkIcon size={14} />
                </div>
                <input
                  type="url"
                  placeholder="Paste Google Drive link here..."
                  value={driveLink}
                  onChange={(e) => setDriveLink(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-indigo-200 bg-indigo-50/30 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
              <p className="text-[10px] text-gray-400 italic px-1">
                {leaveTypeId === "L-SL"
                  ? "Medical certificate link is mandatory for sick leave exceeding 3 days."
                  : "This leave type requires documentation."}
              </p>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Reason
            </label>
            <textarea
              placeholder="Note for the record..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none mt-1 min-h-[80px]"
              required
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-100 bg-white flex-shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !employeeId || !leaveTypeId || weekdays <= 0}
            variant="primary"
            loading={submitting}
            loadingText="Applying..."
          >
            Confirm & Apply
          </Button>
        </div>
      </div>
    </div>
  );
}