import { Users, UserCheck, UserMinus, Clock, TrendingUp, AlertTriangle, Gauge } from "lucide-react"
import { cn } from "@/lib/utils"

function KPICard({ label, value, icon, color, active, onClick, suffix, className }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-all", active ? "ring-2 ring-primary bg-primary/5 border-primary/20" : "", className)}>
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", color || "bg-secondary text-secondary-foreground")}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 mb-0.5 whitespace-nowrap">
          {label}
        </p>
        <p className="text-2xl font-bold text-slate-900 tabular-nums tracking-tight">
          {value}{suffix}
        </p>
      </div>
    </div>
  )
}

export function KPISkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 animate-pulse">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-24 rounded-xl border border-slate-100 bg-white p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-slate-100 shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-3 w-2/3 bg-slate-100 rounded" />
            <div className="h-6 w-1/3 bg-slate-100 rounded" />
          </div>
        </div>
      ))}
      <div className="lg:col-span-3 h-24 rounded-xl border border-slate-100 bg-white p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-slate-100 shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-3 w-1/4 bg-slate-100 rounded" />
          <div className="h-6 w-1/6 bg-slate-100 rounded" />
        </div>
      </div>
      <div className="lg:col-span-3 h-24 rounded-xl border border-slate-100 bg-white p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-slate-100 shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-3 w-1/4 bg-slate-100 rounded" />
          <div className="h-6 w-1/6 bg-slate-100 rounded" />
        </div>
      </div>
    </div>
  )
}

export function KPIBar({ data, activeFilter, onFilterClick, loading }) {
  if (loading || !data) return <KPISkeleton />
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
      <KPICard
        label="Total Resources"
        value={data?.totalResources || 0}
        icon={<Users className="h-5 w-5" />}
        color="bg-indigo-100 text-indigo-600"
        // active={activeFilter === null}
      //onClick={() => onFilterClick && onFilterClick(null)}
      />
      <KPICard
        label="Fully Available"
        value={data?.fullyAvailable || 0}
        icon={<UserCheck className="h-5 w-5" />}
        color="bg-emerald-50 text-emerald-600"
        // active={activeFilter === "available"}
      //onClick={() => onFilterClick && onFilterClick("available")}
      />
      <KPICard
        label="Partially Available"
        value={data?.partiallyAvailable || 0}
        icon={<UserMinus className="h-5 w-5" />}
        color="bg-amber-100 text-amber-600"
        // active={activeFilter === "partial"}
      //onClick={() => onFilterClick && onFilterClick("partial")}
      />
      <KPICard
        label="Fully Allocated"
        value={data?.fullyAllocated || 0}
        icon={<Users className="h-5 w-5" />}
        color="bg-rose-100 text-rose-600"
        // active={activeFilter === "allocated"}
      //OnClick={() => onFilterClick && onFilterClick("allocated")}
      />
      <KPICard
        label="Available (30d)"
        value={data?.upcomingAvailability || 0}
        icon={<Clock className="h-5 w-5" />}
        color="bg-blue-100 text-blue-600"
      />
      <KPICard
        label="Bench Capacity"
        value={data?.benchCapacity || 0}
        suffix="%"
        icon={<Gauge className="h-5 w-5" />}
        color="bg-blue-100 text-blue-600"
      />

      {/* Bottom row - Spanning 3 columns each on large screens */}
      <KPICard
        label="Over-allocated"
        value={data?.overAllocated || 0}
        icon={<AlertTriangle className="h-5 w-5" />}
        color="bg-rose-100 text-rose-600"
        className="lg:col-span-3 h-24"
      />
      <KPICard
        label="Utilization"
        value={data?.utilization || 0}
        suffix="%"
        icon={<TrendingUp className="h-5 w-5" />}
        color="bg-blue-100 text-blue-600"
        className="lg:col-span-3 h-24"
      />
    </div>
  )
}
