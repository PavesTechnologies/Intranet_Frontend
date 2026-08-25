import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import Modal from "../../../components/Modal/modal";
import Button from "../../../components/Button/Button";
import LoadingSpinner from "../../../components/LoadingSpinner";
import FormSelect from "../../../components/forms/FormSelect";
import FormTime from "../../../components/forms/FormTime";
import FormInput from "../../../components/forms/FormInput";
import { showStatusToast } from "../../../components/toastfy/toast";
import api from "../../../api/axiosInstance";
import { deleteDayEntries, getActiveHourSettings, saveWeekDraftEntries } from "../api";
import {
  MONTH_NAMES,
  blockedReason,
  buildMonthWeeks,
  dayMonth,
  hourSettingToMinutes,
  isStatusLocked,
  isWeekendISO,
  minutesToHM,
  requiredMinutes,
  shortDay,
  timeToMinutes,
  toISO,
  utcToLocalHM,
  weekdayShort,
} from "./weekUtils";

const WORK_LOCATIONS = [
  { label: "Office", value: "Office" },
  {label: "Remote", value: "Remote" },
  { label: "Home", value: "Home" },
  { label: "Client Location", value: "Client Location" },
  { label: "Hybrid", value: "Hybrid" },
];

const DEFAULT_SETTINGS = { regularMinutes: 480, weekendMinutes: 480 };

let seq = 0;
const nextKey = () => `row-${(seq += 1)}`;

/** A blank row — nothing is pre-filled, the user chooses everything. */
const emptyRow = () => ({
  key: nextKey(),
  entryId: null,
  projectId: "",
  taskId: "",
  fromTime: "",
  toTime: "",
  workLocation: "",
  description: "",
  dirty: false,
});

/**
 * Whole-week timesheet entry.
 *
 * Step 1 — pick a week of the current month; approved and partially approved
 *          weeks are not offered.
 * Step 2 — the week's days, each showing whatever is already saved plus any new
 *          rows. Everything is editable and deletable, then saved as draft.
 */
