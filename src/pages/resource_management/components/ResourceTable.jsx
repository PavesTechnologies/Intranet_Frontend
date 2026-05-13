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
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-heading font-bold text-card-foreground">Resources</h3>
        <span className="text-xs text-muted-foreground">{resources.length} resources</span>
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <GenericTable
          headers={["Resource", "Skills", "Allocation", "Available From", "Project", "Status", "Actions"]}
          columns={["resource_info", "skills_info", "allocation_info", "available_from", "project_info", "status_info", "actions"]}
          rows={sorted.map((resource) => ({
            ...resource,
            resource_info: (
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8 border">
                  <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                    {resource.avatar}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-sm font-heading font-bold text-card-foreground truncate min-w-0 flex-1">{resource.name}</p>
                    {resource.noticeInfo?.isNoticePeriod && (
                      <span className="text-[10px] font-bold text-red-500 whitespace-nowrap px-1.5 py-0.5 bg-red-50 rounded shrink-0">
                        On Notice
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground hidden sm:block">{getResourceMeta(resource)}</p>
                </div>
              </div>
            ),
            skills_info: (
              <div className="flex flex-wrap items-center gap-1.5 overflow-hidden whitespace-nowrap">
                {resource.skills.slice(0, 3).map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-[10px] px-1.5 h-4.5 bg-slate-100 text-slate-600 border-none truncate max-w-[80px]">
                    {skill}
                  </Badge>
                ))}
                {resource.skills.length > 3 && (
                  <span className="text-[10px] text-muted-foreground font-bold shrink-0">+{resource.skills.length - 3}</span>
                )}
              </div>
            ),
            allocation_info: <AllocationBar value={resource.currentAllocation} />,
            available_from: <span className="text-xs text-muted-foreground">{resource.availableFrom}</span>,
            project_info: <span className="text-xs text-card-foreground truncate max-w-[120px] block">{resource.currentProject || "No Project"}</span>,
            status_info: <StatusBadge status={resource.status} />,
            actions: (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-gray-300 hover:bg-gray-50"
                onClick={() => onResourceClick(resource)}
              >
                View Profile
              </Button>
            )
          }))}
          loading={loading}
        />
      </div>
    </div>
  )
};
