import React, { useEffect, useMemo, useState } from "react";
import FilterListbox from "../../../components/filter/FilterListbox";
import {
  ChevronDownIcon,
  FunnelIcon,
  CalendarDaysIcon,
  ArrowLeftCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axiosInstance";
import { toast } from "react-toastify";
import DateRangePicker from "./DateRangePicker";
import { format } from "date-fns";

const skeleton = "animate-pulse bg-gray-400 rounded hover:cursor-wait";
const BASE_URL = window.__APP_CONFIG__.BASE_URL;
const PMS_BASE_URL = window.__APP_CONFIG__.PMS_BASE_URL;

const Toggle = ({ checked, onChange, label, hint, id }) => (
  <div className="flex items-start gap-3">
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      aria-labelledby={`${id}-label`}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
        checked ? "bg-indigo-600" : "bg-gray-300"
      }`}
    >
      <span
        aria-hidden="true"
        className={`${
          checked ? "translate-x-5" : "translate-x-0"
        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
      />
    </button>
    <div className="flex flex-col">
      <span id={`${id}-label`} className="text-sm font-medium  ">
        {label}
      </span>
      {hint ? (
        <span className="text-xs text-gray-500 dark:text-gray-400">{hint}</span>
      ) : null}
    </div>
  </div>
);

const Pill = ({ active, children, onRemove }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium ${
      active
        ? "bg-indigo-50 text-white ring-1 ring-inset ring-indigo-600/20 dark:bg-blue-500 dark:text-white-brighter"
        : "text-blue-700"
    }`}
  >
    {children}
    {onRemove && (
      <button type="button">
        <XMarkIcon className="ml-1 h-4 w-5 text-white" onClick={onRemove} />
      </button>
    )}
  </span>
);

const MultiSelect = ({
  options,
  value,
  onChange,
  placeholder = "Select options",
  searchable = true,
  selectAll = true,
  label,
  id,
}) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q.trim()) return options;
    const k = q.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(k));
  }, [q, options]);

  const ids = new Set(value);

  const toggleOption = (idVal) => {
    const next = new Set(ids);
    if (next.has(idVal)) next.delete(idVal);
    else next.add(idVal);
    onChange(Array.from(next));
  };

  const allVisibleIds = filtered.map((o) => o.value);
  const allSelected =
    allVisibleIds.every((oid) => ids.has(oid)) && allVisibleIds.length > 0;

  const handleToggleAll = () => {
    const next = new Set(ids);
    if (allSelected) {
      allVisibleIds.forEach((oid) => next.delete(oid));
    } else {
      allVisibleIds.forEach((oid) => next.add(oid));
    }
    onChange(Array.from(next));
  };

  useEffect(() => {
    const onDocClick = (e) => {
      if (!open) return;
      const dropdown = document.getElementById(id);
      if (dropdown && !dropdown.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open, id]);

  return (
    <div className="w-full" id={id}>
      {label ? (
        <label className="block text-sm font-medium   mb-1">{label}</label>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full justify-between inline-flex items-center gap-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white px-3 py-2 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <span className="truncate">
          {value.length > 0 ? `${value.length} selected` : placeholder}
        </span>
        <ChevronDownIcon className="h-4 w-4 text-gray-500" />
      </button>
      {open && (
        <div className="relative mt-2">
          <div className="absolute z-20 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white shadow-lg">
            <div className="p-2 border-b border-gray-100 dark:border-gray-800">
              {searchable && (
                <div className="flex items-center gap-2">
                  <FunnelIcon className="h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    className="w-full bg-transparent outline-none text-sm placeholder:text-gray-400"
                    placeholder="Search by Leave Name"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
              )}
              {selectAll && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={handleToggleAll}
                    className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    {allSelected ? "Clear visible" : "Select all visible"}
                  </button>
                </div>
              )}
            </div>
            <ul
              role="listbox"
              className="max-h-60 overflow-auto py-1"
              aria-multiselectable="true"
            >
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-sm text-gray-500">No results</li>
              ) : (
                filtered.map((opt) => {
                  const active = ids.has(opt.value);
                  return (
                    <li
                      key={opt.value}
                      role="option"
                      aria-selected={active}
                      onClick={() => toggleOption(opt.value)}
                      className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-blue-100 ${
                        active ? "bg-indigo-50 dark:bg-indigo-900/20" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleOption(opt.value)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className=" ">{opt.label}</span>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>
      )}
      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {value.slice(0, 5).map((v) => {
            const found = options.find((o) => o.value === v);
            return (
              <Pill key={v} active onRemove={() => toggleOption(v)}>
                {found ? found.label : v}
              </Pill>
            );
          })}
          {value.length > 5 && <Pill>+{value.length - 5} more</Pill>}
        </div>
      )}
    </div>
  );
};

export default function BlockLeaveDates({ employeeId }) {
  console.log("BlockLeaveDates Employee ID:", employeeId);
  // Data state
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);

  // Form state
  const [projectId, setProjectId] = useState("");
  const [blockAllMembers, setBlockAllMembers] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectedLeaveTypes, setSelectedLeaveTypes] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [holidays, setHolidays] = useState([]);
  const [reason, setReason] = useState("");
  const navigate = useNavigate();

  // Fetch initial data
  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        setLoading(true);
        // Replace with your endpoints
        const [projRes, ltRes, ltIdsRes] = await Promise.all([
          api.get(`${PMS_BASE_URL}/api/projects/owner/${employeeId}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }),
          api.get(`${BASE_URL}/api/leave/types`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }),
          api.get(`${BASE_URL}/api/leave/get-all-leave-type-ids`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }),
        ]);
        const projJson = projRes.data || [];
        const ltJson = ltRes.data || [];
        const ltIdsJson = ltIdsRes.data || [];

        if (!active) return;
        const leaveIdMap = new Map(
          ltIdsJson.map((item) => [item.leaveName, item.leaveTypeId]),
        );
        const mergedLeaveTypes = ltJson
          .filter((leaveType) => leaveIdMap.get(leaveType.name) !== undefined)
          .map((leaveType) => ({
            label: leaveType.label,
            value: leaveIdMap.get(leaveType.name),
          }));

        setProjects(projJson);
        setLeaveTypes(mergedLeaveTypes);
      } catch (e) {
        toast.error(e.message || "Failed to fetch initial data");
      } finally {
        if (active) setLoading(false);
      }
    };

    const fetchHolidays = async () => {
      try {
        const year = new Date().getFullYear();
        console.log("yeaer", year);
        const res = await api.get(
          `${BASE_URL}/api/holidays/by-location/${year}`,
          {
            params: { state: "All", country: "India" }, // Adjust params if needed
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        const holidayDates = res.data.map(
          (holiday) => new Date(holiday.holidayDate + "T00:00:00"),
        );
        setHolidays(holidayDates);
      } catch (err) {
        toast.error("Could not load company holidays.");
      }
    };

    run();
    fetchHolidays();
    return () => {
      active = false;
    };
  }, [employeeId]);

  // Fetch members when project changes
  useEffect(() => {
    let active = true;
    const run = async () => {
      setMembers([]);
      setSelectedMembers([]);
      if (!projectId) return;
      try {
        const res = await api.get(
          `${PMS_BASE_URL}/api/projects/${projectId}/members`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        const json = await res.data;
        if (!active) return;
        setMembers(
          (json || []).map((m) => ({ value: m.id, label: `${m.name}` })),
        );
      } catch (e) {
        toast.error(e.message || "Failed to fetch project members");
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [projectId]);

  const canSubmit =
    projectId &&
    (blockAllMembers || selectedMembers.length > 0) &&
    selectedLeaveTypes.length > 0 &&
    startDate &&
    endDate &&
    new Date(endDate) >= new Date(startDate) &&
    reason;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const payload = {
        projectId,
        members: blockAllMembers
          ? members.map((m) => m.value)
          : selectedMembers,
        leaveTypeIds: selectedLeaveTypes,
        startDate,
        endDate,
        managerId: employeeId,
        reason: reason,
        year: new Date().getFullYear(),
      };
      const res = await api.post(
        `${BASE_URL}/api/leave-block/block`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to create leave block");
      }
      // Reset minimal fields but keep project for consecutive actions
      setSelectedMembers([]);
      setSelectedLeaveTypes([]);
      setStartDate("");
      setEndDate("");
      toast.success(res.data.message || "Leave block created successfully");
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Could not save. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const DateRange = ({ start, end, setStart, setEnd, label, required }) => {
    const handleStartChange = (date) => {
      if (end && date && new Date(end) < new Date(date)) {
        toast.warn("End date cannot be before start date.");
        setEnd("");
      }
      setStart(format(date, "yyyy-MM-dd"));
    };

    const handleEndChange = (date) => {
      if (start && date && new Date(date) < new Date(start)) {
        toast.error("End date cannot be before start date.");
        return;
      }
      setEnd(format(date, "yyyy-MM-dd"));
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium mb-2">{label}</label>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Start Date Picker */}
          <DateRangePicker
            label={
              <>
                Start Date <span className="text-red-500">*</span>
              </>
            }
            defaultDate={start ? new Date(start) : undefined}
            onChange={handleStartChange}
            disabledDays={[
              { dayOfWeek: [0, 6] },
              { before: new Date() }, // disable past dates if you want
              ...holidays,
            ]}
            year={new Date().getFullYear()}
          />

          {/* End Date Picker */}
          <DateRangePicker
            label={
              <>
                End Date <span className="text-red-500">*</span>
              </>
            }
            defaultDate={end ? new Date(end) : undefined}
            onChange={handleEndChange}
            disabledDays={[
              { dayOfWeek: [0, 6] }, // disable weekends
              { before: start ? new Date(start) : new Date() },
              ...holidays,
            ]}
            align="right"
            year={new Date().getFullYear()}
          />
        </div>

        {start && end && new Date(end) < new Date(start) && (
          <p className="mt-1 text-sm text-red-600">
            End date cannot be before start date.
          </p>
        )}
      </div>
    );
  };

  const projectOptions = projects.map((p) => ({ value: p.id, label: p.name }));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white/70 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">Block Leave Dates</h1>
              <p className="mt-1 text-xs">
                Choose a project, select employees and leave types, then apply a
                date range.
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="text-blue-600 hover:text-blue-800"
              >
                <ArrowLeftCircleIcon className="mr-2 h-10 w-9" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2">
            <form
              onSubmit={onSubmit}
              className="rounded-xl border bg-white  shadow-sm"
            >
              <div className="p-6 space-y-8">
                <div>
                  <h2 className="text-base font-semibold">
                    Project and members
                  </h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Start by picking a project to manage its members’ leave
                    availability.
                  </p>
                  <div className="mt-4 space-y-4">
                    {/* Project */}
                    <div>
                      <label className="block text-sm font-medium  mb-1">
                        Project
                      </label>
                      {loading ? (
                        <div className={`${skeleton} h-10 w-full`} />
                      ) : (
                        <FilterListbox
                          options={[
                            { value: "", label: "Select a project" },
                            ...projectOptions,
                          ]}
                          value={projectId}
                          onChange={setProjectId}
                        />
                      )}
                    </div>

                    {/* Members */}
                    <div className="grid grid-cols-1 gap-4">
                      <Toggle
                        id="toggle-all-members"
                        checked={blockAllMembers}
                        onChange={(v) => {
                          setBlockAllMembers(v);
                          if (v) setSelectedMembers([]);
                        }}
                        label="Block for all members"
                        hint="When enabled, the block applies to every member in the selected project."
                      />

                      <div
                        className={
                          blockAllMembers
                            ? "opacity-50 pointer-events-none"
                            : ""
                        }
                      >
                        {projectId ? (
                          <MultiSelect
                            id="members-multiselect"
                            label="Members"
                            options={members}
                            value={selectedMembers}
                            onChange={setSelectedMembers}
                            placeholder={
                              members.length
                                ? "Select members"
                                : "No members available"
                            }
                          />
                        ) : (
                          <div>
                            <label className="block text-sm font-medium   mb-1">
                              Members
                            </label>
                            <div className={`${skeleton} h-10 w-full`} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
                  <h2 className="text-base font-semibold  ">Leave types</h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Choose which leave types will be unavailable to apply for
                    within the range.
                  </p>
                  <div className="mt-4">
                    {loading ? (
                      <div className={`${skeleton} h-10 w-full`} />
                    ) : (
                      <MultiSelect
                        id="leave-types-multiselect"
                        label="Leave types"
                        options={leaveTypes}
                        value={selectedLeaveTypes}
                        onChange={setSelectedLeaveTypes}
                        placeholder="Select leave types"
                      />
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
                  <h2 className="text-base font-semibold  ">Date range</h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Select the start and end dates for the block. Applicants
                    cannot choose these dates.
                  </p>
                  <div className="mt-4">
                    <DateRange
                      required
                      label="Block Leave Period"
                      start={startDate}
                      end={endDate}
                      setStart={setStartDate}
                      setEnd={setEndDate}
                    />
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
                  <h2 className="text-base font-semibold">
                    Reason <span className="text-red-500">*</span>
                  </h2>
                  <textarea
                    cols="30"
                    rows="2"
                    maxLength={200}
                    required
                    onChange={(e) => setReason(e.target.value)}
                    value={reason}
                    className="w-full rounded-lg h-auto"
                  ></textarea>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-200 dark:border-gray-800  px-6 py-4 rounded-b-xl">
                <button
                  type="button"
                  onClick={() => {
                    setBlockAllMembers(false);
                    setSelectedMembers([]);
                    setSelectedLeaveTypes([]);
                    setStartDate("");
                    setEndDate("");
                    setReason("");
                  }}
                  className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-700 bg-white  px-4 py-2 text-sm font-medium text-gray-700 dark:text-blue-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit || submitting}
                  className={`inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    !canSubmit || submitting
                      ? "bg-indigo-400 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  {submitting ? "Saving..." : "Block leave"}
                </button>
              </div>
            </form>
          </section>

          <aside className="lg:col-span-1">
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white shadow-sm p-6">
              <h3 className="text-sm font-semibold  ">Summary</h3>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-start justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Project
                  </span>
                  <span className=" ">
                    {projectOptions.find(
                      (p) => p.value.toString() === projectId,
                    )?.label || "—"}
                  </span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Scope
                  </span>
                  <span className=" ">
                    {blockAllMembers
                      ? "All members"
                      : `${selectedMembers.length} selected`}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Leave types
                  </span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedLeaveTypes.length === 0 ? (
                      <span className=" ">—</span>
                    ) : (
                      selectedLeaveTypes.slice(0, 6).map((lt) => {
                        const found = leaveTypes.find((l) => l.value === lt);
                        return <Pill key={lt}>{found ? found.label : lt}</Pill>;
                      })
                    )}
                    {selectedLeaveTypes.length > 6 && (
                      <Pill>+{selectedLeaveTypes.length - 6} more</Pill>
                    )}
                  </div>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Dates
                  </span>
                  <span className=" ">
                    {startDate && endDate
                      ? `${new Date(startDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })} → ${new Date(endDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}`
                      : "—"}
                  </span>
                </div>
                <div className="grid grid-cols-[auto,1fr] gap-4">
                  <span className="text-gray-600 dark:text-gray-400">
                    Reason
                  </span>
                  <span className="break-words max-w-full line-clamp-1">
                    {reason}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