const WeeklyEntryModal = ({ isOpen, onClose, projectInfo = [], holidaysMap = {}, onSaved }) => {
  const today = useMemo(() => new Date(), []);
  const todayISO = useMemo(() => toISO(today), [today]);
  const year = today.getFullYear();
  const monthIndex = today.getMonth();
  const weeks = useMemo(() => buildMonthWeeks(year, monthIndex), [year, monthIndex]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingKey, setDeletingKey] = useState(null);
  const [confirmKey, setConfirmKey] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [serverDays, setServerDays] = useState({});
  const [weekStatuses, setWeekStatuses] = useState({});
  const [activeWeek, setActiveWeek] = useState(null);
  const [rows, setRows] = useState({}); // workDate -> row[]
  // Days start collapsed; the chevron in each day header opens it.
  const [openDays, setOpenDays] = useState({});
  const toggleDay = (iso) => setOpenDays((prev) => ({ ...prev, [iso]: !prev[iso] }));

  // ---- lookups ------------------------------------------------------------
  const projectOptions = useMemo(
    () => projectInfo.map((p) => ({ label: p.project, value: p.projectId })),
    [projectInfo],
  );
  const tasksFor = useCallback(
    (projectId) => {
      const project = projectInfo.find((p) => p.projectId === Number(projectId));
      return project ? project.tasks.map((t) => ({ label: t.task, value: t.taskId })) : [];
    },
    [projectInfo],
  );
  const billableFor = useCallback(
    (projectId, taskId) => {
      const project = projectInfo.find((p) => p.projectId === Number(projectId));
      const task = project?.tasks.find((t) => t.taskId === Number(taskId));
      return task ? !!task.billable : null;
    },
    [projectInfo],
  );

  // ---- load the month -----------------------------------------------------
  const loadMonth = useCallback(async () => {
    setLoading(true);
    try {
      const start = toISO(new Date(year, monthIndex, 1));
      const end = toISO(new Date(year, monthIndex + 1, 0));
      const [historyRes, hourSettings] = await Promise.all([
        api.get(
          `${window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT}/api/timesheet/historyRange?startDate=${start}&endDate=${end}`,
        ),
        getActiveHourSettings().catch(() => null),
      ]);

      const dayMap = {};
      const weekMap = {};
      (historyRes.data?.weeklySummary || []).forEach((week) => {
        weekMap[String(week.startDate).slice(0, 10)] = week.weeklyStatus;
        (week.timesheets || []).forEach((ts) => {
          dayMap[String(ts.workDate).slice(0, 10)] = {
            timesheetId: ts.timesheetId,
            status: ts.status,
            entries: (ts.entries || []).map((e) => ({
              entryId: e.timesheetEntryId ?? e.timesheetEntryid ?? e.id,
              projectId: e.projectId,
              taskId: e.taskId,
              fromTime: utcToLocalHM(e.fromTime),
              toTime: utcToLocalHM(e.toTime),
              workLocation: e.workLocation || e.workType || "",
              description: e.description || "",
            })),
          };
        });
      });
      setServerDays(dayMap);
      setWeekStatuses(weekMap);

      if (hourSettings) {
        setSettings({
          regularMinutes:
            hourSettingToMinutes(hourSettings.minHrsRegular) || DEFAULT_SETTINGS.regularMinutes,
          weekendMinutes:
            hourSettingToMinutes(hourSettings.minHrsWeekend) || DEFAULT_SETTINGS.weekendMinutes,
        });
      }
      return dayMap;
    } catch (err) {
      showStatusToast(
        err.response?.data?.message || "Could not load this month's timesheets",
        "error",
      );
      return {};
    } finally {
      setLoading(false);
    }
  }, [year, monthIndex]);

  useEffect(() => {
    if (!isOpen) return;
    setActiveWeek(null);
    setRows({});
    setOpenDays({});
    setConfirmKey(null);
    loadMonth();
  }, [isOpen, loadMonth]);

  /** Seed the working rows for a week from whatever is already saved. */
  const seedRows = useCallback((week, dayMap) => {
    const next = {};
    week.dates.forEach((iso) => {
      next[iso] = (dayMap[iso]?.entries || []).map((entry) => ({
        ...entry,
        key: nextKey(),
        dirty: false,
      }));
    });
    setRows(next);
  }, []);

  const openWeek = (week) => {
    setActiveWeek(week);
    setOpenDays({}); // collapsed by default
    seedRows(week, serverDays);
  };

  // ---- derived ------------------------------------------------------------
  const weekStatusOf = useCallback(
    (week) => {
      const fromServer = weekStatuses[week.start];
      if (fromServer) return fromServer;
      const hit = week.dates.map((d) => serverDays[d]).find(Boolean);
      return hit ? hit.status : "Not started";
    },
    [weekStatuses, serverDays],
  );

  const rowMinutes = (row) => {
    const a = timeToMinutes(row.fromTime);
    const b = timeToMinutes(row.toTime);
    return b > a ? b - a : 0;
  };
  const dayMinutesOf = useCallback(
    (iso) => (rows[iso] || []).reduce((total, row) => total + rowMinutes(row), 0),
    [rows],
  );

  const blockOf = useCallback(
    (iso) => blockedReason(iso, { todayISO, holidaysMap, year, monthIndex }),
    [todayISO, holidaysMap, year, monthIndex],
  );

  const dayEditable = useCallback(
    (week, iso) => {
      if (isStatusLocked(weekStatusOf(week))) return false;
      if (isStatusLocked(serverDays[iso]?.status)) return false;
      return !blockOf(iso);
    },
    [weekStatusOf, serverDays, blockOf],
  );

  const openDayCount = useCallback(
    (week) => week.dates.filter((iso) => dayEditable(week, iso)).length,
    [dayEditable],
  );

  // ---- row editing --------------------------------------------------------
  const addRow = (iso) => {
    setRows((prev) => ({ ...prev, [iso]: [...(prev[iso] || []), emptyRow()] }));
    setOpenDays((prev) => ({ ...prev, [iso]: true }));
  };

  const updateRow = (iso, key, field, value) => {
    setRows((prev) => ({
      ...prev,
      [iso]: (prev[iso] || []).map((row) => {
        if (row.key !== key) return row;
        const next = { ...row, [field]: value, dirty: true };
        if (field === "projectId") {
          next.projectId = Number(value);
          next.taskId = ""; // task list changes with the project
        }
        if (field === "taskId") next.taskId = Number(value);
        return next;
      }),
    }));
  };

  const removeRow = async (iso, key) => {
    const row = (rows[iso] || []).find((r) => r.key === key);
    if (!row) return;

    // A row that was never saved just disappears — no request needed.
    if (row.entryId == null) {
      setRows((prev) => ({ ...prev, [iso]: (prev[iso] || []).filter((r) => r.key !== key) }));
      setConfirmKey(null);
      return;
    }

    setDeletingKey(key);
    try {
      const message = await deleteDayEntries(serverDays[iso].timesheetId, [row.entryId]);
      showStatusToast(message || "Entry deleted", "success");
      setConfirmKey(null);
      const dayMap = await loadMonth();
      if (activeWeek) seedRows(activeWeek, dayMap);
      await onSaved?.();
    } catch (err) {
      const data = err.response?.data;
      showStatusToast(
        (typeof data === "string" ? data : data?.message) || "Could not delete the entry",
        "error",
      );
    } finally {
      setDeletingKey(null);
    }
  };

  // ---- validation, mirroring what the API will reject ---------------------
  const dayProblem = useCallback(
    (iso) => {
      const list = rows[iso] || [];
      if (!list.length) return null;
      const same = (text) => ({ label: text, detail: text });

      for (const row of list) {
        if (!row.projectId) return same("Pick a project");
        if (!row.taskId) return same("Pick a task");
        if (!row.fromTime || !row.toTime) return same("Set both times");
        if (!row.workLocation) return same("Pick a work location");
        if (timeToMinutes(row.toTime) <= timeToMinutes(row.fromTime))
          return same("End must be after start");
      }

      for (let i = 0; i < list.length; i += 1) {
        for (let j = i + 1; j < list.length; j += 1) {
          const a = list[i];
          const b = list[j];
          if (
            timeToMinutes(a.fromTime) < timeToMinutes(b.toTime) &&
            timeToMinutes(b.fromTime) < timeToMinutes(a.toTime)
          )
            return same("Times overlap");
        }
      }

      // Minimum comes from /api/timesheet-settings/active — the same value the
      // backend checks — so the message always quotes the configured hours.
      const needed = requiredMinutes(iso, settings);
      const have = dayMinutesOf(iso);
      if (have < needed) {
        return {
          label: `Needs ${minutesToHM(needed)} hrs`,
          detail: `timesheet must be at least ${minutesToHM(needed)} hrs for a ${
            isWeekendISO(iso) ? "weekend day" : "regular day"
          } — currently ${minutesToHM(have)}`,
        };
      }
      return null;
    },
    [rows, settings, dayMinutesOf],
  );

  const hasUnsavedWork = activeWeek
    ? activeWeek.dates.some((iso) =>
        (rows[iso] || []).some((row) => row.entryId == null || row.dirty),
      )
    : false;

  // ---- save ---------------------------------------------------------------
  const saveDraft = async () => {
    if (!activeWeek) return;

    const payload = [];
    const skipped = [];
    const toApi = (iso, row) => ({
      ...(row.entryId != null ? { id: row.entryId } : {}),
      projectId: Number(row.projectId),
      taskId: Number(row.taskId),
      fromTime: new Date(`${iso}T${row.fromTime}:00`).toISOString(),
      toTime: new Date(`${iso}T${row.toTime}:00`).toISOString(),
      workLocation: row.workLocation,
      description: row.description,
      billable: !!billableFor(row.projectId, row.taskId),
    });

    activeWeek.dates.forEach((iso) => {
      const list = rows[iso] || [];
      const added = list.filter((row) => row.entryId == null);
      const edited = list.filter((row) => row.entryId != null && row.dirty);
      if (!added.length && !edited.length) return;

      if (!dayEditable(activeWeek, iso)) {
        skipped.push(`${weekdayShort(iso)}: ${blockOf(iso) || "not editable"}`);
        return;
      }
      const problem = dayProblem(iso);
      if (problem) {
        skipped.push(`${weekdayShort(iso)}: ${problem.detail}`);
        return;
      }
      payload.push({
        workDate: iso,
        timesheetId: serverDays[iso]?.timesheetId ?? null,
        status: serverDays[iso]?.status ?? "DRAFT",
        newEntries: added.map((row) => toApi(iso, row)),
        updatedEntries: edited.map((row) => toApi(iso, row)),
      });
    });

    if (!payload.length) {
      showStatusToast(
        skipped.length ? `Nothing saved. ${skipped.join(". ")}` : "Add some entries first",
        skipped.length ? "error" : "info",
      );
      return;
    }

    setSaving(true);
    try {
      const results = await saveWeekDraftEntries(payload);
      const ok = results.filter((r) => r.ok);
      const failed = results.filter((r) => !r.ok);

      const parts = [];
      if (ok.length) {
        const days = [...new Set(ok.map((r) => weekdayShort(r.workDate)))];
        parts.push(`Saved ${days.join(", ")} as draft`);
      }
      if (failed.length)
        parts.push(failed.map((r) => `${weekdayShort(r.workDate)}: ${r.message}`).join(". "));
      if (skipped.length) parts.push(skipped.join(". "));
      showStatusToast(parts.join(". "), failed.length ? "error" : "success");

      const dayMap = await loadMonth();
      seedRows(activeWeek, dayMap);
      await onSaved?.();
      if (ok.length && !failed.length && !skipped.length) onClose?.();
    } finally {
      setSaving(false);
    }
  };

  // ---- render: week picker ------------------------------------------------
  const renderPicker = () => (
    <div className="flex flex-col gap-2">
      {weeks.map((week) => {
        const status = weekStatusOf(week);
        const locked = isStatusLocked(status);
        const open = openDayCount(week);
        const disabled = locked || open === 0;
        const minutes = week.dates.reduce(
          (sum, iso) =>
            sum +
            (serverDays[iso]?.entries || []).reduce((t, e) => {
              const a = timeToMinutes(e.fromTime);
              const b = timeToMinutes(e.toTime);
              return t + (b > a ? b - a : 0);
            }, 0),
          0,
        );

        let note;
        if (locked) note = `${status} — cannot be changed`;
        else if (open === 0) note = week.start > todayISO ? "Not open yet" : "No day available";
        else note = `${open} of ${week.dates.length} day${week.dates.length > 1 ? "s" : ""} available`;

        return (
          <button
            key={week.start}
            type="button"
            disabled={disabled}
            onClick={() => openWeek(week)}
            className={`flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
              disabled
                ? "cursor-not-allowed border-dashed border-gray-200 bg-gray-50 opacity-70"
                : "border-gray-200 bg-white hover:border-[#c9cfee] hover:bg-[#f4f6fc]"
            }`}
          >
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                disabled ? "bg-gray-200 text-gray-500" : "bg-[#263383] text-white"
              }`}
            >
              Week {week.weekNo}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-gray-800">
                {dayMonth(week.start)} – {dayMonth(week.end)}
              </span>
              <span className="block text-xs text-gray-500">{note}</span>
            </span>
            <span className="flex-1" />
            <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-700">
              {minutesToHM(minutes)} hrs
            </span>
            <span className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
              {status}
            </span>
          </button>
        );
      })}
    </div>
  );

  // ---- render: one day ----------------------------------------------------
  const renderDay = (week, iso) => {
    const block = blockOf(iso);
    const server = serverDays[iso];
    const editable = dayEditable(week, iso);
    const list = rows[iso] || [];
    const problem = editable ? dayProblem(iso) : null;
    const open = !!openDays[iso];

    return (
      <div
        key={iso}
        className={`rounded-lg border ${
          block ? "border-dashed border-gray-200 bg-gray-50" : "border-gray-200 bg-white"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2.5 px-3 py-2">
          <button
            type="button"
            onClick={() => toggleDay(iso)}
            aria-expanded={open}
            aria-label={open ? `Collapse ${shortDay(iso)}` : `Expand ${shortDay(iso)}`}
            className="shrink-0 rounded p-0.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-[#263383]"
          >
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          <span
            className={`inline-flex items-center whitespace-nowrap rounded-md px-2.5 py-1 text-[13px] font-semibold ${
              block
                ? "text-gray-400 ring-1 ring-gray-200"
                : "bg-[#f4f6fc] text-[#263383] ring-1 ring-[#c9cfee]"
            }`}
          >
            {shortDay(iso)}
          </span>
          {iso === todayISO && (
            <span className="rounded-full border border-[#c9cfee] bg-[#f4f6fc] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-[#263383]">
              Today
            </span>
          )}
          <span className="whitespace-nowrap text-[13px] tabular-nums text-gray-500">
            {minutesToHM(dayMinutesOf(iso))} hrs
          </span>

          {block && <span className="text-xs text-gray-400">{block}</span>}
          {!block && !editable && (
            <span className="text-xs text-green-700">{server?.status || "Locked"}</span>
          )}
          {!block && editable && server?.status && (
            <span className="text-xs text-gray-400">{server.status}</span>
          )}
          {problem && (
            <span className="text-xs font-medium text-amber-700">{problem.label}</span>
          )}

          <span className="flex-1" />
          {editable && (
            <button
              type="button"
              onClick={() => addRow(iso)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-[#263383] transition-colors hover:bg-[#f4f6fc]"
            >
              <Plus size={14} /> Add Entry
            </button>
          )}
        </div>

        {open && list.length > 0 && (
          <div className="overflow-x-auto border-t border-gray-100">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="bg-indigo-900 text-white">
                  {["Project", "Task", "Start", "End", "Work Location", "Description", "Billable"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-left text-[10.5px] font-bold uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ),
                  )}
                  <th className="sticky right-0 z-10 bg-indigo-900 px-3 py-2 text-left text-[10.5px] font-bold uppercase tracking-wider">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => {
                  const billable = billableFor(row.projectId, row.taskId);
                  const confirming = confirmKey === row.key;
                  return (
                    <tr key={row.key} className="border-b border-gray-100 last:border-b-0">
                      <td className="min-w-[150px] max-w-[210px] px-2 py-1.5">
                        <FormSelect
                          name="projectId"
                          value={row.projectId}
                          options={projectOptions}
                          onChange={(e) => updateRow(iso, row.key, "projectId", e.target.value)}
                          placeholder="Select project"
                          maxVisibleOptions={3}
                          anchorOptions
                          buttonClassName="px-3 text-sm"
                        />
                      </td>
                      <td className="min-w-[150px] max-w-[210px] px-2 py-1.5">
                        <FormSelect
                          name="taskId"
                          value={row.taskId}
                          options={tasksFor(row.projectId)}
                          onChange={(e) => updateRow(iso, row.key, "taskId", e.target.value)}
                          placeholder={row.projectId ? "Select task" : "Project first"}
                          maxVisibleOptions={3}
                          anchorOptions
                          buttonClassName="px-3 text-sm"
                        />
                      </td>
                      <td className="w-[112px] px-2 py-1.5">
                        <FormTime
                          name="fromTime"
                          value={row.fromTime}
                          onChange={(e) => updateRow(iso, row.key, "fromTime", e.target.value)}
                          inputClassName="min-w-0 text-sm"
                        />
                      </td>
                      <td className="w-[112px] px-2 py-1.5">
                        <FormTime
                          name="toTime"
                          value={row.toTime}
                          onChange={(e) => updateRow(iso, row.key, "toTime", e.target.value)}
                          inputClassName="min-w-0 text-sm"
                        />
                      </td>
                      <td className="min-w-[132px] max-w-[170px] px-2 py-1.5">
                        <FormSelect
                          name="workLocation"
                          value={row.workLocation}
                          options={WORK_LOCATIONS}
                          onChange={(e) => updateRow(iso, row.key, "workLocation", e.target.value)}
                          placeholder="Select location"
                          maxVisibleOptions={4}
                          anchorOptions
                          buttonClassName="px-3 text-sm"
                        />
                      </td>
                      <td className="min-w-[150px] max-w-[280px] px-2 py-1.5">
                        <FormInput
                          name="description"
                          value={row.description}
                          onChange={(e) => updateRow(iso, row.key, "description", e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-sm text-gray-600">
                        {billable === null ? "—" : billable ? "Yes" : "No"}
                      </td>
                      <td className="sticky right-0 w-[74px] bg-white px-2 py-1.5 shadow-[-6px_0_6px_-6px_rgba(25,28,48,.18)]">
                        {confirming ? (
                          <span className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => removeRow(iso, row.key)}
                              disabled={deletingKey === row.key}
                              title="Confirm delete"
                              aria-label="Confirm delete"
                              className="rounded p-1 text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              <Check size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmKey(null)}
                              title="Keep entry"
                              aria-label="Keep entry"
                              className="rounded p-1 text-gray-500 hover:bg-gray-100"
                            >
                              <X size={15} />
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              row.entryId == null
                                ? removeRow(iso, row.key)
                                : setConfirmKey(row.key)
                            }
                            title={row.entryId == null ? "Remove row" : "Delete entry"}
                            aria-label="Delete entry"
                            className="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // ---- render -------------------------------------------------------------
  const weekMinutes = activeWeek
    ? activeWeek.dates.reduce((sum, iso) => sum + dayMinutesOf(iso), 0)
    : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      panelStyle={{
        width: "fit-content",
        minWidth: "min(72rem, 96vw)",
        maxWidth: "96vw",
      }}
      titleIcon={<CalendarDays className="h-5 w-5" />}
      title={
        activeWeek ? (
          <span className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveWeek(null)}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-sm font-semibold text-[#263383] hover:bg-[#f4f6fc]"
            >
              <ChevronLeft size={16} /> Weeks
            </button>
            <span>
              Week {activeWeek.weekNo} of {MONTH_NAMES[monthIndex]}
            </span>
          </span>
        ) : (
          `${MONTH_NAMES[monthIndex]} ${year}`
        )
      }
      subtitle={
        activeWeek
          ? `${dayMonth(activeWeek.start)} – ${dayMonth(activeWeek.end)} ${year}`
          : `Pick a week — ${weeks.length} in this month`
      }
      bodyClassName="p-4 sm:p-5"
      footer={
        activeWeek ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-baseline gap-2">
              <b className="text-xl font-bold tabular-nums tracking-tight">
                {minutesToHM(weekMinutes)}
              </b>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                hours this week
              </span>
            </span>
            <span className="flex-1" />
            <Button
              variant="primary"
              size="medium"
              onClick={saveDraft}
              disabled={saving || !hasUnsavedWork}
              loading={saving}
              loadingText="Saving..."
            >
              Save as draft
            </Button>
          </div>
        ) : null
      }
    >
      {loading ? (
        <div className="flex justify-center py-10">
          <LoadingSpinner text="Loading this month..." />
        </div>
      ) : activeWeek ? (
        <div className="flex flex-col gap-2.5">
          {activeWeek.dates.map((iso) => renderDay(activeWeek, iso))}
        </div>
      ) : (
        renderPicker()
      )}
    </Modal>
  );
};

export default WeeklyEntryModal;
