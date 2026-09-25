import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, X, Users, Video, Webcam, MonitorPlay, Phone } from "lucide-react";
import Button from "@/components/Button/Button";
import { Badge } from "@/components/ui/badge";
import FilterListbox from "../../../../components/filter/FilterListbox";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { getCampaignInterviews } from "../services/campaignservice";
// Reuses the Interview tab's own status-tone-map — deliberately not the
// app-wide statusbadge.jsx, whose keyword heuristics don't fit this
// vocabulary (same reasoning as the round cards themselves).
import { STATUS_LABEL } from "../../candidates/CandidateScore/tabs/Interview/interviewMock";

const STATUS_OPTIONS = ["PENDING", "SCHEDULED", "RESCHEDULED", "COMPLETED", "CANCELLED"];

// For the Status FilterListbox — single-select, "" = every status.
const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All Statuses" },
  ...STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_LABEL[s] })),
];

// One color family per status — a strong left bar, a near-white pastel
// fill, a bold colored title, and a softer/lighter shade of the same hue
// for the time line underneath. Matches the reference scheduling-app
// cards (solid accent stripe + tinted card + colored typography, no
// visible border on the other 3 sides) instead of a bordered badge chip.
// CANCELLED stays visible (muted rose), never hidden — just struck through.
const STATUS_CARD_STYLE = {
  PENDING: { bar: "border-amber-500", bg: "bg-amber-100", title: "text-amber-800", time: "text-amber-600", dot: "bg-amber-400" },
  SCHEDULED: { bar: "border-sky-500", bg: "bg-sky-100", title: "text-sky-800", time: "text-sky-600", dot: "bg-sky-400" },
  RESCHEDULED: { bar: "border-violet-600", bg: "bg-violet-100", title: "text-violet-800", time: "text-violet-600", dot: "bg-violet-500" },
  COMPLETED: { bar: "border-emerald-500", bg: "bg-emerald-100", title: "text-emerald-800", time: "text-emerald-600", dot: "bg-emerald-400" },
  CANCELLED: { bar: "border-rose-500", bg: "bg-rose-100", title: "text-rose-700", time: "text-rose-500", dot: "bg-rose-400" },
};

// Distinct icon per platform instead of one generic "video call" glyph for
// all three — real per-platform recognition, not just decoration.
const PLATFORM_ICON = { MEET: Video, ZOOM: Webcam, TEAMS: MonitorPlay, PHONE: Phone };

const unwrap = (res) => (res && res.data !== undefined ? res.data : res);

// start_at/end_at are documented as UTC instants, but this endpoint has
// been seen sending them with no trailing "Z"/offset (unlike the candidate
// detail page's interview endpoint, which always includes one) — a bare
// "2026-09-18T06:01:00" is parsed by `new Date()` as the *viewer's own
// local* time instead of UTC, silently reinterpreting the instant instead
// of leaving it needing conversion. Every place this calendar parses
// start_at/end_at goes through this instead of a raw `new Date(iso)`, so
// it's still correct even when the zone designator is missing. Each entry
// also carries a `timezone` field, but that's only the zone the scheduler
// happened to pick when creating the interview — informational, never
// used here to pick a display zone.
function parseInstant(iso) {
  if (!iso) return null;
  const hasZoneDesignator = /Z$|[+-]\d{2}:?\d{2}$/.test(iso);
  return new Date(hasZoneDesignator ? iso : `${iso}Z`);
}

