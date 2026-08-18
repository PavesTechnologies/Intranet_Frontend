import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import api from "../../../api/axiosInstance";
import Select from "react-select";
import debounce from "lodash.debounce";
import { Calculator, Info, Link as LinkIcon } from "lucide-react";
import { toast } from "react-toastify";
import { format } from "date-fns";
import DateRangePicker from "./DateRangePicker";
import { useLeaveDropdownOptions } from "../hooks/useLeaveDropdownOptions";
import { LeaveTypeDropdown } from "./RequestLeaveModal";
import { useAuth } from "../../../contexts/AuthContext";
import { countWeekdaysBetween } from "./RequestLeaveModal";
import Button from "../../../components/Button/Button";
import Modal from "../../../components/Modal/modal";
import FormSelect from "../../../components/forms/FormSelect";
import FormTextArea from "../../../components/forms/FormTextArea";

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
      const res = await api.get(`${BASE_URL}/api/employee/search/${userId}`, {
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
    api
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

  // Escape-to-close is now owned by the canonical Modal (closeOnEscape),
  // wired to handleClose via the onClose prop below — no local listener needed.

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (shouldShowDriveLink() && !driveLink.trim()) {
      toast.warn("Please provide a drive link for documentation");
      return;
    }

    setSubmitting(true);
    try {
      await api.post(
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Apply Leave on Behalf"
      size="lg"
      maxHeight="max-h-[90vh]"
      bodyClassName="p-0"
      // The original overlay had no backdrop-click handler at all (inert
      // backdrop) — preserved explicitly since canonical Modal defaults to
      // closeOnBackdrop=true.
      closeOnBackdrop={false}
      footer={
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            onClick={handleClose}
            variant="outline"
            className="text-sm font-semibold text-gray-500 hover:text-gray-700"
          >
            Cancel
          </Button>
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
      }
    >
      <form className="p-6 space-y-5" onSubmit={handleSubmit}>

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
              year={year}
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
              year={year}
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
                    <FormSelect
                      name="halfDayStart"
                      options={[
                        { value: "fullday", label: "Full Day" },
                        { value: "first", label: "First Half" },
                        { value: "second", label: "Second Half" },
                      ]}
                      value={halfDayConfig.start}
                      onChange={(e) => setHalfDayConfig((p) => ({ ...p, start: e.target.value }))}
                    />
                  </div>
                  {startDate !== endDate && (
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-indigo-600 uppercase">End Day</label>
                      <FormSelect
                        name="halfDayEnd"
                        options={[
                          { value: "fullday", label: "Full Day" },
                          { value: "first", label: "First Half" },
                          { value: "second", label: "Second Half" },
                        ]}
                        value={halfDayConfig.end}
                        onChange={(e) => setHalfDayConfig((p) => ({ ...p, end: e.target.value }))}
                      />
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
          <FormTextArea
            label="Reason"
            name="behalfLeaveReason"
            placeholder="Note for the record..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
      </form>
    </Modal>
  );
}