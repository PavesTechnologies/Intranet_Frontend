import { useState, useEffect, useRef } from "react"
import {
  MapPin, Briefcase, Calendar, Star, ArrowRight, X,
  Search, ChevronDown, AlertTriangle, CheckCircle2,
  XCircle, Shield, Clock, BarChart3, Brain, Zap,
  TrendingUp, Activity
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { getUtilization } from "../services/workforceService"
import { useSkillGapAnalysis } from "../hooks/useSkillGapAnalysis"
import { toast } from "react-toastify"

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function StatusDot({ status }) {
  const colors = {
    available: "bg-status-available",
    partial: "bg-status-partial",
    allocated: "bg-status-allocated",
  }
  return <span className={cn("h-2 w-2 rounded-full", colors[status])} />
}

function SectionHeader({ icon: Icon, title, badge }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {Icon && <Icon className="h-3.5 w-3.5 text-primary/70" />}
      <h4 className="text-xs font-heading font-bold text-foreground uppercase tracking-wider">
        {title}
      </h4>
      {badge && (
        <Badge variant="secondary" className="text-[9px] h-4 px-1.5 ml-auto font-mono">
          {badge}
        </Badge>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPERATIONAL VIEW SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function TimelineBar({ resource }) {
  const blocks = resource.allocationTimeline || []
  if (blocks.length === 0) return null

  const earliest = new Date(blocks[0].startDate).getTime()
  const latest = Math.max(...blocks.map((b) => new Date(b.endDate).getTime()))
  const totalSpan = latest - earliest || 1
  const today = Date.now()

  return (
    <div className="relative">
      <div className="relative h-8 rounded bg-muted overflow-hidden">
        {blocks.map((block, i) => {
          const start = new Date(block.startDate).getTime()
          const end = new Date(block.endDate).getTime()
          const leftPct = ((start - earliest) / totalSpan) * 100
          const widthPct = ((end - start) / totalSpan) * 100

          let color = "bg-status-available/60"
          if (block.allocation > 100) color = "bg-destructive/60"
          else if (block.allocation > 70) color = "bg-status-allocated/60"
          else if (block.allocation > 20) color = "bg-status-partial/60"

          return (
            <div
              key={`${block.project}-${i}`}
              className={cn(
                "absolute top-0 h-full rounded-sm",
                block.tentative ? "bg-muted-foreground/20 border border-dashed border-muted-foreground/40" : color
              )}
              style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 2)}%` }}
              title={`${block.project}: ${block.allocation}%${block.tentative ? " (Tentative)" : ""} (${block.startDate} - ${block.endDate})`}
            />
          )
        })}
        {today >= earliest && today <= latest && (
          <div
            className="absolute top-0 h-full w-px bg-primary z-10"
            style={{ left: `${((today - earliest) / totalSpan) * 100}%` }}
          />
        )}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-muted-foreground">{blocks[0].startDate}</span>
        <span className="text-[10px] text-muted-foreground font-medium text-primary">Today</span>
        <span className="text-[10px] text-muted-foreground">{blocks[blocks.length - 1].endDate}</span>
      </div>
    </div>
  )
}

function UtilizationChart({ data, loading = false }) {
  if (loading) {
    return (
      <div>
        <div className="flex items-end gap-1 h-16">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5 animate-pulse">
              <div className="w-full relative flex items-end justify-center" style={{ height: "48px" }}>
                <div className="w-full bg-muted rounded-t-sm h-8" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-1 mt-1">
          {['jan', 'feb', 'mar', 'apr', 'may', 'jun'].map((label, i) => (
            <div key={i} className="flex-1 text-center text-[10px] text-muted-foreground bg-muted h-3 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const safeData = data || {}
  const monthlySummary = safeData.monthlySummary || {}

  const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"]

  const recentData = months.slice(-6).map(month => {
    const billable = monthlySummary[month]?.billableUtilization ?? 0
    const nonBillable = monthlySummary[month]?.nonBillableUtilization ?? 0
    return { month, billable, nonBillable, total: billable + nonBillable }
  })

  const maxTotal = Math.max(...recentData.map(d => d.total), 100)
  const displayLabels = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb']

  return (
    <div>
      <div className="flex items-end gap-1 h-16">
        {recentData.map((item, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5 relative">
            <div className="w-full h-[48px] relative flex flex-col justify-end">
              <div
                className="w-full rounded-b-sm"
                style={{
                  height: `${(item.nonBillable / maxTotal) * 100}%`,
                  minHeight: '2px'
                }}
              />
              <div
                className={cn(
                  "w-full rounded-t-sm absolute bottom-0 transition-all",
                  item.billable > 80 ? "bg-status-allocated" :
                    item.billable > 50 ? "bg-status-partial" :
                      "bg-status-available"
                )}
                style={{
                  height: `${(item.billable / maxTotal) * 100}%`,
                  minHeight: item.billable > 0 ? '2px' : 0
                }}
              />
            </div>
            <div className="text-[9px] text-muted-foreground font-mono">
              {item.total.toFixed(0)}%
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-1">
        {displayLabels.map((label, i) => (
          <div key={i} className="flex-1 text-center text-[10px] text-muted-foreground">
            {label}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border/50">
        <div className="flex items-center gap-1.5 text-[10px]">
          <div className="w-3 h-2 bg-status-available rounded-sm" />
          <span className="text-muted-foreground font-medium">Billable</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px]">
          <div className="w-3 h-2 bg-muted rounded-sm" />
          <span className="text-muted-foreground font-medium">Non-Billable</span>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SKILL INTELLIGENCE SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function DemandDropdown({
  demands,
  filteredDemands,
  loading,
  error,
  search,
  onSearchChange,
  selectedDemand,
  onSelect,
}) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={dropdownRef} className="relative">
      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
        Select Demand
      </label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-left transition-all duration-200",
          "bg-background hover:bg-muted/50 text-sm",
          open ? "border-primary ring-2 ring-primary/20" : "border-border",
          error && "border-destructive"
        )}
      >
        <span className={cn("truncate", !selectedDemand && "text-muted-foreground")}>
          {selectedDemand
            ? `${selectedDemand.demandName} — ${selectedDemand.projectName}`
            : "Choose a demand to analyze..."}
        </span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1.5 rounded-lg border bg-background shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search demands..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm rounded-md border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                autoFocus
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-48 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="h-3.5 w-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  Loading demands...
                </div>
              </div>
            ) : error ? (
              <div className="p-4 text-center text-xs text-destructive">
                <AlertTriangle className="h-4 w-4 mx-auto mb-1" />
                {error}
              </div>
            ) : filteredDemands.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No demands found
              </div>
            ) : (
              filteredDemands.map((d) => (
                <button
                  key={d.demandId}
                  type="button"
                  onClick={() => {
                    onSelect(d)
                    setOpen(false)
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors border-b last:border-0",
                    selectedDemand?.demandId === d.demandId && "bg-primary/5 border-l-2 border-l-primary"
                  )}
                >
                  <div className="text-sm font-medium text-foreground truncate">{d.demandName}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {d.projectName}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** Circular match percentage gauge */
function MatchGauge({ percentage }) {
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  const getColor = (pct) => {
    if (pct >= 80) return { stroke: "#22c55e", bg: "bg-green-50", text: "text-green-700" }
    if (pct >= 50) return { stroke: "#f59e0b", bg: "bg-amber-50", text: "text-amber-700" }
    return { stroke: "#ef4444", bg: "bg-red-50", text: "text-red-700" }
  }

  const color = getColor(percentage)

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-24 w-24">
        <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/50" />
          <circle
            cx="50" cy="50" r={radius} fill="none"
            stroke={color.stroke} strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-xl font-bold font-mono", color.text)}>
            {percentage}%
          </span>
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Match</span>
        </div>
      </div>
    </div>
  )
}

/** Risk level badge with visual encoding */
function RiskBadge({ level }) {
  const config = {
    HIGH: { color: "bg-red-100 text-red-700 border-red-200", icon: AlertTriangle, label: "High Risk" },
    MEDIUM: { color: "bg-amber-100 text-amber-700 border-amber-200", icon: AlertTriangle, label: "Medium Risk" },
    LOW: { color: "bg-green-100 text-green-700 border-green-200", icon: Shield, label: "Low Risk" },
  }
  const cfg = config[level] || config.HIGH
  const Icon = cfg.icon

  return (
    <Badge variant="outline" className={cn("text-[10px] font-semibold px-2 py-0.5 gap-1", cfg.color)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  )
}

/** Allocation allowed indicator */
function AllocationIndicator({ allowed }) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-md border",
      allowed
        ? "bg-green-50 text-green-700 border-green-200"
        : "bg-red-50 text-red-700 border-red-200"
    )}>
      {allowed
        ? <><CheckCircle2 className="h-3.5 w-3.5" /> Allocation Allowed</>
        : <><XCircle className="h-3.5 w-3.5" /> Allocation Not Allowed</>
      }
    </div>
  )
}

/** Skill comparison matrix table */
function SkillComparisonTable({ comparisons }) {
  if (!comparisons || comparisons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <Activity className="h-8 w-8 text-muted-foreground/30 mb-2" />
        <p className="text-xs text-muted-foreground font-medium">No Skill Data Found</p>
        <p className="text-[10px] text-muted-foreground/70 mt-0.5">
          No skill comparisons available for this demand
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="bg-muted/50 text-muted-foreground">
            <th className="text-left px-2.5 py-2 font-semibold">Skill</th>
            <th className="text-center px-2 py-2 font-semibold">Required</th>
            <th className="text-center px-2 py-2 font-semibold">Actual</th>
            <th className="text-center px-2 py-2 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {comparisons.map((skill, i) => (
            <tr
              key={`${skill.skillName}-${skill.subSkillName}-${i}`}
              className={cn(
                "border-t transition-colors",
                skill.status === "GAP" ? "bg-red-50/40" : "bg-green-50/30"
              )}
            >
              <td className="px-2.5 py-2">
                <div className="font-medium text-foreground">{skill.subSkillName || skill.skillName}</div>
                {skill.subSkillName && (
                  <div className="text-[9px] text-muted-foreground">{skill.skillName}</div>
                )}
                {skill.mandatory && (
                  <Badge variant="outline" className="text-[8px] h-3.5 px-1 mt-0.5 bg-purple-50 text-purple-600 border-purple-200">
                    Required
                  </Badge>
                )}
              </td>
              <td className="text-center px-2 py-2">
                <span className="text-muted-foreground">{skill.requiredProficiency || "—"}</span>
              </td>
              <td className="text-center px-2 py-2">
                <span className={cn(
                  skill.resourceProficiency
                    ? "text-foreground font-medium"
                    : "text-muted-foreground/50 italic"
                )}>
                  {skill.resourceProficiency || "N/A"}
                </span>
              </td>
              <td className="text-center px-2 py-2">
                {skill.status === "MATCH" ? (
                  <span className="inline-flex items-center gap-0.5 text-green-700 font-semibold">
                    <CheckCircle2 className="h-3 w-3" />
                    Match
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-red-600 font-semibold">
                    <XCircle className="h-3 w-3" />
                    Gap
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Recency warnings section */
function RecencyWarnings({ warnings }) {
  if (!warnings || warnings.length === 0) return null

  return (
    <div className="space-y-2">
      <SectionHeader icon={Clock} title="Recency Warnings" badge={`${warnings.length}`} />
      <div className="space-y-1.5">
        {warnings.map((w, i) => (
          <div
            key={i}
            className={cn(
              "flex items-start gap-2 p-2.5 rounded-lg border text-[11px]",
              w.riskLevel === "HIGH" ? "bg-red-50/50 border-red-200" :
                w.riskLevel === "MEDIUM" ? "bg-amber-50/50 border-amber-200" :
                  "bg-green-50/50 border-green-200"
            )}
          >
            <Clock className={cn(
              "h-3.5 w-3.5 mt-0.5 shrink-0",
              w.riskLevel === "HIGH" ? "text-red-500" :
                w.riskLevel === "MEDIUM" ? "text-amber-500" :
                  "text-green-500"
            )} />
            <div>
              <div className="font-medium text-foreground">
                {w.subSkillName || w.skillName}
                {w.subSkillName && <span className="text-muted-foreground font-normal"> ({w.skillName})</span>}
              </div>
              <div className="text-muted-foreground mt-0.5">
                {w.lastUsedDate
                  ? `Last used: ${w.lastUsedDate}`
                  : "Never used"}
                {w.yearsUnused && w.yearsUnused < 999 && (
                  <span className="ml-1">• {w.yearsUnused}y unused</span>
                )}
              </div>
            </div>
            <RiskBadge level={w.riskLevel} />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Certificate comparisons section (future-ready) */
function CertificateComparisons({ comparisons }) {
  if (!comparisons || comparisons.length === 0) return null

  return (
    <div className="space-y-2">
      <SectionHeader icon={Shield} title="Certificate Analysis" badge={`${comparisons.length}`} />
      <div className="space-y-1.5">
        {comparisons.map((cert, i) => (
          <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20 text-[11px]">
            <span className="font-medium text-foreground">{cert.certificateName || cert.name}</span>
            <Badge variant="outline" className={cn(
              "text-[9px]",
              cert.status === "MATCH" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
            )}>
              {cert.status}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Loading skeleton for analysis results */
function AnalysisSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Gauge skeleton */}
      <div className="flex justify-center">
        <div className="h-24 w-24 rounded-full border-4 border-muted" />
      </div>
      {/* Badges skeleton */}
      <div className="flex items-center justify-center gap-3">
        <div className="h-6 w-24 bg-muted rounded-full" />
        <div className="h-6 w-32 bg-muted rounded-full" />
      </div>
      {/* Table skeleton */}
      <div className="space-y-2">
        <div className="h-8 bg-muted rounded-lg" />
        <div className="h-12 bg-muted/60 rounded-lg" />
        <div className="h-12 bg-muted/60 rounded-lg" />
        <div className="h-12 bg-muted/60 rounded-lg" />
      </div>
    </div>
  )
}

/** Empty state before analysis */
function AnalysisEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="h-16 w-16 rounded-2xl bg-primary/5 flex items-center justify-center mb-4">
        <Brain className="h-8 w-8 text-primary/30" />
      </div>
      <h4 className="text-sm font-semibold text-foreground mb-1">Skill Intelligence</h4>
      <p className="text-xs text-muted-foreground max-w-[220px] leading-relaxed">
        Select a demand and click <strong>"Get Match Score"</strong> to analyze skill alignment for this resource.
      </p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PANEL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function ResourceDetailPanel({ resource, open, onOpenChange }) {
  if (!resource) return null

  const [activeTab, setActiveTab] = useState("operational")
  const [utilizationLoading, setUtilizationLoading] = useState(false)
  const [utilizationData, setUtilizationData] = useState(null)

  // Skill Gap Analysis hook
  const {
    filteredDemands,
    demandsLoading,
    demandsError,
    demandSearch,
    setDemandSearch,
    selectedDemand,
    setSelectedDemand,
    loadDemands,
    analysisResult,
    analysisLoading,
    analysisError,
    runAnalysis,
    resetAnalysis,
    canRunAnalysis,
  } = useSkillGapAnalysis(resource.id)

  // ── Utilization data fetch ────────────────────────────────────────
  const fetchUtilizationData = async () => {
    if (!resource.id) return
    setUtilizationLoading(true)
    try {
      const response = await getUtilization(resource.id)
      setUtilizationData(response)
    } catch (error) {
      console.error("Error fetching utilization:", error)
      toast.error(error.response?.data?.message || "Failed to fetch utilization data.")
      setUtilizationData({ monthlySummary: {} })
    } finally {
      setUtilizationLoading(false)
    }
  }

  useEffect(() => {
    if (open && resource) {
      fetchUtilizationData()
    } else {
      setUtilizationData(null)
      resetAnalysis()
      setActiveTab("operational")
    }
  }, [open, resource?.id])

  // ── Load demands when switching to Skill Intelligence tab ─────────
  useEffect(() => {
    if (activeTab === "intelligence" && open) {
      loadDemands()
    }
  }, [activeTab, open])

  // ── Tab config ─────────────────────────────────────────────────────
  const tabs = [
    { id: "operational", label: "Operational", icon: BarChart3 },
    { id: "intelligence", label: "Skill Intelligence", icon: Brain },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] sm:max-w-[420px] p-0 overflow-hidden flex flex-col">
        {/* ─── HEADER (Always visible) ─────────────────────────────────── */}
        <SheetHeader className="p-4 pb-3 border-b bg-background shrink-0">
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11 border shadow-sm">
              <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
                {resource.avatar}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <SheetTitle className="text-sm font-heading font-bold truncate">{resource.name}</SheetTitle>
                {resource.noticeInfo?.isNoticePeriod && (
                  <Badge variant="destructive" className="text-[8px] h-4 px-1 py-0 uppercase font-bold tracking-wider shrink-0">
                    On Notice
                  </Badge>
                )}
              </div>
              <SheetDescription className="text-xs flex items-center gap-1.5 mt-0.5">
                <StatusDot status={resource.status} />
                <span className="truncate">{resource.role}</span>
                <span className="text-muted-foreground/40 mx-0.5">•</span>
                <span className="tabular-nums font-medium">{resource.currentAllocation}%</span>
              </SheetDescription>
            </div>
            <button
              className="h-7 w-7 flex items-center justify-center rounded-md border shadow-sm bg-background hover:bg-muted shrink-0"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </SheetHeader>

        {/* ─── SEGMENTED TAB CONTROL ───────────────────────────────────── */}
        <div className="px-4 pt-3 pb-2 bg-background shrink-0">
          <div className="flex rounded-lg bg-muted/50 p-1 gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-all duration-200",
                    activeTab === tab.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ─── SCROLLABLE CONTENT AREA ─────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {/* ════════════════════════════════════════════════════════════════
              OPERATIONAL VIEW
              ════════════════════════════════════════════════════════════ */}
          {activeTab === "operational" && (
            <div className="flex flex-col gap-5 p-4 pb-6">
              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {resource.location}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Briefcase className="h-3.5 w-3.5 shrink-0" />
                  {resource.experience} years exp
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  Avail: {new Date(resource.availableFrom).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Star className="h-3.5 w-3.5 shrink-0" />
                  {resource.employmentType}
                </div>
                {resource.noticeInfo?.isNoticePeriod && (
                  <div className="col-span-2 flex items-center gap-2 text-[11px] text-red-600 bg-red-50 p-2 rounded-md border border-red-100 mt-1">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>
                      Notice Period: <strong>{resource.noticeInfo.noticeStartDate}</strong> to <strong>{resource.noticeInfo.noticeEndDate}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Allocation Bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-foreground">Current Allocation</span>
                  <span className="text-xs font-bold tabular-nums text-foreground">{resource.currentAllocation}%</span>
                </div>
                <div className="relative h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      resource.currentAllocation > 70 ? "bg-status-allocated" :
                        resource.currentAllocation > 20 ? "bg-status-partial" : "bg-status-available"
                    )}
                    style={{ width: `${resource.currentAllocation}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-muted-foreground">Project: {resource.currentProject}</span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    Next: {resource.nextAssignment} <ArrowRight className="h-2.5 w-2.5" />
                  </span>
                </div>
              </div>

              <Separator />

              {/* Allocation Timeline */}
              <div>
                <SectionHeader icon={TrendingUp} title="Allocation Timeline" />
                <TimelineBar resource={resource} />
                <div className="mt-2 flex flex-col gap-1">
                  {(resource.allocationTimeline || []).map((block, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px]">
                      <span className={cn("text-muted-foreground", block.tentative && "italic")}>
                        {block.project}{block.tentative ? " (T)" : ""}
                      </span>
                      <span className="tabular-nums text-muted-foreground">{block.allocation}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Utilization Trend */}
              <div>
                <SectionHeader icon={BarChart3} title="Utilization Trend" badge="6 months" />
                <UtilizationChart data={utilizationData} loading={utilizationLoading} />
              </div>

              <Separator />

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button className="flex-1 h-9 text-xs">
                  Create Demand
                </Button>
                <Button variant="outline" className="flex-1 h-9 text-xs bg-transparent">
                  Reserve Resource
                </Button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              SKILL INTELLIGENCE VIEW
              ════════════════════════════════════════════════════════════ */}
          {activeTab === "intelligence" && (
            <div className="flex flex-col gap-5 p-4 pb-6">
              {/* Demand Selector */}
              <DemandDropdown
                demands={[]}
                filteredDemands={filteredDemands}
                loading={demandsLoading}
                error={demandsError}
                search={demandSearch}
                onSearchChange={setDemandSearch}
                selectedDemand={selectedDemand}
                onSelect={setSelectedDemand}
              />

              {/* Get Match Score CTA */}
              <Button
                onClick={runAnalysis}
                disabled={!canRunAnalysis}
                className={cn(
                  "w-full h-10 text-xs font-semibold gap-2 transition-all duration-200",
                  canRunAnalysis
                    ? "bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg"
                    : "opacity-50"
                )}
              >
                {analysisLoading ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="h-3.5 w-3.5" />
                    Get Match Score
                  </>
                )}
              </Button>

              <Separator />

              {/* Results Area */}
              {analysisLoading ? (
                <AnalysisSkeleton />
              ) : analysisError ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-3">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                  </div>
                  <p className="text-sm font-medium text-destructive mb-1">Analysis Failed</p>
                  <p className="text-xs text-muted-foreground max-w-[200px]">{analysisError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={runAnalysis}
                    className="mt-3 text-xs h-8"
                  >
                    Retry Analysis
                  </Button>
                </div>
              ) : analysisResult ? (
                <div className="space-y-5">
                  {/* Score + Risk Summary */}
                  <div className="flex items-center gap-5">
                    <MatchGauge percentage={analysisResult.matchPercentage} />
                    <div className="flex-1 space-y-2.5">
                      <RiskBadge level={analysisResult.riskLevel} />
                      <AllocationIndicator allowed={analysisResult.allocationAllowed} />
                    </div>
                  </div>

                  <Separator />

                  {/* Skill Comparison Matrix */}
                  <div>
                    <SectionHeader
                      icon={Activity}
                      title="Skill Comparison"
                      badge={`${analysisResult.skillComparisons?.length || 0} skills`}
                    />
                    <SkillComparisonTable comparisons={analysisResult.skillComparisons} />
                  </div>

                  {/* Recency Warnings */}
                  {analysisResult.recencyWarnings?.length > 0 && (
                    <>
                      <Separator />
                      <RecencyWarnings warnings={analysisResult.recencyWarnings} />
                    </>
                  )}

                  {/* Certificate Comparisons */}
                  {analysisResult.certificateComparisons?.length > 0 && (
                    <>
                      <Separator />
                      <CertificateComparisons comparisons={analysisResult.certificateComparisons} />
                    </>
                  )}
                </div>
              ) : (
                <AnalysisEmptyState />
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