function toDateOnly(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isSameDate(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Monday-start week, matching the reference layout's Mon..Sun columns.
function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 (Sun) .. 6 (Sat)
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

// "Aug 24 - Aug 30, 2026" (or "Aug 28 - Sep 3, 2026" across a month boundary).
function formatWeekRangeTitle(weekStart) {
  const weekEnd = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const startStr = weekStart.toLocaleDateString([], { month: "short", day: "numeric" });
  const endStr = weekEnd.toLocaleDateString([], sameMonth ? { day: "numeric" } : { month: "short", day: "numeric" });
  return `${startStr} - ${endStr}, ${weekEnd.getFullYear()}`;
}

// ISO-8601 week number, for the "Week N" badge next to the toolbar title.
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

// "9am", "12pm", "1pm" — the time-axis label format.
function formatHourLabel(hour) {
  const period = hour >= 12 ? "pm" : "am";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${period}`;
}

// "09:30 AM" — always zero-padded, matching the meeting-card reference.
function formatClockTime(date) {
  let h = date.getHours();
  const m = date.getMinutes();
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12 === 0 ? 12 : h % 12;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

// Simple greedy interval-graph layout: events that overlap in time within
// the same day get placed in side-by-side columns instead of stacking on
// top of each other. Not a full "recombine trailing gaps" packer — good
// enough for the handful of same-slot interviews this calendar sees.
function layoutDayEvents(dayEntries) {
  const sorted = [...dayEntries].sort((a, b) => parseInstant(a.start_at) - parseInstant(b.start_at));
  const columnEnds = [];
  const placed = sorted.map((entry) => {
    const start = parseInstant(entry.start_at);
    const end = parseInstant(entry.end_at);
    let colIndex = columnEnds.findIndex((endTime) => endTime <= start);
    if (colIndex === -1) {
      colIndex = columnEnds.length;
      columnEnds.push(end);
    } else {
      columnEnds[colIndex] = end;
    }
    return { entry, colIndex };
  });
  const totalCols = columnEnds.length || 1;
  return placed.map((p) => ({ ...p, totalCols }));
}

const HOUR_ROW_PX = 76;
const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 21;
const TIME_COL_PX = 56;
const DAY_COL_MIN_PX = 110;

// Two-line day header — small uppercase weekday over a large bold date
// number, today's picked out with a filled blue circle.
function DayHeaderCell({ date, isToday }) {
  const weekday = date.toLocaleDateString([], { weekday: "short" }).toUpperCase();
  return (
    <div className={`flex flex-col items-center justify-center py-2.5 gap-1 border-l border-slate-300 ${isToday ? "bg-blue-50/60" : ""}`}>
      <span className="text-[10px] font-bold tracking-wide text-slate-400">{weekday}</span>
      <span
        className={`flex items-center justify-center h-6 w-6 rounded-full text-[13px] font-bold ${
          isToday ? "bg-blue-600 text-white" : "text-slate-700"
        }`}
      >
        {date.getDate()}
      </span>
    </div>
  );
}

// The meeting card — solid colored left bar, near-white pastel fill, no
// rounded corners, bold colored title, lighter-shade time line — plus the
// extra fields the backend actually sends (round/interview type,
// platform, interviewer names). Collapsed by default to just the
// candidate's name; hovering it expands the card in place to hold every
// field that has data, wrapping instead of clipping — the card's own
// height grows (`minHeight` off the duration-based slot as a floor while
// collapsed) to fully contain that content rather than truncating it or
// floating a fixed-size copy over its neighbors. Full detail (every
// interviewer + status) is always in the tooltip regardless.
// CANCELLED stays visible (never hidden) — just muted + struck through.
function MeetingCard({ entry, style, onClick }) {
  const [hovered, setHovered] = useState(false);
  const tone = STATUS_CARD_STYLE[entry.status] || STATUS_CARD_STYLE.PENDING;
  const interviewerNames = (entry.interviewers || []).map((i) => i.name).filter(Boolean);
  const hasDetails = entry.platform || entry.round_number != null;
  const hasNames = interviewerNames.length > 0;
  const PlatformIcon = entry.platform && PLATFORM_ICON[entry.platform];

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(entry);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        top: style.top,
        left: style.left,
        // A bit wider while hovered/expanded — still growing from this
        // card's own left edge (unchanged above), not jumping to a fixed
        // size, so it doesn't shift where the card visually starts.
        width: hovered ? `calc(${style.width} + 40px)` : style.width,
        // The real, duration-based height is only a floor while collapsed;
        // hovering lets the card grow past it to fit every field instead
        // of clipping.
        minHeight: hovered ? undefined : style.height,
        zIndex: hovered ? 30 : undefined,
      }}
      className={`absolute text-left rounded-r-md border-l-8 ${tone.bg} ${tone.bar} flex flex-col justify-center gap-0.5 px-3 py-1.5 ${
        hovered ? "shadow-lg" : "overflow-hidden shadow-sm hover:shadow-md"
      } transition-[width,box-shadow]`}
    >
      <div className={`text-[12px] font-bold leading-snug ${hovered ? "" : "truncate"} ${tone.title}`}>
        {entry.candidate_name}
      </div>
      {hovered && (
        <>
          <div className={`text-[10.5px] font-medium ${tone.time}`}>
            {formatClockTime(parseInstant(entry.start_at))} - {formatClockTime(parseInstant(entry.end_at))}
          </div>
          {hasDetails && (
            <div className={`flex items-center gap-2 flex-wrap text-[9.5px] font-semibold opacity-75 ${tone.time}`}>
              <span>
                Round {entry.round_number}
                {entry.interview_type ? ` · ${entry.interview_type}` : ""}
              </span>
              {entry.platform && (
                <span className="flex items-center gap-0.5 shrink-0">
                  {PlatformIcon && <PlatformIcon size={9} />}
                  {entry.platform}
                </span>
              )}
            </div>
          )}
          {hasNames && (
            <div className={`flex items-start gap-1 text-[9.5px] font-medium opacity-70 ${tone.time}`}>
              <Users size={9} className="shrink-0 mt-0.5" />
              <span>{interviewerNames.join(", ")}</span>
            </div>
          )}
        </>
      )}
    </button>
  );
}

function StatusLegend() {
  return (
    <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 text-[11.5px] text-slate-600">
      {STATUS_OPTIONS.map((status) => (
        <span key={status} className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${STATUS_CARD_STYLE[status].dot}`} />
          {STATUS_LABEL[status]}
        </span>
      ))}
    </div>
  );
}

