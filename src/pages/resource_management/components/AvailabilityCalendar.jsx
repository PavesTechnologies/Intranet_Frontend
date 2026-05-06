import { useState, useMemo, Fragment, useEffect } from "react"
import { ChevronLeft, ChevronRight, Layers, User, Check, ChevronsUpDown, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { cn } from "@/lib/utils"
import { Combobox, Transition } from "@headlessui/react"
import { motion, AnimatePresence } from "framer-motion"
import { generateCalendarDays } from "../services/availabilityService"
import { startOfMonth, isBefore, isAfter, isValid, parseISO, format } from "date-fns"
import { getHolidaysByYear } from "../services/workforceService"

const ResourceCombobox = ({ resources, value, onChange }) => {
  const [query, setQuery] = useState("")

  const filteredResources =
    query === ""
      ? resources
      : resources.filter((resource) =>
        resource.name
          .toLowerCase()
          .replace(/\s+/g, "")
          .includes(query.toLowerCase().replace(/\s+/g, ""))
      )

  return (
    <Combobox value={value} onChange={onChange}>
      <div className="relative w-full">
        <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left border-2 border-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/75 sm:text-sm">
          <Combobox.Input
            className="w-full border-none py-2 pl-3 pr-10 text-xs leading-5 text-gray-900 focus:ring-0 outline-none"
            displayValue={(id) => resources.find(r => r.id === id)?.name || ""}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Select resource..."
          />
          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronsUpDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
          </Combobox.Button>
        </div>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          afterLeave={() => setQuery("")}
        >
          <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-[110]">
            {filteredResources.length === 0 && query !== "" ? (
              <div className="relative cursor-default select-none py-2 px-4 text-gray-700 text-xs">
                Nothing found.
              </div>
            ) : (
              filteredResources.map((resource) => (
                <Combobox.Option
                  key={resource.id}
                  className={({ active }) =>
                    `relative cursor-default select-none py-2 pl-10 pr-4 text-xs ${active ? "bg-indigo-600 text-white" : "text-gray-900"}`
                  }
                  value={resource.id}
                >
                  {({ selected, active }) => (
                    <>
                      <span className={cn("block truncate", selected ? "font-medium" : "font-normal")}>
                        {resource.name}
                        {resource.noticeInfo?.isNoticePeriod && (
                          <span className="ml-2 text-[9px] font-bold text-red-500 bg-red-50 px-1 py-0.5 rounded">
                            On Notice
                          </span>
                        )}
                      </span>
                      {selected ? (
                        <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? "text-white" : "text-indigo-600"}`}>
                          <Check className="h-3 w-3" aria-hidden="true" />
                        </span>
                      ) : null}
                    </>
                  )}
                </Combobox.Option>
              ))
            )}
          </Combobox.Options>
        </Transition>
      </div>
    </Combobox>
  )
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function getAggregateStatus(day, resourceIds) {
  const filtered = day.resources.filter((r) => resourceIds.has(r.resourceId))
  const available = filtered.filter((r) => r.status === "available").length
  const partial = filtered.filter((r) => r.status === "partial").length
  const allocated = filtered.filter((r) => r.status === "allocated").length

  let dominant = "available"
  if (allocated >= partial && allocated >= available) dominant = "allocated"
  else if (partial >= available) dominant = "partial"

  return { available, partial, allocated, dominant }
}

const CalendarTooltip = ({ date, data, mode, holiday }) => {
  if (holiday) {
    return (
      <div className="p-2.5 min-w-[160px] bg-white rounded-lg border-2 border-red-100 shadow-md">
        <div className="flex items-center justify-between border-b border-rose-100 pb-1.5 mb-1.5">
          <span className="font-heading font-bold text-slate-900 text-[11px]">{date}</span>
          <span className="bg-red-50 text-red-600 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider border border-red-100">Holiday</span>
        </div>
        <div className="flex items-start gap-2">
          <Calendar className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />
          <div className="text-[11px] font-bold text-red-600 leading-tight">
            {holiday.holidayName}
          </div>
        </div>
      </div>
    )
  }

  if (mode === "aggregate") {
    const { available, partial, allocated } = data
    return (
      <div className="space-y-1.5 min-w-[140px] p-2">
        <div className="flex items-center justify-between border-b border-border/50 pb-1">
          <span className="font-heading font-bold text-[11px]">{date}</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-status-available" />
              <span className="text-[10px] text-muted-foreground">Available</span>
            </div>
            <span className="text-[11px] font-bold">{available}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-status-partial" />
              <span className="text-[10px] text-muted-foreground">Partial</span>
            </div>
            <span className="text-[11px] font-bold">{partial}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-status-allocated" />
              <span className="text-[10px] text-muted-foreground">Allocated</span>
            </div>
            <span className="text-[11px] font-bold">{allocated}</span>
          </div>
        </div>
      </div>
    )
  }

  const { status, allocation, project } = data
  const statusColors = {
    available: "bg-emerald-500",
    partial: "bg-amber-500",
    allocated: "bg-rose-500"
  }

  return (
    <div className="min-w-[180px] overflow-hidden rounded-lg">
      <div className={cn("px-3 py-1.5 flex items-center justify-between", statusColors[status] || "bg-slate-500")}>
        <span className="font-bold text-white text-[11px]">{date}</span>
        <span className="bg-white/20 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
          {allocation}%
        </span>
      </div>
      <div className="p-2.5 space-y-2 bg-white">
        <div className="flex items-start gap-2">
          <Layers className="h-3 w-3 text-slate-400 mt-0.5" />
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 uppercase font-bold">Project</span>
            <p className="text-[11px] font-semibold text-slate-900 leading-tight truncate max-w-[120px]">
              {project || "No Project"}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AvailabilityCalendar({ filteredResources, onDayClick, selectedResourceId, onSelectResource, currentDate, onNavigate }) {
  const [viewMode, setViewMode] = useState("aggregate")
  const [selectedDate, setSelectedDate] = useState(null)
  const [holidays, setHolidays] = useState([])

  const year = currentDate ? currentDate.getFullYear() : new Date().getFullYear()
  const month = currentDate ? currentDate.getMonth() : new Date().getMonth()
  const now = new Date()

  const [internalSelectedResource, setInternalSelectedResource] = useState(
    selectedResourceId || filteredResources[0]?.id || ""
  )

  useMemo(() => {
    if (selectedResourceId) setInternalSelectedResource(selectedResourceId)
  }, [selectedResourceId])

  const handleResourceSelect = (value) => {
    setInternalSelectedResource(value)
    if (onSelectResource) {
      const res = filteredResources.find(r => r.id === value)
      if (res) onSelectResource(res)
    }
  }

  const handleDayClickInternal = (date, status) => {
    setSelectedDate(date)
    if (onDayClick) onDayClick(date, status)
  }

  const calendarDays = useMemo(() => generateCalendarDays(year, month, filteredResources), [year, month, filteredResources])
  const filteredIds = useMemo(() => new Set(filteredResources.map((r) => r.id)), [filteredResources])
  const firstDayOfMonth = new Date(year, month, 1).getDay()

  const holidayMap = useMemo(() => {
    const map = new Map()
    holidays.forEach(h => {
      map.set(h.holidayDate, h)
    })
    return map
  }, [holidays])

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const res = await getHolidaysByYear(year)
        // Handle both direct array and wrapped data: { data: [...] }
        const holidayArray = Array.isArray(res) ? res : (res?.data || [])
        setHolidays(holidayArray)
      } catch (err) {
        console.error("Failed to fetch holidays", err)
      }
    }
    fetchHolidays()
  }, [year])

  const { minDate, maxDate } = useMemo(() => {
    let min = null
    let max = null
    const today = new Date()

    filteredResources.forEach((resource) => {
      const timeline = resource.allocationTimeline || []
      timeline.forEach((block) => {
        const start = block.startDate ? parseISO(block.startDate) : null
        const end = block.endDate ? parseISO(block.endDate) : today

        if (start && isValid(start)) {
          if (!min || isBefore(start, min)) min = start
        }
        if (end && isValid(end)) {
          if (!max || isAfter(end, max)) max = end
        }
      })
    })

    if (!min || !max) {
      const startOfCurrent = startOfMonth(today)
      return { minDate: startOfCurrent, maxDate: startOfCurrent }
    }

    return {
      minDate: startOfMonth(min),
      maxDate: startOfMonth(max),
    }
  }, [filteredResources])

  useEffect(() => {
    if (minDate && maxDate && currentDate) {
      const currentMonthStart = startOfMonth(currentDate)
      if (isBefore(currentMonthStart, minDate)) {
        onNavigate?.(minDate)
      } else if (isAfter(currentMonthStart, maxDate)) {
        onNavigate?.(maxDate)
      }
    }
  }, [minDate, maxDate, currentDate, onNavigate])

  const canNavigatePrev = !minDate || isAfter(startOfMonth(currentDate), minDate)
  const canNavigateNext = !maxDate || isBefore(startOfMonth(currentDate), maxDate)
  const canNavigateToday = useMemo(() => {
    if (!minDate || !maxDate) return true
    const todayMonth = startOfMonth(new Date())
    return !isBefore(todayMonth, minDate) && !isAfter(todayMonth, maxDate)
  }, [minDate, maxDate])

  function navigateMonth(direction) {
    if (onNavigate) {
      if (direction === -1 && !canNavigatePrev) return
      if (direction === 1 && !canNavigateNext) return
      const newDate = new Date(year, month + direction, 1)
      onNavigate(newDate)
    }
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-y-3 gap-x-4 border-b p-4">
        {/* Navigation Group */}
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 bg-white shrink-0"
            onClick={() => navigateMonth(-1)}
            disabled={!canNavigatePrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3 bg-white gap-2 text-xs font-medium shrink-0"
            onClick={() => onNavigate && onNavigate(new Date())}
            disabled={!canNavigateToday}
          >
            <Calendar className="h-3.5 w-3.5" />
            Today
          </Button>
          <h2 className="text-lg font-heading font-bold text-slate-900 px-2 min-w-[140px] text-center whitespace-nowrap">
            {MONTH_NAMES[month]} {year}
          </h2>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 bg-white shrink-0"
            onClick={() => navigateMonth(1)}
            disabled={!canNavigateNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Controls Group */}
        <div className="flex flex-wrap items-center gap-4">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v)} className="shrink-0">
            <TabsList className="h-9 bg-muted/50 p-1">
              <TabsTrigger value="aggregate" className="text-xs h-7 gap-1.5 px-3">
                <Layers className="h-3.5 w-3.5" /> Team
              </TabsTrigger>
              <TabsTrigger value="individual" className="text-xs h-7 gap-1.5 px-3">
                <User className="h-3.5 w-3.5" /> Individual
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {viewMode === "individual" && (
            <div className="w-[200px] h-9 shrink-0">
              <ResourceCombobox
                resources={filteredResources}
                value={internalSelectedResource}
                onChange={handleResourceSelect}
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground border-l pl-4 min-h-[24px]">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-status-available shrink-0" /> 
              <span>Available</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-status-partial shrink-0" /> 
              <span>Partial</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-status-allocated shrink-0" /> 
              <span>Allocated</span>
            </span>
          </div>
        </div>
      </div>

      <TooltipProvider delayDuration={100}>
        <div className="p-4">
          <div className="grid grid-cols-7 gap-1 mb-1 justify-items-center">
            {DAY_NAMES.map((d) => (
              <div key={d} className="flex items-center justify-center text-xs font-sans font-bold text-muted-foreground py-2 uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${year}-${month}`}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-7 gap-6"
              >
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square w-full" />
                ))}

                {calendarDays.map((day, index) => {
                  const isWeekend = day.dayOfWeek === 0 || day.dayOfWeek === 6
                  const isToday =
                    day.dayOfMonth === now.getDate() &&
                    month === now.getMonth() &&
                    year === now.getFullYear()
                  const isSelected = selectedDate === day.date
                  const tooltipSide = index < 14 ? "bottom" : "top"
                  const holiday = holidayMap.get(day.date)

                  // Show tooltip if it's a holiday OR if it's NOT a weekend
                  const hasTooltip = !!holiday || !isWeekend

                  const dayContent = viewMode === "aggregate"
                    ? getAggregateStatus(day, filteredIds)
                    : day.resources.find((r) => r.resourceId === internalSelectedResource) || { status: "available", allocation: 0 }

                  const status = viewMode === "aggregate" ? dayContent.dominant : dayContent.status

                  return (
                    <Tooltip key={day.date}>
                      <TooltipTrigger asChild>
                        <motion.button
                          whileHover={hasTooltip ? { scale: 0.98 } : {}}
                          type="button"
                          className={cn(
                            "aspect-square w-full rounded-lg border transition-all relative",
                            "flex flex-col items-center justify-between p-2 backdrop-blur-md overflow-hidden",
                            hasTooltip && "hover:shadow-md",
                            isWeekend
                              ? "bg-rose-500/10 border-slate-200"
                              : "bg-emerald-500/10 border-slate-200",
                            !hasTooltip && "cursor-default",
                            isSelected ? "ring-2 ring-blue-500 ring-offset-1 z-20 shadow-lg !bg-white/80" : "",
                            holiday ? "bg-red-50/50" : ""
                          )}
                          onClick={() => hasTooltip && handleDayClickInternal(day.date, status)}
                        >
                          <div className="flex flex-col items-center justify-center flex-1">
                            <span className={cn(
                              "text-[13px] font-heading font-bold leading-none",
                              isToday ? "text-blue-600 underline underline-offset-2" :
                                holiday ? "text-red-600" : "text-slate-700"
                            )}>
                              {day.dayOfMonth}
                            </span>
                            <div className="h-2.5 flex items-center justify-center mt-0.5">
                              {holiday ? (
                                <span className="text-[7.5px] font-black text-red-500 uppercase tracking-tighter leading-none">HLY</span>
                              ) : (
                                <div className="h-px w-2 bg-transparent" />
                              )}
                            </div>
                          </div>

                          <div className="h-1.5 w-full flex items-center justify-center mb-0.5">
                            {!holiday && !isWeekend ? (
                              <div className="flex items-center gap-0.5 scale-[0.85] origin-center">
                                <div className="flex items-center gap-0.5">
                                  <div className={cn("h-1 w-1 rounded-full", (viewMode === "aggregate" ? dayContent.available > 0 : status === "available") ? "bg-[#22c55e]" : "bg-slate-200")} />
                                  <div className={cn("h-1 w-2.5 rounded-full", (viewMode === "aggregate" ? dayContent.available > 0 : status === "available") ? "bg-[#22c55e]" : "bg-slate-100")} />
                                </div>
                                <div className="flex items-center gap-0.5">
                                  <div className={cn("h-1 w-1 rounded-full", (viewMode === "aggregate" ? dayContent.partial > 0 : status === "partial") ? "bg-[#eab308]" : "bg-slate-200")} />
                                  <div className={cn("h-1 w-2.5 rounded-full", (viewMode === "aggregate" ? dayContent.partial > 0 : status === "partial") ? "bg-[#eab308]" : "bg-slate-100")} />
                                </div>
                                <div className="flex items-center gap-0.5">
                                  <div className={cn("h-1 w-1 rounded-full", (viewMode === "aggregate" ? dayContent.allocated > 0 : status === "allocated") ? "bg-[#ef4444]" : "bg-slate-200")} />
                                  <div className={cn("h-1 w-2.5 rounded-full", (viewMode === "aggregate" ? dayContent.allocated > 0 : status === "allocated") ? "bg-[#ef4444]" : "bg-slate-100")} />
                                </div>
                              </div>
                            ) : (
                              <div className="h-1 w-full" />
                            )}
                          </div>
                        </motion.button>
                      </TooltipTrigger>
                      {hasTooltip && (
                        <TooltipContent
                          side={tooltipSide}
                          className="z-[100] p-0 border-none shadow-lg rounded-lg overflow-visible"
                        >
                          <CalendarTooltip
                            date={day.date}
                            data={dayContent}
                            mode={viewMode}
                            holiday={holiday}
                          />
                        </TooltipContent>
                      )}
                    </Tooltip>
                  )
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </TooltipProvider>
    </div>
  )
}
