import { useState, useMemo, useRef, useCallback, useEffect, memo } from "react";
import { createPortal } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Layers, User } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ----- Constants -----
const TRACK_HEIGHT = 36;
const ROW_PADDING = 13;

// ----- Helper Functions -----

/**
 * Parses a date string (YYYY-MM-DD) or Date object into a local Date object at 00:00:00.
 * This avoids the common bug where YYYY-MM-DD is parsed as UTC midnight.
 */
function parseDate(d) {
  if (!d) {
    const now = new Date();
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );
  }
  if (d instanceof Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  }
  if (typeof d === "string" && d.includes("-")) {
    const parts = d.split("-");
    if (parts.length === 3) {
      return new Date(
        parseInt(parts[0]),
        parseInt(parts[1]) - 1,
        parseInt(parts[2]),
        0,
        0,
        0,
        0,
      );
    }
  }
  const date = new Date(d);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0,
  );
}

function addDays(date, days) {
  const d = parseDate(date);
  d.setDate(d.getDate() + days);
  return d;
}

function daysBetween(a, b) {
  const d1 = parseDate(a);
  const d2 = parseDate(b);
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(d) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMonthYear(d) {
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function getBarColor(allocation, tentative) {
  if (tentative) return "bg-slate-200 border-slate-300 border-dashed";
  if (allocation > 100) return "bg-red-500 border-red-600";
  if (allocation > 70) return "bg-rose-400 border-rose-500";
  if (allocation > 20) return "bg-amber-400 border-amber-500";
  return "bg-emerald-500 border-emerald-600";
}

function getBarHoverColor(allocation, tentative) {
  if (tentative) return "hover:bg-slate-300";
  if (allocation > 100) return "hover:bg-red-600";
  if (allocation > 70) return "hover:bg-rose-500";
  if (allocation > 20) return "hover:bg-amber-500";
  return "hover:bg-emerald-600";
}

function getZoomConfig(zoom) {
  switch (zoom) {
    case "week":
      return {
        dayWidth: 32,
        totalDaysBefore: 14,
        totalDaysAfter: 42,
        tickInterval: 7,
      };
    case "month":
      return {
        dayWidth: 8,
        totalDaysBefore: 30,
        totalDaysAfter: 120,
        tickInterval: 30,
      };
    case "quarter":
      return {
        dayWidth: 3.2,
        totalDaysBefore: 60,
        totalDaysAfter: 180,
        tickInterval: 30,
      };
  }
}

function groupByRole(resources) {
  const map = new Map();
  for (const r of resources) {
    const existing = map.get(r.role) || [];
    existing.push(r);
    map.set(r.role, existing);
  }
  return map;
}

function getResourceMeta(resource) {
  const parts = [resource.location, resource.role].filter(Boolean);
  return parts.length > 0 ? parts.join(" | ") : "N/A";
}

// ----- Sub-components -----

const TimelineHeader = memo(function TimelineHeader({
  zoom,
  ticks,
  todayOffset,
  totalDays,
  dayWidth,
}) {
  return (
    <div
      className="sticky top-0 h-10 border-b bg-white/95 backdrop-blur-sm z-40"
      style={{ width: `${totalDays * dayWidth}px` }}
    >
      {ticks.map((tick, i) => (
        <div
          key={i}
          className="absolute top-0 h-full flex items-center border-l border-border/20"
          style={{ left: `${tick.offset}px` }}
        >
          <span className="text-[10px] font-sans text-muted-foreground pl-1.5 whitespace-nowrap font-semibold">
            {tick.label}
          </span>
        </div>
      ))}
      {todayOffset >= 0 && todayOffset <= totalDays * dayWidth && (
        <div
          className="absolute top-0 h-full w-px bg-primary"
          style={{ left: `${todayOffset}px` }}
        >
          <div className="absolute -top-0 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 rounded-b leading-tight py-0.5 shadow-sm">
            Today
          </div>
        </div>
      )}
    </div>
  );
});

const AllocationBar = memo(function AllocationBar({
  block,
  startDate,
  dayWidth,
  resource,
  onResourceClick,
  style,
}) {
  const startOffset = daysBetween(startDate, parseDate(block.startDate)) * dayWidth;
  const durationDays = daysBetween(parseDate(block.startDate), parseDate(block.endDate));
  const width = Math.max(durationDays * dayWidth, 4);

  const [hoverPos, setHoverPos] = useState(null);

  const handleMouseMove = useCallback((e) => {
    const isCloseToTop = e.clientY < 120;
    setHoverPos({ 
      x: e.clientX, 
      y: isCloseToTop ? e.clientY + 20 : e.clientY - 12,
      isCloseToTop
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoverPos(null);
  }, []);

  const isAvailability = block.isAvailability || block.allocation === 0;
  const barColor = isAvailability
    ? "bg-slate-50 border-slate-200 border-dashed"
    : getBarColor(block.allocation, block.tentative);
  const hoverColor = isAvailability
    ? "hover:bg-slate-100"
    : getBarHoverColor(block.allocation, block.tentative);

  const projectName = block.project || block.projectName || block.demandName || (isAvailability ? "Available" : "Project");

  return (
    <div
      className="absolute group/bar hover:z-[100]"
      style={{
        left: `${startOffset}px`,
        width: `${width}px`,
        ...style,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={cn(
          "w-full h-full rounded-md border flex flex-col justify-center px-1.5 sm:px-2 transition-all shadow-sm overflow-hidden",
          barColor,
          hoverColor,
          isAvailability ? "cursor-default text-slate-400" : "cursor-pointer text-white",
        )}
        onClick={() => !isAvailability && onResourceClick && onResourceClick(resource)}
      >
        <div className="flex items-center gap-1 sm:gap-2 truncate max-w-full">
          {block.tentative && <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />}
          <span className={cn(
            "text-[7px] sm:text-[9px] font-sans font-bold truncate whitespace-nowrap",
            !isAvailability && "drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)]"
          )}>
            {isAvailability ? "Available" : `${block.allocation}%`} {block.tentative ? "(Proposed)" : ""}
          </span>
        </div>
        {width > 40 && (
          <p className={cn(
            "text-[6px] sm:text-[7px] font-sans font-medium truncate leading-none mt-0.5 whitespace-nowrap",
            !isAvailability ? "text-white/90" : "text-slate-400"
          )}>
            {projectName}
          </p>
        )}
      </div>

      {/* Tooltip Overlay (Desktop) */}
      {!isAvailability && hoverPos && typeof document !== "undefined" && createPortal(
        <div 
          className="fixed pointer-events-none z-[99999] transition-all duration-75 easelinear will-change-transform"
          style={{
            left: `${hoverPos.x}px`,
            top: `${hoverPos.y}px`,
            transform: hoverPos.isCloseToTop ? "translate(-50%, 0)" : "translate(-50%, -100%)"
          }}
        >
          <div className="bg-white p-2 shadow-xl border border-border rounded-md min-w-[140px] text-slate-900">
            <p className="text-[10px] font-bold border-b pb-1 mb-1">{projectName}</p>
            <div className="space-y-0.5">
              <div className="flex justify-between gap-4 text-[9px]">
                <span className="text-slate-500">Allocation:</span>
                <span className="font-bold">{block.allocation}%</span>
              </div>
              <div className="flex justify-between gap-4 text-[9px]">
                <span className="text-slate-500">Period:</span>
                <span className="font-medium">{block.startDate} - {block.endDate}</span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});

const ResourceRow = memo(function ResourceRow({
  resource,
  startDate,
  endDate,
  dayWidth,
  todayOffset,
  onResourceClick,
  rowHeight,
  ticks,
  weeklyTicks,
  realToday,
}) {
  const totalDays = dayWidth > 0 ? daysBetween(startDate, endDate) : 0;
  const timelineBlocks = resource.allocationTimeline || resource.allocations || [];

  // Logic to handle overlapping projects (tracks)
  const blocksWithTracks = useMemo(() => {
    const visibleBlocks = timelineBlocks.filter((b) => {
      const bStart = parseDate(b.startDate);
      const bEnd = parseDate(b.endDate);
      return bEnd >= startDate && bStart <= endDate && b.status !== "ROLLED_OFF";
    });

    // Simple track assignment
    const tracks = [];
    return visibleBlocks.map((block) => {
      const bStart = parseDate(block.startDate);
      const bEnd = parseDate(block.endDate);

      let trackIndex = 0;
      while (tracks[trackIndex] && tracks[trackIndex] > bStart) {
        trackIndex++;
      }
      tracks[trackIndex] = bEnd;

      return { ...block, trackIndex };
    });
  }, [timelineBlocks, startDate, endDate]);

  const barHeight = 28;
  const barPadding = 4;

  return (
    <div
      className="relative flex items-center group/row border-b border-slate-50 hover:bg-slate-50/10 transition-colors shrink-0 hover:z-50"
      style={{
        height: `${rowHeight}px`,
        width: `${totalDays * dayWidth}px`,
      }}
    >
      {/* Background Month Stripes */}
      <div className="absolute inset-0 flex pointer-events-none opacity-[0.02]">
        {ticks.map((tick, i) => (
          <div
            key={i}
            className={cn("h-full border-r border-slate-900 last:border-0")}
            style={{ width: `${tick.width}px` }}
          />
        ))}
      </div>

      {/* Weekly Grid Lines (Light) */}
      {weeklyTicks?.map((tick, i) => (
        <div
          key={i}
          className="absolute top-0 bottom-0 border-l border-slate-100/50 pointer-events-none"
          style={{ left: `${tick.offset}px` }}
        />
      ))}

      {/* Today Highlight Column */}
      {todayOffset >= 0 && todayOffset <= totalDays * dayWidth && (
        <div
          className="absolute top-0 bottom-0 bg-blue-500/5 border-x border-blue-500/10 pointer-events-none"
          style={{ left: `${todayOffset}px`, width: `${dayWidth}px` }}
        />
      )}

      {/* Allocation Blocks */}
      <div className="absolute inset-0 px-[0.5px]">
        {blocksWithTracks.map((block, idx) => (
          <AllocationBar
            key={`${resource.id}-${idx}`}
            block={block}
            startDate={startDate}
            dayWidth={dayWidth}
            resource={resource}
            onResourceClick={onResourceClick}
            style={{
              top: `${block.trackIndex * (barHeight + barPadding) + 6}px`,
              height: `${barHeight}px`,
            }}
          />
        ))}

        {/* Bench Periods (Visual only) */}
        {(resource.benchPeriods || []).map((period, idx) => {
          const start = Math.max(0, daysBetween(startDate, parseDate(period.startDate)) * dayWidth);
          const duration = daysBetween(parseDate(period.startDate), parseDate(period.endDate)) + 1;
          const width = duration * dayWidth;

          return (
            <div
              key={`bench-${idx}`}
              className="absolute top-3 bottom-3 border border-slate-200 border-dashed rounded opacity-40 bg-slate-50"
              style={{ left: `${start}px`, width: `${width}px` }}
            />
          );
        })}
      </div>
    </div>
  );
});
const RoleProjectBar = memo(function RoleProjectBar({ block, left, width, top, height }) {
  const [hoverPos, setHoverPos] = useState(null);

  const handleMouseMove = useCallback((e) => {
    const isCloseToTop = e.clientY < 180; // Tooltip is taller here (~120px + padding)
    setHoverPos({ 
      x: e.clientX, 
      y: isCloseToTop ? e.clientY + 20 : e.clientY - 12,
      isCloseToTop
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoverPos(null);
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        left: `${left}px`,
        width: `${width}px`,
        top: `${top}px`,
        height: `${height}px`,
      }}
      className="group hover:z-[100]"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        className={cn(
          "w-full h-full rounded shadow-sm border transition-colors flex items-center px-3 overflow-hidden",
          getBarColor(block.allocation, block.tentative),
          getBarHoverColor(block.allocation, block.tentative),
        )}
      >
        {width > 60 && (
          <span
            className={cn(
              "text-[11px] font-medium truncate block leading-none",
              block.tentative ? "text-slate-600" : "text-white",
            )}
          >
            {block.project}
          </span>
        )}
      </button>

      {hoverPos && typeof document !== "undefined" && createPortal(
        <div 
          className="fixed pointer-events-none transition-all duration-75 easelinear will-change-transform z-[99999]"
          style={{
            left: `${hoverPos.x}px`,
            top: `${hoverPos.y}px`,
            transform: hoverPos.isCloseToTop ? "translate(-50%, 0)" : "translate(-50%, -100%)"
          }}
        >
          <div className="bg-white p-3 shadow-2xl border border-slate-200 rounded-lg min-w-[240px]">
            <div className="space-y-2">
              <p className="text-xs font-heading font-bold text-slate-900 border-b pb-1.5">
                {block.project}
              </p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <span className="text-slate-500 text-[10px]">Team Size</span>
                <span className="font-semibold text-slate-900 text-[10px] text-right">
                  {block.resources.length} people
                </span>
                <span className="text-slate-500 text-[10px]">Period</span>
                <span className="font-semibold text-slate-900 text-[10px] text-right">
                  {block.startDate} to {block.endDate}
                </span>
              </div>
              <div className="pt-1.5 border-t">
                <p className="text-[9px] text-slate-400 uppercase font-black mb-1">
                  Assigned Personnel
                </p>
                <p className="text-[10px] text-slate-600 line-clamp-2 leading-relaxed">
                  {block.resources.join(", ")}
                </p>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});

function RoleAggregateRow({
  role,
  resources,
  startDate,
  endDate,
  dayWidth,
  todayOffset,
  rowHeight,
  onResourceClick,
  ticks,
  weeklyTicks,
}) {
  const totalDays = daysBetween(startDate, endDate);

  const projectBlocks = useMemo(() => {
    const projects = new Map();
    resources.forEach((res) => {
      (res.allocationTimeline || []).forEach((block) => {
        const bStart = parseDate(block.startDate);
        const bEnd = parseDate(block.endDate);
        if (bEnd >= startDate && bStart <= endDate && block.status !== "ROLLED_OFF") {
          const key = block.project;
          if (!projects.has(key)) {
            projects.set(key, {
              project: block.project,
              startDate: block.startDate,
              endDate: block.endDate,
              allocation: block.allocation,
              tentative: block.tentative,
              resources: [res.name],
            });
          } else {
            const existing = projects.get(key);
            if (parseDate(block.startDate) < parseDate(existing.startDate))
              existing.startDate = block.startDate;
            if (parseDate(block.endDate) > parseDate(existing.endDate))
              existing.endDate = block.endDate;
            if (!existing.resources.includes(res.name))
              existing.resources.push(res.name);
            existing.allocation = Math.max(
              existing.allocation,
              block.allocation,
            );
            existing.tentative = existing.tentative && block.tentative;
          }
        }
      });
    });
    return Array.from(projects.values());
  }, [resources, startDate, endDate]);

  return (
    <div
      className="relative border-b border-border/30 hover:bg-slate-50/20 transition-colors hover:z-50"
      style={{ height: `${rowHeight}px`, width: `${totalDays * dayWidth}px` }}
    >
      {(weeklyTicks || ticks).map((tick, i) => (
        <div
          key={i}
          className={cn(
            "absolute top-0 h-full border-l",
            tick.isMonth ? "border-border/20" : "border-border/10",
          )}
          style={{ left: `${tick.offset}px` }}
        />
      ))}
      {todayOffset >= 0 && todayOffset <= totalDays * dayWidth && (
        <div
          className="absolute top-0 h-full w-px bg-primary/20"
          style={{ left: `${todayOffset}px` }}
        />
      )}
      {projectBlocks.map((block, i) => {
        const blockStart = new Date(block.startDate);
        const blockEnd = new Date(block.endDate);
        const offsetDaysVal = daysBetween(startDate, blockStart);
        const durationDaysVal = daysBetween(blockStart, blockEnd);
        const left = offsetDaysVal * dayWidth;
        const width = Math.max(durationDaysVal * dayWidth, 4);

        return (
          <RoleProjectBar
            key={i}
            block={block}
            left={left}
            width={width}
            top={i * TRACK_HEIGHT + ROW_PADDING / 2.5}
            height={TRACK_HEIGHT - 6}
          />
        );
      })}
    </div>
  );
}

export function TimelineSkeleton() {
  return (
    <div className="rounded-lg border bg-card overflow-hidden shadow-sm flex flex-col h-full bg-slate-50 animate-pulse">
      <div className="h-14 border-b p-3 bg-white flex items-center justify-between">
        <div className="h-8 w-40 bg-slate-100 rounded" />
        <div className="h-8 w-60 bg-slate-100 rounded" />
      </div>
      <div className="flex flex-1 min-h-0">
        <div className="w-[180px] lg:w-[240px] border-r bg-white p-4 space-y-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-slate-100 shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-3 w-3/4 bg-slate-100 rounded" />
                <div className="h-2 w-1/2 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex-1 bg-white relative">
          <div className="h-10 border-b bg-slate-50 flex items-center px-4">
            <div className="h-3 w-3/4 bg-slate-100 rounded" />
          </div>
          <div className="p-4 space-y-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-8 w-full bg-slate-50 rounded relative">
                <div className="absolute top-1 left-4 h-6 w-1/3 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
export function TimelineSkeletonContent() {
  return (
    <div className="flex flex-1 min-h-0 animate-pulse">
      <div className="w-[120px] sm:w-[180px] lg:w-[240px] border-r bg-white p-4 space-y-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-slate-100 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-3 w-3/4 bg-slate-100 rounded" />
              <div className="h-2 w-1/2 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex-1 bg-white relative">
        <div className="h-10 border-b bg-slate-50 flex items-center px-4">
          <div className="h-3 w-3/4 bg-slate-100 rounded" />
        </div>
        <div className="p-4 space-y-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-8 w-full bg-slate-50 rounded relative">
              <div className="absolute top-1 left-4 h-6 w-1/3 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AvailabilityTimeline({
  filteredResources,
  onResourceClick,
  currentDate,
  loading,
  filters,
  setFilters,
}) {
  const scrollRef = useRef(null);
  const scrolledRef = useRef(false);

  const [viewMode, setViewMode] = useState("resource"); // 'resource' or 'role'
  const [zoom, setZoom] = useState("month"); // 'week', 'month', 'quarter'
  const realToday = parseDate(new Date());

  const baseDate = useMemo(() => parseDate(currentDate), [currentDate]);

  const config = getZoomConfig(zoom);

  const startDate = useMemo(() => {
    let d = addDays(baseDate, -config.totalDaysBefore);
    if (zoom === "week") {
      const day = d.getDay(); // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
      const diff = day === 0 ? 6 : day - 1; // Snap to Monday (if Sunday, go back 6 days; otherwise, go back day-1 days)
      d.setDate(d.getDate() - diff);
    } else {
      d.setDate(1); // Snap to 1st of month
    }
    return d;
  }, [baseDate, config.totalDaysBefore, zoom]);

  const endDate = useMemo(() => {
    let maxDate = addDays(baseDate, config.totalDaysAfter);

    if (filteredResources && filteredResources.length > 0) {
      filteredResources.forEach((res) => {
        const blocks = [
          ...(res.allocationTimeline || []),
          ...(res.allocations || []),
          ...(res.benchPeriods || []),
        ];
        blocks.forEach((block) => {
          if (block.endDate) {
            const blockEnd = parseDate(block.endDate);
            if (blockEnd > maxDate) {
              maxDate = blockEnd;
            }
          }
        });
      });
    }

    if (zoom === "week") {
      const day = maxDate.getDay();
      const diff = day === 0 ? 0 : 7 - day;
      maxDate.setDate(maxDate.getDate() + diff);
    } else {
      maxDate = new Date(
        maxDate.getFullYear(),
        maxDate.getMonth() + 1,
        0,
        0,
        0,
        0,
        0
      );
    }

    return maxDate;
  }, [baseDate, config.totalDaysAfter, filteredResources, zoom]);
  const totalDays = daysBetween(startDate, endDate);

  const todayOffset = useMemo(() => {
    const days = daysBetween(startDate, realToday);
    return days * config.dayWidth;
  }, [startDate, realToday, config.dayWidth]);

  const ticks = useMemo(() => {
    const result = [];
    if (zoom === "week") {
      for (let i = 0; i <= totalDays; i += 7) {
        const d = addDays(startDate, i);
        result.push({
          label: formatDate(d),
          offset: i * config.dayWidth,
        });
      }
    } else {
      // month or quarter
      let curr = new Date(startDate);
      curr.setDate(1);
      // If startDate is after the 1st of the month, move to the next month's 1st
      if (curr < startDate) curr.setMonth(curr.getMonth() + 1);

      while (curr <= endDate) {
        const i = daysBetween(startDate, curr);
        result.push({
          label: formatMonthYear(curr),
          offset: i * config.dayWidth,
          isMonth: true,
        });
        curr.setMonth(curr.getMonth() + 1);
      }
    }
    return result;
  }, [startDate, endDate, zoom, config.dayWidth, totalDays]);

  const weeklyTicks = useMemo(() => {
    if (zoom === "week") return null; // Already handled by primary ticks
    const result = [];
    let curr = new Date(startDate);
    // Snap to first Monday
    const day = curr.getDay();
    const diff = day === 0 ? 6 : day - 1;
    curr.setDate(curr.getDate() - diff);
    if (curr < startDate) curr.setDate(curr.getDate() + 7);

    while (curr <= endDate) {
      result.push({
        offset: daysBetween(startDate, curr) * config.dayWidth,
        isMonth: false,
      });
      curr.setDate(curr.getDate() + 7);
    }
    return result;
  }, [startDate, endDate, zoom, config.dayWidth]);

  const roleGroups = useMemo(
    () => groupByRole(filteredResources),
    [filteredResources],
  );

  const resourceRowHeights = useMemo(() => {
    const heights = new Map();
    filteredResources.forEach((resource) => {
      const visibleBlocksCount = (resource.allocationTimeline || []).filter(
        (b) => {
          const bStart = parseDate(b.startDate);
          const bEnd = parseDate(b.endDate);
          return bEnd >= startDate && bStart <= endDate && b.status !== "ROLLED_OFF";
        },
      ).length;

      // The availability bar now shares a track with the latest project.
      // So the number of tracks is just the number of visible blocks (minimum 1).
      const numTracks = Math.max(1, visibleBlocksCount);
      heights.set(resource.id, numTracks * TRACK_HEIGHT + ROW_PADDING);
    });
    return heights;
  }, [filteredResources, startDate, endDate]);

  const roleRowHeights = useMemo(() => {
    const heights = new Map();
    roleGroups.forEach((resources, role) => {
      const projects = new Set();
      resources.forEach((res) => {
        (res.allocationTimeline || []).forEach((b) => {
          const bStart = new Date(b.startDate);
          const bEnd = new Date(b.endDate);
          if (bEnd >= startDate && bStart <= endDate) {
            projects.add(b.project);
          }
        });
      });
      const numTracks = Math.max(1, projects.size);
      heights.set(role, numTracks * TRACK_HEIGHT + ROW_PADDING);
    });
    return heights;
  }, [roleGroups, startDate, endDate]);

  const scrollToToday = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft =
        todayOffset - scrollRef.current.clientWidth / 3;
    }
  }, [todayOffset]);

  useEffect(() => {
    if (scrollRef.current && currentDate) {
      // Small delay to ensure layout is ready
      const timer = setTimeout(() => {
        const targetOffset = daysBetween(startDate, baseDate) * config.dayWidth;
        scrollRef.current.scrollLeft =
          targetOffset - scrollRef.current.clientWidth / 3;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [baseDate, startDate, config.dayWidth]);

  return (
    <div className="rounded-lg border bg-card overflow-hidden shadow-sm flex flex-col h-full bg-slate-50">
      {/* ─── STATIC HEADER (PERSISTENT) ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b p-3 bg-white relative">
        <div className="flex items-center justify-between sm:justify-start gap-4 w-full sm:w-auto overflow-x-auto no-scrollbar pr-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v)} className="shrink-0">
            <TabsList className="h-8 bg-muted/50 p-1 shrink-0 min-w-max">
              <TabsTrigger
                value="resource"
                className="text-[10px] h-6 gap-1.5 px-3 rounded-sm whitespace-nowrap"
              >
                <User className="h-3 w-3" />
                <span className="hidden xs:inline">Resource View</span>
                <span className="xs:hidden font-bold">Resources</span>
              </TabsTrigger>
              <TabsTrigger
                value="role"
                className="text-[10px] h-6 gap-1.5 px-3 rounded-sm whitespace-nowrap"
              >
                <Layers className="h-3 w-3" />
                Role View
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {viewMode === "resource" && (
          <div className="relative w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search by name..."
              className="h-7 px-2 sm:px-3 text-[10px] font-medium border rounded-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all w-full sm:w-52"
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  search: e.target.value,
                }))
              }
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z"
              />
            </svg>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:gap-3">
          <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 sm:gap-3">
            <div className="flex items-center rounded-md border bg-muted/50 p-0.5">
              {["week", "month", "quarter"].map((z) => (
                <button
                  key={z}
                  type="button"
                  className={cn(
                    "px-2 sm:px-3 py-1 text-[10px] font-semibold transition-all capitalize rounded-sm",
                    zoom === z
                      ? "bg-white text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => {
                    setZoom(z);
                    scrolledRef.current = false;
                  }}
                >
                  {z}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="px-2 sm:px-3 py-1 text-[10px] font-semibold transition-all rounded-sm border-white bg-blue-600 hover:bg-blue-700 text-white"
              onClick={scrollToToday}
            >
              Today
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] font-medium text-muted-foreground">
            <div className="flex items-center gap-1 whitespace-nowrap">
              <div className="h-2 w-3 sm:w-4 rounded-sm bg-emerald-500 shrink-0" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1 whitespace-nowrap">
              <div className="h-2 w-3 sm:w-4 rounded-sm bg-amber-400 shrink-0" />
              <span>Partial</span>
            </div>
            <div className="flex items-center gap-1 whitespace-nowrap">
              <div className="h-2 w-3 sm:w-4 rounded-sm bg-rose-400 shrink-0" />
              <span>Allocated</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── DYNAMIC CONTENT (LOADS BELOW HEADER) ────────────────────── */}
      {loading ? (
        <TimelineSkeletonContent />
      ) : (
        <TooltipProvider delayDuration={100}>
          <div className="flex flex-1 overflow-hidden min-h-0">
            {/* Sidebar */}
            <div className="shrink-0 border-r bg-white w-[120px] sm:w-[180px] lg:w-[240px] flex flex-col shadow-sm">
              <div className="sticky top-0 z-40 h-10 border-b bg-muted/40 flex items-center px-2 sm:px-4 shrink-0">
                <span className="text-[8px] sm:text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-wider truncate">
                  {viewMode === "resource" ? "Resource" : "Role Category"}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar">
                {viewMode === "resource"
                  ? filteredResources.map((resource) => {
                    const dynamicRowHeight =
                      resourceRowHeights.get(resource.id) || 48;
                    return (
                      <button
                        key={resource.id}
                        type="button"
                        className="w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-4 border-b border-slate-100 hover:bg-muted/50 transition-colors shrink-0"
                        style={{ height: `${dynamicRowHeight}px` }}
                        onClick={() => onResourceClick(resource)}
                      >
                        <Avatar className="h-6 w-6 sm:h-8 sm:w-8 shrink-0">
                          <AvatarFallback className="text-[8px] sm:text-[10px] font-medium bg-primary/10 text-primary">
                            {resource.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 text-left">
                          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                            <p className="text-[10px] sm:text-xs font-heading font-bold text-foreground truncate min-w-0 flex-1">
                              {resource.name}
                            </p>
                            {resource.noticeInfo?.isNoticePeriod && (
                              <span className="text-[7px] sm:text-[9px] font-bold text-red-500 whitespace-nowrap px-0.5 sm:px-1 py-0.5 bg-red-50 rounded shrink-0 hidden xs:inline-block">
                                On Notice
                              </span>
                            )}
                          </div>
                          <p className="text-[8px] sm:text-[10px] text-muted-foreground truncate">
                            {getResourceMeta(resource)}
                          </p>
                        </div>
                      </button>
                    );
                  })
                  : [...roleGroups.entries()].map(([role, resources]) => {
                    const dynamicRowHeight = roleRowHeights.get(role) || 48;
                    return (
                      <div
                        key={role}
                        className="flex flex-col justify-center px-4 border-b border-slate-100"
                        style={{ height: `${dynamicRowHeight}px` }}
                      >
                        <p className="text-sm font-heading font-bold text-slate-800 truncate">
                          {role}
                        </p>
                        <p className="text-[11px] font-sans font-medium text-slate-400">
                          {resources.length}{" "}
                          {resources.length === 1 ? "person" : "people"}
                        </p>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 overflow-x-auto bg-white relative"
            >
              <div style={{ width: `${totalDays * config.dayWidth}px` }}>
                <TimelineHeader
                  zoom={zoom}
                  ticks={ticks}
                  todayOffset={todayOffset}
                  totalDays={totalDays}
                  dayWidth={config.dayWidth}
                />

                {viewMode === "resource"
                  ? filteredResources.map((resource) => (
                    <ResourceRow
                      key={resource.id}
                      resource={resource}
                      startDate={startDate}
                      endDate={endDate}
                      dayWidth={config.dayWidth}
                      todayOffset={todayOffset}
                      onResourceClick={onResourceClick}
                      rowHeight={resourceRowHeights.get(resource.id) || 48}
                      ticks={ticks}
                      weeklyTicks={weeklyTicks}
                      realToday={realToday}
                    />
                  ))
                  : [...roleGroups.entries()].map(([role, resources]) => (
                    <RoleAggregateRow
                      key={role}
                      role={role}
                      resources={resources}
                      startDate={startDate}
                      endDate={endDate}
                      dayWidth={config.dayWidth}
                      todayOffset={todayOffset}
                      rowHeight={roleRowHeights.get(role) || 48}
                      onResourceClick={onResourceClick}
                      ticks={ticks}
                      weeklyTicks={weeklyTicks}
                    />
                  ))}
              </div>
            </div>
          </div>
        </TooltipProvider>
      )}
    </div>
  );
}

export default AvailabilityTimeline;
