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

// Every interview payload seen so far carries "Asia/Calcutta" — used as
// the fallback whenever an entry is somehow missing its own `timezone`,
// and for "now"/"today" so the live indicator lines up with zoned events
// even when the viewer's own machine is set to a different timezone.
const DEFAULT_TZ = "Asia/Calcutta";

// The wall-clock date/time `date` reads as inside `timeZone` — e.g. the
// same UTC instant is "03:04" in UTC but "08:34" in Asia/Calcutta; this
// reads out the latter.
function getZonedParts(date, timeZone) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  const parts = fmt.formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month") - 1, day: get("day"), hour: get("hour"), minute: get("minute") };
}

// A Date whose own local getters (getHours, getDate, getMonth, ...) read
// out the wall-clock time in `timeZone` instead of the browser's own
// zone. start_at/end_at arrive as UTC instants ("...Z") plus a separate
// `timezone` field the interview was actually scheduled in — without
// this, `new Date(iso).getHours()` silently reinterprets that instant
// through whatever zone the viewer's machine happens to be set to, which
// only matches the intended time by coincidence. Every place this
// calendar positions or labels an event uses this instead of a raw
// `new Date(iso)`.
function toZonedDate(isoOrDate, timeZone) {
  const date = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (!timeZone) return date;
  const { year, month, day, hour, minute } = getZonedParts(date, timeZone);
  return new Date(year, month, day, hour, minute);
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
  const sorted = [...dayEntries].sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
  const columnEnds = [];
  const placed = sorted.map((entry) => {
    const start = new Date(entry.start_at);
    const end = new Date(entry.end_at);
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

// A duration under this many pixels can't fit both the title and time
// lines without clipping — those slots collapse to a single truncated
// title line and only reveal the full card (every field: time, round,
// platform, interviewer names) on hover, instead of forcing every short
// meeting to a taller-than-real box.
const COLLAPSE_HEIGHT_PX = 40;
// Above this, there's room for a third line — round/interview type +
// platform, straight from the API payload.
const DETAILS_HEIGHT_PX = 62;
// Above this, there's room for a fourth line — the interviewers' actual
// names, not just a count.
const NAMES_HEIGHT_PX = 84;
// Per extra line's pixel cost, for sizing the hover-expanded box.
const LINE_HEIGHT_PX = 15;

// The meeting card — solid colored left bar, near-white pastel fill, no
// rounded corners, bold colored title, lighter-shade time line — plus the
// extra fields the backend actually sends (round/interview type,
// platform, interviewer names) once the block is tall enough to hold
// them. A card too short for that shows just the title, and hovering it
// expands the box (floating above its neighbors, no layout shift) until
// every field is fully visible — not just title+time. Full detail (every
// interviewer + status) is always in the tooltip regardless.
// CANCELLED stays visible (never hidden) — just muted + struck through.
function MeetingCard({ entry, style, onClick, isNarrow }) {
  const [hovered, setHovered] = useState(false);
  const tone = STATUS_CARD_STYLE[entry.status] || STATUS_CARD_STYLE.PENDING;
  const isShort = style.height < COLLAPSE_HEIGHT_PX;
  const interviewerNames = (entry.interviewers || []).map((i) => i.name).filter(Boolean);
  const hasDetails = entry.platform || entry.round_number != null;
  const hasNames = interviewerNames.length > 0;
  // Not just the shortest, single-line cards — anything whose real height
  // can't already fit every field (time + round/platform + interviewer
  // names) gets a hover-expand too, so a "medium" card that's only
  // showing title+time still reveals the rest on hover. A tall-but-narrow
  // card (splitting its column with another meeting at the same time)
  // also needs it — plenty of vertical room doesn't help when the text
  // itself is being clipped by a too-narrow width, not too little height.
  const fullHeightNeeded = 40 + (hasDetails ? LINE_HEIGHT_PX : 0) + (hasNames ? LINE_HEIGHT_PX : 0);
  const canExpand = isNarrow || style.height < fullHeightNeeded;
  const expanded = canExpand && hovered;
  const showDetails = (expanded || style.height >= DETAILS_HEIGHT_PX) && hasDetails;
  const showNames = (expanded || style.height >= NAMES_HEIGHT_PX) && hasNames;
  const PlatformIcon = entry.platform && PLATFORM_ICON[entry.platform];
  const tz = entry.timezone || DEFAULT_TZ;

  const expandedMinHeight = 40 + (showDetails ? LINE_HEIGHT_PX : 0) + (showNames ? LINE_HEIGHT_PX : 0);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(entry);
      }}
      onMouseEnter={() => canExpand && setHovered(true)}
      onMouseLeave={() => canExpand && setHovered(false)}
      style={{
        ...style,
        // Grows to the right from this card's own position (left stays
        // put) instead of jumping to the day column's edge — a wide
        // enough box that it's rarely cramped, floating over whatever it
        // now overlaps (elevated z-index) rather than being squeezed to
        // its original split-column width.
        width: expanded ? 220 : style.width,
        // Never shrinks below its real (possibly hours-tall) height —
        // only `minHeight` grows to fit content when the box was too
        // short. Forcing height:auto on an already-tall card would
        // contract it out from under the cursor, firing mouseLeave,
        // which un-expands it, moving the cursor back in — an infinite
        // expand/collapse flicker.
        minHeight: expanded ? expandedMinHeight : undefined,
        zIndex: expanded ? 50 : undefined,
      }}
      className={`absolute text-center rounded-r-md border-l-8 ${tone.bg} ${tone.bar} ${expanded ? "shadow-lg" : "overflow-hidden"} ${
        isShort && !expanded ? "flex items-center justify-center px-2.5 py-0" : "flex flex-col items-center justify-center px-3 py-1.5"
      } hover:shadow-md transition-shadow`}
    >
      <div className={`text-[12px] font-bold leading-snug ${expanded ? "" : "truncate"} ${tone.title}`}>
        {entry.candidate_name}
      </div>
      {(!isShort || expanded) && (
        <div className={`text-[10.5px] font-medium mt-0.5 ${expanded ? "" : "truncate"} ${tone.time}`}>
          {formatClockTime(toZonedDate(entry.start_at, tz))} - {formatClockTime(toZonedDate(entry.end_at, tz))}
        </div>
      )}
      {showDetails && (
        <div className={`flex items-center gap-2 text-[9.5px] font-semibold opacity-75 mt-0.5 ${expanded ? "flex-wrap" : "truncate"} ${tone.time}`}>
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
      {showNames && (
        <div className={`flex items-center gap-1 text-[9.5px] font-medium opacity-70 mt-0.5 ${expanded ? "" : "truncate"} ${tone.time}`}>
          <Users size={9} className="shrink-0" />
          <span className={expanded ? "" : "truncate"}>{interviewerNames.join(", ")}</span>
        </div>
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
  // Anchored to DEFAULT_TZ, not the browser's own zone — otherwise "today"/
  // week boundaries and the now-line would land on a different day/hour
  // than the zoned event cards whenever the viewer's machine isn't set to
  // the same timezone the interviews were actually scheduled in.
  const [weekStart, setWeekStart] = useState(() => startOfWeek(toZonedDate(new Date(), DEFAULT_TZ)));
  const [now, setNow] = useState(() => toZonedDate(new Date(), DEFAULT_TZ));
  const [statusFilter, setStatusFilter] = useState(""); // "" = no filter, matches every status
  const [interviewerEmailInput, setInterviewerEmailInput] = useState(""); // draft, bound to the input
  const [appliedInterviewerEmail, setAppliedInterviewerEmail] = useState(""); // last value actually sent to the backend

  // Ticks the "now" line forward once a minute — not tied to any fetch.
  useEffect(() => {
    const t = setInterval(() => setNow(toZonedDate(new Date(), DEFAULT_TZ)), 60000);
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
  const goToday = () => setWeekStart(startOfWeek(toZonedDate(new Date(), DEFAULT_TZ)));

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

  // start_at/end_at are UTC instants ("...Z"); each entry also carries its
  // own `timezone` (e.g. "Asia/Calcutta") — the zone it was actually
  // scheduled in. toZonedDate() reads the instant back out in THAT zone,
  // not whatever zone the viewer's own machine happens to be set to, so
  // the grid position and label always agree with the intended wall-clock
  // time regardless of who's looking at it.
  const { minHour, maxHour } = useMemo(() => {
    let min = DEFAULT_START_HOUR;
    let max = DEFAULT_END_HOUR;
    scheduledEntries.forEach((e) => {
      const tz = e.timezone || DEFAULT_TZ;
      const s = toZonedDate(e.start_at, tz);
      const en = toZonedDate(e.end_at, tz);
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
      const idx = weekDays.findIndex((d) => isSameDate(d, toZonedDate(e.start_at, e.timezone || DEFAULT_TZ)));
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
  const goToCandidate = (entry) => navigate(`/airs/candidates/${entry.campaign_candidate_id}?tab=interview`, {
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
                              // Zoned for the row position (must match the
                              // wall-clock hour the interview was actually
                              // scheduled at); the true UTC instants for
                              // duration, which is timezone-invariant either way.
                              const zonedStart = toZonedDate(entry.start_at, entry.timezone || DEFAULT_TZ);
                              const top = (((zonedStart.getHours() - minHour) * 60 + zonedStart.getMinutes()) / 60) * HOUR_ROW_PX;
                              // Real proportional height, not padded up to a
                              // minimum — accurate time-block sizing is what
                              // triggers MeetingCard's own collapse/expand
                              // behavior for anything too short to fit both lines.
                              const durationMin = Math.max(5, (new Date(entry.end_at) - new Date(entry.start_at)) / 60000);
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
                                  isNarrow={totalCols > 1}
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
