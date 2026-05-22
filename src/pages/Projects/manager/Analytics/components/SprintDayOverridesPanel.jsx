import React, { useState } from "react";
import { useSprintDayOverrides } from "../hooks/useSprintDayOverrides";

const fmt = (dateStr) =>
  new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

const toKey = (dateStr) => (dateStr ?? "").split("T")[0];

const Spinner = () => (
  <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

const XIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

const SprintDayOverridesPanel = ({ dailyBurnup = [], sprintId, onRefetch }) => {
  const {
    holidays,
    workingWeekends,
    overrideLoading,
    toggleHoliday,
    toggleWorkingWeekend,
  } = useSprintDayOverrides(sprintId, onRefetch);

  const [busy, setBusy]       = useState(null);
  const [addDate, setAddDate] = useState("");
  const [err, setErr]         = useState(null);

  if (!sprintId || dailyBurnup.length === 0) return null;

  const holidaySet        = new Set(holidays);
  const workingWeekendSet = new Set(workingWeekends);

  const weekendDays = dailyBurnup.filter((d) => d.isWeekend);

  // Sprint date range for the date input bounds
  const sprintDates = dailyBurnup.map((d) => toKey(d.date)).filter(Boolean);
  const minDate = sprintDates[0] ?? "";
  const maxDate = sprintDates[sprintDates.length - 1] ?? "";

  const selectedDateAlreadyHoliday = addDate && holidaySet.has(addDate);

  const run = async (fn) => {
    setErr(null);
    try {
      await fn();
    } catch {
      setErr("Action failed — please try again.");
    } finally {
      setBusy(null);
    }
  };

  const handleToggleWeekend = (day) => {
    const key = toKey(day.date);
    setBusy(key);
    run(() => toggleWorkingWeekend(key, !workingWeekendSet.has(key)));
  };

  const handleRemoveHoliday = (dateKey) => {
    setBusy(dateKey);
    run(() => toggleHoliday(dateKey, false));
  };

  const handleAddHoliday = () => {
    if (!addDate || selectedDateAlreadyHoliday) return;
    setBusy(addDate);
    run(async () => {
      await toggleHoliday(addDate, true);
      setAddDate("");
    });
  };

  return (
    <div>
      {overrideLoading && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
          <Spinner /> Refreshing…
        </div>
      )}

      {err && (
        <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {err}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

        {/* ── Working Weekends ── */}
        <div>
          <p className="text-xs font-semibold text-slate-600 mb-1">Working weekends</p>
          <p className="text-xs text-slate-400 mb-3">
            Mark a weekend day as a working day — it will be counted in the ideal burndown.
          </p>

          {weekendDays.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No weekends fall within this sprint.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {weekendDays.map((day) => {
                const key     = toKey(day.date);
                const active  = workingWeekendSet.has(key);
                const loading = busy === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleToggleWeekend(day)}
                    disabled={loading || (busy !== null && busy !== key)}
                    title={active ? "Click to remove as working day" : "Click to mark as working day"}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                      ${active
                        ? "bg-green-50 border-green-400 text-green-700 ring-1 ring-green-300 hover:bg-green-100"
                        : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"}
                      disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    {loading ? <Spinner /> : active ? <CheckIcon /> : null}
                    {fmt(day.date)}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Holidays ── */}
        <div>
          <p className="text-xs font-semibold text-slate-600 mb-1">Holidays</p>
          <p className="text-xs text-slate-400 mb-3">
            Mark a day as a holiday — it will be excluded from the ideal burndown.
          </p>

          {/* Current holidays */}
          {holidays.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {holidays.map((dateKey) => {
                const loading = busy === dateKey;
                return (
                  <span
                    key={dateKey}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 border border-amber-300 text-amber-700 ring-1 ring-amber-200"
                  >
                    {fmt(dateKey)}
                    <button
                      onClick={() => handleRemoveHoliday(dateKey)}
                      disabled={loading || (busy !== null && busy !== dateKey)}
                      className="ml-0.5 hover:text-amber-900 disabled:opacity-50"
                      aria-label={`Remove ${fmt(dateKey)} as holiday`}
                    >
                      {loading ? <Spinner /> : <XIcon />}
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Add holiday */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="date"
                value={addDate}
                min={minDate}
                max={maxDate}
                onChange={(e) => setAddDate(e.target.value)}
                className={`text-xs border rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400
                  ${selectedDateAlreadyHoliday
                    ? "border-amber-400 bg-amber-50 text-amber-700"
                    : "border-slate-200"}`}
              />
              {selectedDateAlreadyHoliday && (
                <span className="absolute -bottom-5 left-0 text-xs text-amber-600 whitespace-nowrap">
                  Already marked as holiday
                </span>
              )}
            </div>
            <button
              onClick={handleAddHoliday}
              disabled={!addDate || selectedDateAlreadyHoliday || busy !== null}
              className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy === addDate ? <Spinner /> : null}
              Add holiday
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SprintDayOverridesPanel;
