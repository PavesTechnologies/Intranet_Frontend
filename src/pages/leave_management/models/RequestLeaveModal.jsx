import React, { useState, useEffect, Fragment, useMemo } from "react";
import axios from "axios";
import { X } from "lucide-react";
import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { useAuth } from "../../../contexts/AuthContext";
import { toast } from "react-toastify";
import { format } from "date-fns";
import DateRangePicker from "./DateRangePicker";
// import {useLeaveConsumption} from "../hooks/useLeaveConsumption";
import { useLeaveDropdownOptions } from "../hooks/useLeaveDropdownOptions";

const BASE_URL = import.meta.env.VITE_BASE_URL;
// const token = localStorage.getItem("token");

// -- Helper: Massage leaves to dropdown options --
// function mapLeaveBalancesToDropdown(balances) {
//   // This helper function remains unchanged.
//   const [leaveTypes, setLeaveTypes] = useState([]);
//   const fetchLeaveTypes = async () => {
//     try {
//       const res = await axios.get(`${BASE_URL}/api/leave/types`, {
//         headers: {
//           Authorization: `Bearer ${localStorage.getItem("token")}`,
//         },
//       });
//       setLeaveTypes(res.data);
//     } catch (err) {
//       toast.error(response?.data?.message || err || "Failed to load leave type details.");
//     }
//   };
//   useEffect(() => {
//     fetchLeaveTypes();
//   }, []);

//   return balances.map((balance) => {
//     const leaveTypeId = balance.leaveType.leaveTypeId;
//     const originalName = balance.leaveType.leaveName.replace(/^L-/, "");

//     const matchingType = leaveTypes.find(
//       (type) => type.name === balance.leaveType.leaveName
//     );
//     const leaveName = matchingType ? matchingType.label : originalName;

//     let availableText;
//     let isInfinite = false;
//     if (leaveTypeId === "L-UP" || leaveName.toLowerCase().includes("unpaid")) {
//       availableText = "infinite balance";
//       isInfinite = true;
//     } else if (balance.remainingLeaves > 0) {
//       availableText =
//         (balance.remainingLeaves % 1 === 0
//           ? balance.remainingLeaves
//           : balance.remainingLeaves), " days available";
//     } else {
//       availableText = "Not Available";
//     }
//     return {
//       balanceId: balance.balanceId,
//       leaveTypeId,
//       leaveName,
//       availableText,
//       availableDays: isInfinite ? Infinity : balance.remainingLeaves,
//       isInfinite,
//       disabled: (!isInfinite && balance.remainingLeaves <= 0) || balance.isBlocked,
//       allowHalfDay: !!balance.leaveType.allowHalfDay,
//       requiresDocumentation: !!balance.leaveType.requiresDocumentation,
//       raw: balance,
//     };
//   });
// }

// -- Helpers: Date logic --
function getTodayDateString() {
  return new Date().toISOString().split("T")[0];
}
function isWeekend(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d.getDay() === 0 || d.getDay() === 6;
}

