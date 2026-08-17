import React, { useState, useEffect, Fragment, useMemo } from "react";
import api from "../../../api/axiosInstance";
import FormSelect from "../../../components/forms/FormSelect";
import FormInput from "../../../components/forms/FormInput";
import {
  Lock,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { toast } from "react-toastify";
import { format } from "date-fns";
import { useRecordLock } from "../hooks/useRecordLock";
import { useAuth } from "../../../contexts/AuthContext";
import DateRangePicker from "./DateRangePicker";
import { useLeaveDropdownOptions } from "../hooks/useLeaveDropdownOptions";
import Button from "../../../components/Button/Button";
import Modal from "../../../components/Modal/modal";

const BASE_URL = window.__APP_CONFIG__.BASE_URL;
const GENDER_BASED_IDS = ["L-ML", "L-PL"];

// --- Helper 1: Maps leave balances to dropdown options ---
export function mapLeaveBalancesToDropdown(balances, leaveTypes) {
  const allBalances = [
    ...(balances?.data?.regular ?? []),
    ...(balances?.data?.genderBasedLeaveBalances ?? []),
  ];

  return allBalances.map((balance) => {
    const leaveTypeId = balance.leaveType?.leaveTypeId;
    const originalName = balance.leaveType?.leaveName;
    const matchingType = leaveTypes.find((type) => type.name === originalName);
    const leaveName = matchingType
      ? matchingType.label
      : (originalName || "").replace(/^L-/, "");

    const isGenderBased = GENDER_BASED_IDS.includes(leaveTypeId);
    const remaining = isGenderBased
      ? balance.remainingDays
      : balance.remainingLeaves;

    let availableText;
    let isInfinite = false;

    if (leaveTypeId === "L-UP" || leaveName.toLowerCase().includes("unpaid")) {
      availableText = "Infinite balance";
      isInfinite = true;
    } else if (remaining > 0) {
      availableText = `${remaining} days available`;
    } else {
      availableText = "Not Available";
    }

    return {
      leaveTypeId,
      leaveName,
      availableText,
      availableDays: isInfinite ? Infinity : remaining,
      isInfinite,
      disabled: (!isInfinite && remaining <= 0) || balance.isBlocked,
      allowHalfDay: !!balance.leaveType?.allowHalfDay,
      requiresDocumentation: !!balance.leaveType?.requiresDocumentation,
    };
  });
}

// --- Helper 2: Date Formatting ---
function formatDateForDisplay(dateStr) {
  if (!dateStr) return "";
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// --- Helper 3: Day calculation ---
function countWeekdaysBetween(
  fromDate,
  toDate,
  halfDayConfig,
  holidays = [],
  includeNonWorkingDays = false,
) {
  if (!fromDate || !toDate || !halfDayConfig) return 0;

  const holidaySet = new Set(
    holidays
      .filter(Boolean)
      .map((h) => {
        if (h instanceof Date && !isNaN(h))
          return new Date(h.getTime() - h.getTimezoneOffset() * 60000)
            .toISOString()
            .split("T")[0];
        if (typeof h === "string") return h;
        return null;
      })
      .filter(Boolean),
  );

  let total = 0;
  const current = new Date(fromDate + "T00:00:00Z");
  const end = new Date(toDate + "T00:00:00Z");

  while (current <= end) {
    const dayOfWeek = current.getUTCDay();
    const currentDateStr = current.toISOString().split("T")[0];
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidaySet.has(currentDateStr);

    if (includeNonWorkingDays || (!isWeekend && !isHoliday)) {
      const isStartDate = currentDateStr === fromDate;
      const isEndDate = currentDateStr === toDate;

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
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return total;
}

// --- Leave Type Dropdown ---
function LeaveTypeDropdown({ options, selectedId, setSelectedId }) {
  const sel = options.find((o) => o.leaveTypeId === selectedId) ?? null;
  return (
    <Listbox value={sel} onChange={(opt) => setSelectedId(opt.leaveTypeId)}>
      <div className="relative mt-1">
        <Listbox.Button className="cursor-default w-full rounded-xl border border-gray-200 py-2.5 pl-4 pr-12 text-left bg-gray-50 hover:bg-white hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-150 shadow-sm">
          <span className="flex items-center justify-between">
            <span>
              {sel ? (
                <span className="font-semibold text-gray-800 text-sm">
                  {sel.leaveName}
                </span>
              ) : (
                <span className="text-gray-400 text-sm">Select leave type</span>
              )}
            </span>
            <span
              className={`text-xs ml-4 font-medium px-2 py-0.5 rounded-full ${
                sel?.isInfinite
                  ? "bg-blue-50 text-blue-600"
                  : sel?.disabled
                    ? "bg-red-50 text-red-400"
                    : "bg-green-50 text-green-600"
              }`}
            >
              {sel?.availableText}
            </span>
          </span>
          <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />
          </span>
        </Listbox.Button>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute z-40 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white py-1 shadow-2xl ring-1 ring-black/5 border border-gray-100">
            {options.map((option) => (
              <Listbox.Option
                key={option.leaveTypeId}
                value={option}
                disabled={option.disabled}
                className={({ active, disabled }) =>
                  `py-2.5 px-4 flex items-center justify-between cursor-pointer select-none transition-colors ${
                    active && !disabled ? "bg-indigo-50" : ""
                  } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`
                }
              >
                {({ selected }) => (
                  <>
                    <span
                      className={`text-sm font-medium ${selected ? "text-indigo-700" : "text-gray-800"}`}
                    >
                      {option.leaveName}
                    </span>
                    <span
                      className={`ml-2 text-xs font-medium px-2  py-0.5 rounded-full ${
                        option.isInfinite
                          ? "bg-blue-50 text-blue-500"
                          : option.disabled
                            ? "bg-red-50 text-red-400"
                            : "text-grey-600"
                      }`}
                    >
                      {option.availableText}
                    </span>
                    {selected && (
                      <CheckIcon className="h-4 w-4 text-indigo-600 ml-2 shrink-0" />
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

// ---- Main Modal ----
export default function EditLeaveModal({
  isOpen,
  onClose,
  initialData,
  leaveBalances,
  onSuccess,
  year,
}) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [reason, setReason] = useState("");
  const [driveLink, setDriveLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [showCustomHalfDay, setShowCustomHalfDay] = useState(false);
  const [halfDayConfig, setHalfDayConfig] = useState({
    start: "none",
    end: "none",
  });
  const [balanceWarning, setBalanceWarning] = useState("");

  const { user } = useAuth();
  const { locked, lockedBy, lockMessage, manualReleaseLock } = useRecordLock({
    tableName: "leave_request",
    recordId: initialData?.leaveId,
    user: user?.name,
  });
  const isLockedByOther = locked && lockedBy && lockedBy !== user?.name;

  // Fetch leave types and holidays on open
  useEffect(() => {
    if (!isOpen || !initialData) return;

    const fetchLeaveTypes = async () => {
      try {
        const res = await api.get(`${BASE_URL}/api/leave/types`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setLeaveTypes(res.data);
      } catch (err) {
        toast.error(err?.message || "Failed to load leave type details.");
      }
    };

    const fetchHolidays = async () => {
      try {
        const res = await api.get(
          `${BASE_URL}/api/holidays/by-location/${year}`,
          {
            params: { state: "All", country: "India" },
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        const holidayDates = res.data.data.map(
          (holiday) => new Date(holiday.holidayDate + "T00:00:00"),
        );
        setHolidays(holidayDates);
      } catch (err) {
        toast.error("Could not load company holidays.");
      }
    };

    fetchLeaveTypes();
    fetchHolidays();
  }, [isOpen, initialData]);

  // ✅ Populate form — uses flat DTO fields (initialData.leaveTypeId, initialData.employeeId)
  useEffect(() => {
    if (isOpen && initialData) {
      setStartDate(initialData.startDate || "");
      setEndDate(initialData.endDate || "");
      // ✅ Fixed: use flat leaveTypeId from DTO, fallback for old shape
      setLeaveTypeId(
        initialData.leaveTypeId || initialData.leaveType?.leaveTypeId || "",
      );
      setReason(initialData.reason || "");
      setDriveLink(initialData.driveLink || "");

      const isCustom =
        initialData.isHalfDay ||
        (initialData.startSession &&
          initialData.startSession !== "none" &&
          initialData.startSession !== "fullday");
      setShowCustomHalfDay(isCustom);

      setHalfDayConfig({
        start:
          isCustom && initialData.startSession !== "none"
            ? initialData.startSession
            : "none",
        end:
          isCustom && initialData.endSession !== "none"
            ? initialData.endSession
            : "none",
      });
    }
  }, [isOpen, initialData]);

  const normalizedBalances = useMemo(() => {
    if (!leaveBalances) return [];

    // ✅ If already flat → use directly
    if (Array.isArray(leaveBalances)) {
      return leaveBalances;
    }

    // ✅ If API format → flatten
    return [
      ...(leaveBalances?.data?.regular ?? []),
      ...(leaveBalances?.data?.genderBasedLeaveBalances ?? []),
    ];
  }, [leaveBalances]);

  // console.log(normalizedBalances);

  const leaveTypeOptions = useLeaveDropdownOptions(normalizedBalances);
  const selectedLeaveType = leaveTypeOptions.find(
    (o) => o.leaveTypeId === leaveTypeId,
  );
  const isMaternityLeave = selectedLeaveType?.leaveTypeId === "L-ML";
  const isMultiDay = startDate && endDate && startDate !== endDate;
  const weekdays = countWeekdaysBetween(
    startDate,
    endDate,
    halfDayConfig,
    holidays,
    isMaternityLeave,
  );

  // ✅ Balance warning check
  useEffect(() => {
    if (!leaveTypeId || leaveTypeOptions.length === 0) {
      setBalanceWarning("");
      return;
    }
    const selected = leaveTypeOptions.find(
      (o) => o.leaveTypeId === leaveTypeId,
    );
    if (!selected) {
      setBalanceWarning("");
      return;
    }

    if (selected.isInfinite) {
      setBalanceWarning("");
    } else if (selected.availableDays <= 0) {
      setBalanceWarning(
        `No balance available for ${selected.leaveName}. You have 0 days remaining.`,
      );
    } else if (weekdays > 0 && selected.availableDays < weekdays) {
      setBalanceWarning(
        `Insufficient balance. You have ${selected.availableDays} day(s) available but requested ${weekdays} day(s).`,
      );
    } else {
      setBalanceWarning("");
    }
  }, [leaveTypeId, leaveTypeOptions, weekdays]);

  const shouldShowDriveLink = () => {
    if (!selectedLeaveType) return false;
    return (
      selectedLeaveType.requiresDocumentation ||
      (selectedLeaveType.leaveTypeId === "L-SL" && weekdays > 3)
    );
  };

  const handleHalfDayModeChange = (isCustom) => {
    setShowCustomHalfDay(isCustom);
    setHalfDayConfig(
      isCustom
        ? { start: "fullday", end: "fullday" }
        : { start: "none", end: "none" },
    );
  };

  const handleStartDateChange = (date) => {
    if (!date) return;
    const dateString = format(date, "yyyy-MM-dd");
    setStartDate(dateString);
    if (!endDate || new Date(endDate) < new Date(dateString))
      setEndDate(dateString);
  };

  const handleEndDateChange = (date) => {
    if (!date) return;
    setEndDate(format(date, "yyyy-MM-dd"));
  };

  const handleClose = async () => {
    await manualReleaseLock();
    onClose();
  };

  useEffect(() => {
    // Body scroll lock while open — the canonical Modal handles Escape-to-close
    // itself (closeOnEscape, wired to handleClose via the onClose prop below),
    // so only the scroll-lock side effect is kept here.
    if (!isOpen) return undefined;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const payload = {
      leaveId: initialData.leaveId,
      // ✅ Fixed: use flat employeeId from DTO, fallback for old shape
      employeeId: initialData.employeeId || initialData.employee?.employeeId,
      leaveTypeId,
      startDate,
      endDate,
      daysRequested: weekdays,
      requestDate: initialData.requestDate,
      reason,
      driveLink,
      startSession: halfDayConfig.start,
      endSession: isMultiDay ? halfDayConfig.end : halfDayConfig.start,
      year: year,
    };

    try {
      const { data } = await api.put(
        `${BASE_URL}/api/leave-requests/employee/update`,
        payload,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      toast.success("Leave request updated successfully");
      if (onSuccess) onSuccess(data);
      handleClose();
    } catch (err) {
      setError(
        "Failed to update: " + (err.response?.data?.message || err.message),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const hasBalanceError =
    balanceWarning !== "" && !selectedLeaveType?.isInfinite;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Leave Request"
      size="lg"
      maxHeight="max-h-[92vh]"
      bodyClassName="p-0"
      showCloseButton={!isLockedByOther}
    >
      {/* Lock overlay */}
      {isLockedByOther && (
        <div className="flex flex-col items-center justify-center text-center p-6 bg-white/90 backdrop-blur-sm">
          <div className="w-16 h-16 rounded-full bg-yellow-50 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-yellow-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-800">Record Locked</h3>
          {lockMessage && (
            <p className="text-gray-500 mt-2 text-sm">{lockMessage}</p>
          )}
          <p className="text-gray-400 text-xs mt-1">
            Please try again later.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="mt-5"
          >
            Close
          </Button>
        </div>
      )}

      {!isLockedByOther && (
        <form onSubmit={handleUpdate} className="px-5 py-4 space-y-4">
          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 p-3 rounded-xl text-red-700 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <fieldset disabled={isLockedByOther} className="space-y-4">
            {/* Date pickers */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                Leave Period
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <DateRangePicker
                  label="Start Date"
                  defaultDate={
                    startDate ? new Date(startDate + "T00:00:00") : null
                  }
                  onChange={handleStartDateChange}
                  defaultMonth={
                    startDate ? new Date(startDate + "T00:00:00") : undefined
                  }
                  disabledDays={
                    isMaternityLeave ? [] : [{ dayOfWeek: [0, 6] }, ...holidays]
                  }
                  year={year}
                />
                <DateRangePicker
                  label="End Date"
                  align="right"
                  defaultDate={endDate ? new Date(endDate + "T00:00:00") : null}
                  onChange={handleEndDateChange}
                  defaultMonth={
                    endDate ? new Date(endDate + "T00:00:00") : undefined
                  }
                  disabledDays={[
                    ...(isMaternityLeave
                      ? []
                      : [{ dayOfWeek: [0, 6] }, ...holidays]),
                    startDate
                      ? { before: new Date(startDate + "T00:00:00") }
                      : {},
                  ]}
                  year={year}
                />
              </div>

              {/* Days badge */}
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-100">
                  <CalendarDays className="w-3 h-3" />
                  {weekdays} {weekdays === 1 ? "day" : "days"} selected
                </span>
                {isMaternityLeave && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Info className="w-3 h-3" /> All calendar days included
                  </span>
                )}
              </div>
            </div>

            {/* Leave type */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                Leave Type
              </label>
              <LeaveTypeDropdown
                options={leaveTypeOptions}
                selectedId={leaveTypeId}
                setSelectedId={setLeaveTypeId}
              />

              {/* ✅ Balance warning */}
              {balanceWarning ? (
                <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-amber-700 text-xs">{balanceWarning}</p>
                </div>
              ) : selectedLeaveType &&
                !selectedLeaveType.isInfinite &&
                selectedLeaveType.availableDays > 0 ? (
                <div className="mt-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  <p className="text-green-600 text-xs font-medium">
                    {selectedLeaveType.availableDays} day(s) available
                  </p>
                </div>
              ) : null}
            </div>

            {/* Half day toggle */}
            {selectedLeaveType?.allowHalfDay && !isMaternityLeave && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block">
                  Day Type
                </label>
                <div className="p-1 inline-flex items-center bg-gray-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => handleHalfDayModeChange(false)}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      !showCustomHalfDay
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Full Days
                  </button>
                  <button
                    type="button"
                    onClick={() => handleHalfDayModeChange(true)}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      showCustomHalfDay
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Custom
                  </button>
                </div>

                {showCustomHalfDay && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-medium text-gray-500">
                        Start — {formatDateForDisplay(startDate)}
                      </label>
                      <FormSelect
                        name="halfDayStart"
                        options={[
                          { value: "fullday", label: "Full Day" },
                          { value: "first", label: "First Half" },
                          { value: "second", label: "Second Half" },
                        ]}
                        value={halfDayConfig.start}
                        onChange={(e) =>
                          setHalfDayConfig((p) => ({ ...p, start: e.target.value }))
                        }
                      />
                    </div>
                    {isMultiDay && (
                      <>
                        <div className="pt-7 text-gray-300 font-bold">—</div>
                        <div className="flex-1 space-y-1">
                          <label className="text-xs font-medium text-gray-500">
                            End — {formatDateForDisplay(endDate)}
                          </label>
                          <FormSelect
                            name="halfDayEnd"
                            options={[
                              { value: "fullday", label: "Full Day" },
                              { value: "first", label: "First Half" },
                              { value: "second", label: "Second Half" },
                            ]}
                            value={halfDayConfig.end}
                            onChange={(e) =>
                              setHalfDayConfig((p) => ({ ...p, end: e.target.value }))
                            }
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                Reason
              </label>
              <textarea
                maxLength="100"
                rows="3"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Add a reason for your leave..."
                className="w-full border border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 focus:outline-none p-3 rounded-xl text-sm resize-none transition-all"
              />
              <p className="text-right text-xs text-gray-400 mt-0.5">
                {reason.length}/100
              </p>
            </div>

            {/* Drive link */}
            {shouldShowDriveLink() && (
              <div>
                <FormInput
                  label="Supporting Document"
                  name="driveLink"
                  type="url"
                  value={driveLink}
                  onChange={(e) => setDriveLink(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  inputClassName="bg-gray-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all"
                  labelClassName="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block"
                />
                {selectedLeaveType?.leaveTypeId === "L-SL" && weekdays > 3 && (
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <Info className="w-3 h-3" /> Required for sick leave
                    exceeding 3 days
                  </p>
                )}
              </div>
            )}
          </fieldset>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button
              type="button"
              onClick={handleClose}
              disabled={submitting || isLockedByOther}
              variant="ghost"
              size="medium"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || isLockedByOther || hasBalanceError}
              variant="primary"
              size="medium"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Request"
              )}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