function CalendarToolbar({
  title,
  weekNumber,
  onPrev,
  onNext,
  onToday,
  statusFilter,
  onStatusFilterChange,
  interviewerEmailInput,
  onInterviewerEmailInputChange,
  onApplyInterviewerEmail,
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous week"
          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          onClick={onNext}
          aria-label="Next week"
          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <button
        type="button"
        onClick={onToday}
        className="text-[11.5px] font-semibold text-slate-500 border border-slate-200 rounded-md px-2 py-1 hover:bg-slate-100 hover:text-slate-900 transition-colors"
      >
        Today
      </button>
      <span className="text-[14px] font-bold text-slate-900">{title}</span>
      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 rounded-full px-2.5 py-1">Week {weekNumber}</span>

      {/* — status + interviewer email, pushed to the far right */}
      <div className="ml-auto flex items-center gap-2">
        <div className="w-40">
          <FilterListbox
            options={STATUS_FILTER_OPTIONS}
            value={statusFilter}
            onChange={onStatusFilterChange}
            buttonClassName="w-full cursor-default rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-left text-[12px] shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <input
          type="text"
          value={interviewerEmailInput}
          onChange={(e) => onInterviewerEmailInputChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onApplyInterviewerEmail()}
          placeholder="interviewer@company.com"
          className="w-48 px-3 py-1.5 rounded-lg border border-slate-200 text-[12px] outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Button variant="outline" size="small" onClick={onApplyInterviewerEmail}>
          Search
        </Button>
      </div>
    </div>
  );
}