// ** NEW Helper to format dates for the UI **
function formatDateForDisplay(dateStr) {
  if (!dateStr) return "";
  // Add time component to ensure date is parsed in local timezone, not UTC
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// --- MODIFIED ---
// Updated function signature to accept leaveTypeId
export function countWeekdaysBetween(
  fromDate,
  toDate,
  halfDayConfig,
  holidays = [],
  leaveTypeId = null, // --- NEW ---
) {
  if (!fromDate || !toDate || !halfDayConfig) return 0;

  // --- NEW ---
  // Assuming 'L-ML' is the ID for Maternity Leave.
  // Change this ID if yours is different.
  const isMaternityLeave = leaveTypeId === "L-ML";

  const holidaySet = new Set(
    holidays
      .filter(Boolean)
      .map((h) => {
        // Accept both Date objects and strings (yyyy-MM-dd)
        if (h instanceof Date && !isNaN(h)) {
          return new Date(h.getTime() - h.getTimezoneOffset() * 60000)
            .toISOString()
            .split("T")[0];
        }
        if (typeof h === "string") return h;
        return null;
      })
      .filter(Boolean),
  );

  let total = 0;

  // Work in UTC to avoid TZ drift
  const current = new Date(fromDate + "T00:00:00Z");
  const end = new Date(toDate + "T00:00:00Z");

  while (current <= end) {
    const dayOfWeek = current.getUTCDay(); // 0 Sun, 6 Sat
    const currentDateStr = current.toISOString().split("T")[0];

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidaySet.has(currentDateStr);

    // --- MODIFIED ---
    // If it's maternity leave, count ALL days.
    // Otherwise, follow the original logic of skipping weekends/holidays.
    if (isMaternityLeave || (!isWeekend && !isHoliday)) {
      const isStartDate = currentDateStr === fromDate;
      const isEndDate = currentDateStr === toDate;

      // This logic correctly handles half-days.
      // We assume Maternity Leave will have `allowHalfDay: false`,
      // so halfDayConfig will be {start: 'none', end: 'none'},
      // which correctly resolves to 1 day for start and end.
      if (isStartDate) {
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
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return total;
}

// -- The HeadlessUI Leave Type Dropdown -- (Unchanged)
export function LeaveTypeDropdown({ options, selectedId, setSelectedId }) {
  const sel = options.find((o) => o.leaveTypeId === selectedId) ?? null;
  return (
    <Listbox value={sel} onChange={(opt) => setSelectedId(opt.leaveTypeId)}>
      <div className="relative mt-1">
        <Listbox.Button className="cursor-default w-full rounded-lg border border-gray-300 py-2 pl-4 pr-12 text-left shadow-sm focus:ring-2 focus:ring-indigo-500 bg-white transition font-medium">
          <span className="flex items-center justify-between">
            <span>
              {sel ? (
                sel.leaveName
              ) : (
                <span className="text-gray-400">Select leave type</span>
              )}
            </span>
            <span
              className={`text-xs ml-4 ${
                sel?.disabled ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {sel?.availableText}
            </span>
          </span>
          <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <ChevronUpDownIcon className="h-5 w-5 text-gray-400" />
          </span>
        </Listbox.Button>
        <Transition
          as={Fragment}
          leave="transition opacity-100 duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute z-40 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white py-1 shadow-xl ring-1 ring-black ring-opacity-5">
            {options.map((option) => (
              <Listbox.Option
                key={option.leaveTypeId}
                value={option}
                disabled={option.disabled}
                className={({ active, disabled }) =>
                  `py-3 px-4 flex items-center justify-between cursor-pointer select-none ${
                    active && !disabled ? "bg-indigo-50 text-indigo-900" : ""
                  } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`
                }
              >
                {({ selected }) => (
                  <>
                    <span
                      className={`${selected ? "font-medium" : ""} ${
                        option.disabled ? "text-gray-400" : ""
                      }`}
                    >
                      {option.leaveName}
                    </span>
                    <span
                      className={`ml-4 text-xs ${
                        option.disabled ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {option.availableText}
                    </span>
                    {selected && (
                      <span className="absolute inset-y-0 right-2 flex items-center text-indigo-600">
                        <CheckIcon className="h-4 w-4" />
                      </span>
                    )}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}

// ---- THE MAIN MODAL COMPONENT ----
export default function RequestLeaveModal({
  isOpen,
  onClose,
  onSuccess,
  year,
}) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [reason, setReason] = useState("");
  const [showCustomHalfDay, setShowCustomHalfDay] = useState(false);
  const [holidays, setHolidays] = useState([]);
  const [halfDayConfig, setHalfDayConfig] = useState({
    start: "none",
    end: "none",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [balances, setBalances] = useState({
    regular: [],
    genderBasedLeaveBalances: [],
  });
  const allBalances = useMemo(
    () => [
      ...(balances?.regular ?? []),
      ...(balances?.genderBasedLeaveBalances ?? []),
    ],
    [balances],
  );
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [balanceError, setBalanceError] = useState("");
  const [driveLink, setDriveLink] = useState("");
  // const leaveTypeOptions = mapLeaveBalancesToDropdown(balances);
  const leaveTypeOptions = useLeaveDropdownOptions(allBalances);
  const selectedLeaveType = leaveTypeOptions.find(
    (o) => o.leaveTypeId === leaveTypeId,
  );

  const employeeId = useAuth()?.user?.user_id;

  const isMultiDay = startDate && endDate && startDate !== endDate;
  // --- MODIFIED --- Pass leaveTypeId to the calculation
  const weekdays = countWeekdaysBetween(
    startDate,
    endDate,
    halfDayConfig,
    holidays,
    leaveTypeId,
  );

 

  const shouldShowDriveLink = () => {
    if (!selectedLeaveType) return false;
    const requiredDocs = selectedLeaveType.requiresDocumentation === true;
    const isSickLeave = selectedLeaveType.leaveTypeId === "L-SL";
    const enoughDays = weekdays > 3;

    if (isSickLeave) {
      return enoughDays;
    }
    return requiredDocs;
  };

  // const leaveTypeOptions = useLeaveDropdownOptions(allBalances)

  useEffect(() => {
    if (!isOpen) {
      // Use a small timeout to prevent content from disappearing before the closing animation is complete.
      setTimeout(() => {
        setStartDate("");
        setEndDate("");
        setLeaveTypeId("");
        setReason("");
        setShowCustomHalfDay(false);
        setHalfDayConfig({ start: "none", end: "none" });
        setDriveLink("");
        setError("");
        setSuccess("");
      }, 200); // 200ms delay
    }
  }, [isOpen]);

  

  useEffect(() => {
    if (!shouldShowDriveLink()) {
      setDriveLink("");
    }
  }, [leaveTypeId, weekdays]);

  useEffect(() => {
    if (leaveTypeId && selectedLeaveType && !selectedLeaveType.allowHalfDay) {
      setShowCustomHalfDay(false);
      setHalfDayConfig({ start: "none", end: "none" });
    }
  }, [leaveTypeId, selectedLeaveType]);

  useEffect(() => {
    if (!isOpen) return;
    setLoadingBalances(true);
    axios
      .get(`${BASE_URL}/api/leave-balance/employee/${employeeId}/${year}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((response) => {
        console.log(response.data.data);
        setBalances(response.data.data);
        setLoadingBalances(false);
      })
      .catch(() => {
        setBalanceError("Failed to load leave balances.");
        setLoadingBalances(false);
      });
    const fetchHolidays = async () => {
      try {
        // Replace with your actual holiday API endpoint
        const res = await axios.get(
          `${BASE_URL}/api/holidays/by-location/${year}`,
          {
            params: { state: "All", country: "India" },
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );

        // Map the JSON response to an array of Date objects
        const holidayDates = res.data.data.map((holiday) => {
          const [y, m, d] = holiday.holidayDate.split("-").map(Number);
          return new Date(y, (m ?? 1) - 1, d ?? 1);
        });
        setHolidays(holidayDates);
      } catch (err) {
        toast.error("Could not load company holidays.");
      }
    };

    fetchHolidays();
  }, [isOpen, employeeId]);

  const handleStartDateChange = (date) => {
    if (!date) return;
    const dateString = format(date, "yyyy-MM-dd");

    setStartDate(dateString);
    // If end date is not set or is before the new start date, update it
    if (!endDate || new Date(endDate) < new Date(dateString)) {
      setEndDate(dateString);
    }
  };
  const handleEndDateChange = (date) => {
    if (!date) return;
    const dateString = format(date, "yyyy-MM-dd");
    setEndDate(dateString);
  };

  const handleHalfDayModeChange = (isCustom) => {
    setShowCustomHalfDay(isCustom);

    if (isCustom) {
      setHalfDayConfig({ start: "fullday", end: "fullday" });
    } else {
      setHalfDayConfig({ start: "none", end: "none" });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    // --- MODIFIED --- Pass leaveTypeId to the calculation
    const daysRequested = countWeekdaysBetween(
      startDate,
      endDate,
      halfDayConfig,
      holidays,
      leaveTypeId,
    );

    const payload = {
      employeeId: employeeId,
      leaveTypeId,
      startDate,
      endDate: endDate || startDate,
      daysRequested,
      year,
      reason,
      // isHalfDay: showCustomHalfDay,
      startSession: halfDayConfig.start,
      endSession: isMultiDay ? halfDayConfig.end : "none",
      // halfDayDetails: showCustomHalfDay ? {
      //   start: halfDayConfig.start,
      //   end: isMultiDay ? halfDayConfig.end : 'none',
      // } : null,
      ...(shouldShowDriveLink() && { driveLink: driveLink }),
    };

    try {
      await axios.post(`${BASE_URL}/api/leave-requests/apply`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setSuccess("Leave request submitted!");
      toast.success("Leave request submitted successfully.");
      onSuccess?.();

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError(
        "Failed to submit leave request: " +
          (err.response?.data?.message || err.message),
      );
      toast.error("Failed to submit leave request: ");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-2 sm:mx-4 max-h-[90vh] overflow-y-auto border border-gray-100 relative">
        <div className="sticky top-0 bg-white z-10 p-3 border-b border-gray-200 ">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Request Leave</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              type="button"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">
          {(error || success) && (
            <div
              className={`rounded-xl p-3 ${
                error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
              }`}
            >
              <p className="font-medium">{error || success}</p>
            </div>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <DateRangePicker
              label={
                <>
                  Start Date <span className="text-red-500">*</span>
                </>
              }
              defaultDate={startDate ? new Date(startDate + "T00:00:00") : null}
              onChange={handleStartDateChange}
              defaultMonth={
                startDate ? new Date(startDate + "T00:00:00") : null
              }
              disabledDays={[{ dayOfWeek: [0, 6] }, ...holidays]}
              year={year}
            />
            <DateRangePicker
              label={
                <>
                  End Date <span className="text-red-500">*</span>
                </>
              }
              defaultDate={endDate ? new Date(endDate + "T00:00:00") : null}
              onChange={handleEndDateChange}
              defaultMonth={
                endDate
                  ? new Date(endDate + "T00:00:00")
                  : startDate
                    ? new Date(startDate + "T00:00:00")
                    : null
              }
              align="right"
              disabledDays={[
                { dayOfWeek: [0, 6] },
                ...holidays,
                startDate ? { before: new Date(startDate + "T00:00:00") } : {},
              ]}
              year={year}
            />
          </div>
          <div className="text-center space-y-1">
            <span className="inline-flex items-center px-2 py-1 bg-indigo-50 text-indigo-700 text-sm font-semibold rounded-md border border-indigo-200 shadow-sm">
              {weekdays} {weekdays === 1 ? "day" : "days"}
            </span>
            <p className="text-xs text-gray-500">
              {/* --- NEW --- Dynamically change helper text */}
              {leaveTypeId === "L-ML"
                ? "All days are included."
                : "Weekends and Holidays are excluded."}
            </p>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Leave Type <span className="text-red-500">*</span>
            </label>
            {loadingBalances ? (
              <div className="flex items-center justify-center p-4 text-gray-500 text-sm rounded-xl bg-gray-50">
                <span className="animate-pulse mr-2 rotate-45">⏳</span>{" "}
                Loading...
              </div>
            ) : balanceError ? (
              <div className="text-red-600 text-sm bg-red-50 rounded-xl p-2">
                {balanceError}
              </div>
            ) : (
              <LeaveTypeDropdown
                options={leaveTypeOptions}
                selectedId={leaveTypeId}
                setSelectedId={setLeaveTypeId}
              />
            )}
          </div>

          {selectedLeaveType && selectedLeaveType.allowHalfDay && (
            <div className="space-y-3">
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
                // ** UPDATED UI with date labels and more flexible options **
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border">
                  {/* Start Date Section */}
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-gray-600">
                      Start Day {formatDateForDisplay(startDate)}
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
                          End Day {formatDateForDisplay(endDate)}
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
          )}

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              maxLength="100"
              rows="3"
              cols="40"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Add a reason"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {shouldShowDriveLink() && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Supporting Document (Google Drive Link){" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={driveLink}
                onChange={(e) => setDriveLink(e.target.value)}
                placeholder="https://drive.google.com/..."
                required={shouldShowDriveLink()}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              {selectedLeaveType?.leaveTypeId === "L-SL" && weekdays > 3 && (
                <p className="text-xs text-gray-500 mt-1">
                  For sick leave exceeding 3 days, please attach supporting
                  document.
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-5 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-lg font-medium text-gray-800 border border-gray-300 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-3 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={
                submitting ||
                loadingBalances ||
                !startDate ||
                !endDate ||
                !leaveTypeId
              }
            >
              {submitting ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin mr-2">⟳</span> Requesting...
                </span>
              ) : (
                "Request Leave"
              )}
            </button>
          </div>
        </form>
        <style>{`
           @keyframes fadeIn {
             from { opacity: 0; transform: translateY(8px) scale(0.98);}
             to {opacity: 1; transform: translateY(0) scale(1);}
           }
           .animate-fadeIn {animation: fadeIn 0.25s ease-out;}
         `}</style>
      </div>
    </div>
  );
}
