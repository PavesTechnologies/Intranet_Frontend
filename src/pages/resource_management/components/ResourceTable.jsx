import { ArrowUpDown } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import GenericTable from "@/components/Table/table"

function getResourceMeta(resource) {
  const parts = [resource.location, resource.role].filter(Boolean)
  return parts.length > 0 ? parts.join(" | ") : "N/A"
}

function StatusBadge({ status }) {
  const config = {
    available: { label: "Available", className: "bg-status-available/15 text-status-available border-status-available/30" },
    partial: { label: "Partial", className: "bg-status-partial/15 text-status-partial border-status-partial/30" },
    allocated: { label: "Allocated", className: "bg-status-allocated/15 text-status-allocated border-status-allocated/30" },
  }
  const c = config[status]
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", c.className)}>
      {c.label}
    </Badge>
  )
}

function AllocationBar({ value }) {
  let color = "bg-status-available"
  if (value > 70) color = "bg-status-allocated"
  else if (value > 20) color = "bg-status-partial"

  return (
    <div className="flex items-center justify-center gap-2 min-w-[100px]">
      <div className="relative h-1.5 flex-1 rounded-full bg-secondary overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">{value}%</span>
    </div>
  )
}

export function ResourceTable({ resources, onResourceClick, loading = false }) {
  const [sortKey, setSortKey] = useState("name")
  const [sortDir, setSortDir] = useState("asc")

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const sorted = [...resources].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1
    switch (sortKey) {
      case "name":
        return a.name.localeCompare(b.name) * dir
      case "currentAllocation":
        return (a.currentAllocation - b.currentAllocation) * dir
      case "availableFrom":
        return (new Date(a.availableFrom).getTime() - new Date(b.availableFrom).getTime()) * dir
      case "status": {
        const statusOrder = { available: 0, partial: 1, allocated: 2 }
        return (statusOrder[a.status] - statusOrder[b.status]) * dir
      }
      default:
        return 0
    }
  })

  function SortHeader({ label, sortKeyName }) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs font-medium text-muted-foreground hover:text-foreground mx-auto"
        onClick={() => toggleSort(sortKeyName)}
      >
        {label}
        <ArrowUpDown className={cn("ml-1 h-3 w-3", sortKey === sortKeyName && "text-primary")} />
      </Button>
    )
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-3 py-1">
        <h3 className="text-sm font-heading font-bold text-card-foreground">Resources</h3>
        <span className="text-xs text-muted-foreground">{resources.length} resources</span>
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <GenericTable
  headers={[
    <div className="flex justify-center w-full">Resource</div>,
    <div className="flex justify-center w-full">Skills</div>,
    <div className="flex justify-center w-full">Allocation</div>,
    <div className="flex justify-center w-full">Available From</div>,
    <div className="flex justify-center w-full">Project</div>,
    <div className="flex justify-center w-full">Status</div>,
  ]}
  columns={[
    "resource_info",
    "skills_info",
    "allocation_info",
    "available_from",
    "project_info",
    "status_info",
  ]}
  rows={sorted.map((resource) => ({
    ...resource,

    resource_info: (
      <div className="flex items-center justify-center gap-3 max-w-[260px] mx-auto">
        <Avatar className="h-8 w-8 border shrink-0">
          <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
            {resource.avatar}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2 min-w-0">
            <p
              className="text-sm font-heading font-bold text-card-foreground truncate min-w-0 flex-1 hover:text-indigo-900 cursor-pointer transition-colors"
              onClick={() => onResourceClick(resource)}
              title={resource.name}
            >
              {resource.name}
            </p>

            {resource.noticeInfo?.isNoticePeriod && (
              <span className="text-[10px] font-bold text-red-500 whitespace-nowrap px-1.5 py-0.5 bg-red-50 rounded shrink-0">
                On Notice
              </span>
            )}
          </div>

          <p
            className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[160px] cursor-pointer hover:text-slate-700 transition-colors"
            title={getResourceMeta(resource)}
          >
            {getResourceMeta(resource)}
          </p>
        </div>
      </div>
    ),

    skills_info: (
      <div className="flex justify-center">
        <div
          className="max-w-[220px] truncate overflow-hidden whitespace-nowrap cursor-pointer text-center"
          title={resource.skills.join(", ")}
        >
          <span className="text-xs text-slate-700">
            {resource.skills.join(", ")}
          </span>
        </div>
      </div>
    ),

    allocation_info: (
      <div className="flex justify-center">
        <AllocationBar value={resource.currentAllocation} />
      </div>
    ),

    available_from: (
      <div className="flex justify-center">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {resource.availableFrom}
        </span>
      </div>
    ),

    project_info: (
      <div className="flex justify-center">
        <span
          className="text-xs text-card-foreground truncate overflow-hidden whitespace-nowrap cursor-pointer hover:text-slate-700 transition-colors block max-w-[200px] text-center"
          title={resource.currentProject || "No Project"}
        >
          {resource.currentProject || "No Project"}
        </span>
      </div>
    ),

    status_info: (
      <div className="flex justify-center">
        <StatusBadge status={resource.status} />
      </div>
    ),
  }))}
  loading={loading}
/>
      </div>
    </div>
  )
};