// Campaign-wide interview calendar — every candidate's rounds in one
// campaign, not one candidate's. No pagination on the backend endpoint;
// the calendar's own visible range (start_date/end_date) is what bounds
// the result size, so only a week change re-fetches. Status/interviewer
// filters narrow that same fetched set client-side (see filteredEntries)
// instead of each triggering their own re-fetch.
//
// Custom-built weekly grid — no FullCalendar dependency. Only the
// visual/layout is custom here; campaign filtering, the interview fetch,
// and the click-through to a candidate's Interview tab are all unchanged
// from before.
export default function InterviewCalendarTab({ campaignId }) {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Anchored to the viewer's own local time throughout — "today"/week
  // boundaries and the now-line must land on the same local day/hour the
  // event cards themselves are drawn in (see the module-level comment above).
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [now, setNow] = useState(() => new Date());
  const [statusFilter, setStatusFilter] = useState(""); // "" = no filter, matches every status
  const [interviewerEmailInput, setInterviewerEmailInput] = useState(""); // draft, bound to the input
  const [appliedInterviewerEmail, setAppliedInterviewerEmail] = useState(""); // last value actually sent to the backend

  // Ticks the "now" line forward once a minute — not tied to any fetch.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  // Exclusive end, same convention the old FullCalendar-driven fetch used
  // (arg.end was always the day *after* the last visible day).
  const range = useMemo(
    () => ({ startDate: toDateOnly(weekStart), endDate: toDateOnly(addDays(weekStart, 7)) }),
    [weekStart]
  );

  // Only the date range is ever sent to the backend — per this endpoint's
  // own contract there's no pagination, the whole visible range comes back
  // in one shot, so status/interviewer-email narrow that same in-memory
  // set (see filteredEntries below) rather than triggering a re-fetch.
  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCampaignInterviews(campaignId, {
        startDate: range.startDate,
        endDate: range.endDate,
      });
      const items = unwrap(res);
      setEntries(Array.isArray(items) ? items : []);
    } catch (err) {
      setError(err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [campaignId, range]);

  // Re-fetches on week navigation AND on campaign switch (InterviewCalendarPage's
  // own selector, a level up) — no full page reload, just this one call.
  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const goPrevWeek = () => setWeekStart((w) => addDays(w, -7));
  const goNextWeek = () => setWeekStart((w) => addDays(w, 7));
  const goToday = () => setWeekStart(startOfWeek(new Date()));

  const applyInterviewerEmail = () => setAppliedInterviewerEmail(interviewerEmailInput.trim());

  const clearAllFilters = () => {
    setStatusFilter("");
    setInterviewerEmailInput("");
    setAppliedInterviewerEmail("");
  };

  const activeFilterCount = (statusFilter ? 1 : 0) + (appliedInterviewerEmail ? 1 : 0);

  // Status + interviewer-email filters, applied client-side to whatever
  // the current week already fetched.
  const filteredEntries = useMemo(() => {
    const email = appliedInterviewerEmail.toLowerCase();
    return entries.filter((e) => {
      if (statusFilter && e.status !== statusFilter) return false;
      if (email && !(e.interviewers || []).some((i) => (i.email || "").toLowerCase().includes(email))) return false;
      return true;
    });
  }, [entries, statusFilter, appliedInterviewerEmail]);

  // PENDING rounds have no start_at/end_at — they can't be placed on the
  // grid, so they're listed separately below instead of silently dropped.
  const scheduledEntries = useMemo(() => filteredEntries.filter((e) => e.start_at && e.end_at), [filteredEntries]);
  const pendingEntries = useMemo(() => filteredEntries.filter((e) => !e.start_at || !e.end_at), [filteredEntries]);

  // parseInstant() (see module-level comment above) — the current viewer's
  // own local getters then read the grid position and label out correctly
  // regardless of whether start_at/end_at carried a zone designator.
  const { minHour, maxHour } = useMemo(() => {
    let min = DEFAULT_START_HOUR;
    let max = DEFAULT_END_HOUR;
    scheduledEntries.forEach((e) => {
      const s = parseInstant(e.start_at);
      const en = parseInstant(e.end_at);
      min = Math.min(min, s.getHours());
      const endHour = en.getMinutes() > 0 ? en.getHours() + 1 : en.getHours();
      max = Math.max(max, endHour);
    });
    if (max <= min) max = min + 1;
    return { minHour: min, maxHour: max };
  }, [scheduledEntries]);

  const hours = useMemo(() => Array.from({ length: maxHour - minHour }, (_, i) => minHour + i), [minHour, maxHour]);
  const gridHeight = hours.length * HOUR_ROW_PX;

  const entriesByDay = useMemo(() => {
    const buckets = weekDays.map(() => []);
    scheduledEntries.forEach((e) => {
      const idx = weekDays.findIndex((d) => isSameDate(d, parseInstant(e.start_at)));
      if (idx >= 0) buckets[idx].push(e);
    });
    return buckets.map(layoutDayEvents);
  }, [scheduledEntries, weekDays]);

  const todayIdx = weekDays.findIndex((d) => isSameDate(d, now));
  const nowInRange = todayIdx >= 0 && now.getHours() >= minHour && now.getHours() < maxHour;
  const nowTop = nowInRange ? (((now.getHours() - minHour) * 60 + now.getMinutes()) / 60) * HOUR_ROW_PX : null;

  // This is a summary view only (no notes/meeting_link/history here by
  // design), so clicking through goes straight to the candidate's own
  // Interview tab via CandidateScorePage's ?tab= deep-link, rather than
  // landing on its default Summary tab and requiring one more click.
  const goToCandidate = (entry) => navigate(`/ai-screening/candidates/${entry.campaign_candidate_id}?tab=interview`, {
    state: { candidate: entry, campaignId },
  });

  const gridMinWidth = TIME_COL_PX + 7 * DAY_COL_MIN_PX;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-200">
      {/* — calendar */}
      <div className="p-4">
        <CalendarToolbar
          title={formatWeekRangeTitle(weekStart)}
          weekNumber={getISOWeek(weekStart)}
          onPrev={goPrevWeek}
          onNext={goNextWeek}
          onToday={goToday}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          interviewerEmailInput={interviewerEmailInput}
          onInterviewerEmailInputChange={setInterviewerEmailInput}
          onApplyInterviewerEmail={applyInterviewerEmail}
        />

        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-slate-100">
            <span className="text-[11.5px] text-slate-500">
              {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active
            </span>
            {statusFilter && (
              <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-semibold px-2.5 py-1 text-[11px] gap-1.5">
                {STATUS_LABEL[statusFilter]}
                <button type="button" onClick={() => setStatusFilter("")} className="hover:text-slate-950" aria-label={`Remove ${STATUS_LABEL[statusFilter]} filter`}>
                  <X size={10} />
                </button>
              </Badge>
            )}
            {appliedInterviewerEmail && (
              <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-semibold px-2.5 py-1 text-[11px] gap-1.5">
                {appliedInterviewerEmail}
                <button
                  type="button"
                  onClick={() => {
                    setInterviewerEmailInput("");
                    setAppliedInterviewerEmail("");
                  }}
                  className="hover:text-slate-950"
                  aria-label="Remove interviewer email filter"
                >
                  <X size={10} />
                </button>
              </Badge>
            )}
            <button type="button" onClick={clearAllFilters} className="text-[11.5px] font-semibold text-blue-600 hover:underline">
              Clear all
            </button>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-slate-100">
          <StatusLegend />
        </div>

        <div className="relative mt-3">
          {loading && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-xl z-30">
              <LoadingSpinner text="Loading interviews..." />
            </div>
          )}

          {error ? (
            <div className="py-16 text-center text-[12.5px] text-slate-500">Couldn't load the interview calendar. Please try again.</div>
          ) : (
            <>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <div style={{ minWidth: gridMinWidth }}>
                  {/* One continuous grid for header + body, header pinned via
                      sticky rather than split into a separate outer grid —
                      two independent grids drift out of alignment the moment
                      the body's own scrollbar gutter (overflow-y-auto below)
                      shaves a few px off its available width that the header
                      never accounted for. This way every column — the day
                      headers, the hour gridlines, every meeting card — shares
                      the exact same track sizes, always. */}
                  <div className="max-h-[680px] overflow-y-auto">
                    <div className="grid" style={{ gridTemplateColumns: `${TIME_COL_PX}px repeat(7, minmax(${DAY_COL_MIN_PX}px, 1fr))` }}>
                      {/* header row */}
                      <div className="sticky top-0 z-20 bg-white border-b border-slate-300" />
                      {weekDays.map((d, i) => (
                        <div key={`h${i}`} className="sticky top-0 z-20 bg-white border-b border-slate-300">
                          <DayHeaderCell date={d} isToday={isSameDate(d, now)} />
                        </div>
                      ))}

                      {/* time axis column */}
                      <div className="relative" style={{ height: gridHeight }}>
                        {hours.map((h, i) => (
                          <span
                            key={h}
                            className="absolute right-2 -translate-y-1/2 text-[10px] font-medium text-slate-400"
                            style={{ top: i * HOUR_ROW_PX }}
                          >
                            {formatHourLabel(h)}
                          </span>
                        ))}
                        {nowTop != null && (
                          <span
                            className="absolute right-2 -translate-y-1/2 text-[9.5px] font-bold text-red-500"
                            style={{ top: nowTop }}
                          >
                            {formatClockTime(now)}
                          </span>
                        )}
                      </div>

                      {/* day columns — each carries its own hour gridlines
                          and (for today) its own now-line segment, so they
                          never depend on a separately-sized overlay. */}
                      {weekDays.map((d, di) => {
                        const isToday = isSameDate(d, now);
                        return (
                          <div key={`c${di}`} className={`relative border-l border-slate-300 ${isToday ? "bg-blue-50/40" : ""}`} style={{ height: gridHeight }}>
                            {hours.map((h, i) => (
                              <div key={h} className="absolute left-0 right-0 border-t border-slate-300" style={{ top: i * HOUR_ROW_PX }} />
                            ))}

                            {isToday && nowTop != null && (
                              <div className="absolute left-0 right-0 z-20 flex items-center pointer-events-none" style={{ top: nowTop }}>
                                <span className="h-2 w-2 rounded-full bg-red-500 -ml-1 shadow" />
                                <span className="flex-1 h-px bg-red-500" />
                              </div>
                            )}

                            {entriesByDay[di].map(({ entry, colIndex, totalCols }) => {
                              // The viewer's own local hour/minute for this
                              // instant — same reasoning as minHour/maxHour above.
                              const localStart = parseInstant(entry.start_at);
                              const top = (((localStart.getHours() - minHour) * 60 + localStart.getMinutes()) / 60) * HOUR_ROW_PX;
                              // Real proportional height — MeetingCard treats
                              // this as a floor (minHeight) only, growing
                              // taller than its time slot when its content
                              // needs more room.
                              const durationMin = Math.max(5, (parseInstant(entry.end_at) - parseInstant(entry.start_at)) / 60000);
                              // -2px so back-to-back meetings (one ends
                              // exactly when the next starts) get a small
                              // visible gap instead of their edges touching
                              // and reading as one merged block.
                              const height = Math.max((durationMin / 60) * HOUR_ROW_PX - 2, 28);
                              const widthPct = 100 / totalCols;
                              const leftPct = colIndex * widthPct;
                              return (
                                <MeetingCard
                                  key={entry.id}
                                  entry={entry}
                                  onClick={goToCandidate}
                                  style={{
                                    top,
                                    height,
                                    left: `calc(${leftPct}% + 6px)`,
                                    width: `calc(${widthPct}% - 14px)`,
                                  }}
                                />
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* — not yet scheduled */}
      {pendingEntries.length > 0 && (
        <div>
          <div className="text-[12.5px] font-bold text-slate-900 px-4 pt-4 pb-3">Not yet scheduled ({pendingEntries.length})</div>
          <ul className="divide-y divide-slate-100">
            {pendingEntries.map((e) => (
              <li key={e.id} className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap hover:bg-slate-50/60 transition-colors">
                <span className="text-[12.5px] text-slate-700">
                  <span className="font-semibold text-slate-900">{e.candidate_name}</span>{" "}
                  <span className="text-slate-400">
                    · Round {e.round_number}
                    {e.interview_type ? ` · ${e.interview_type}` : ""}
                  </span>
                </span>
                <Button variant="outline" size="small" onClick={() => goToCandidate(e)}>
                  View Candidate
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
