import { ArrowUpDown } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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

export function ResourceTable({ resources, onResourceClick }) {
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
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-center px-4 py-2">
                <SortHeader label="Resource" sortKeyName="name" />
              </th>
              <th className="text-center px-4 py-2">
                <span className="text-xs font-sans font-semibold text-muted-foreground tracking-wider whitespace-nowrap">Skills</span>
              </th>
              <th className="text-center px-4 py-2">
                <SortHeader label="Allocation" sortKeyName="currentAllocation" />
              </th>
              <th className="text-center px-4 py-2 hidden lg:table-cell">
                <SortHeader label="Available From" sortKeyName="availableFrom" />
              </th>
              <th className="text-center px-4 py-2 hidden md:table-cell">
                <span className="text-xs font-sans font-semibold text-muted-foreground tracking-wider">Project</span>
              </th>
              <th className="text-center px-4 py-2">
                <SortHeader label="Status" sortKeyName="status" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((resource) => (
              <tr
                key={resource.id}
                className="border-b last:border-b-0 hover:bg-muted/40 cursor-pointer transition-colors"
                onClick={() => onResourceClick(resource)}
              >
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-3">
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
                </td>
                <td className="px-4 py-3 max-w-[200px] text-center">
                  <div className="flex flex-wrap items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap">
                    {resource.skills.slice(0, 3).map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-[10px] px-1.5 h-4.5 bg-slate-100 text-slate-600 border-none truncate max-w-[80px]">
                        {skill}
                      </Badge>
                    ))}
                    {resource.skills.length > 3 && (
                      <span className="text-[10px] text-muted-foreground font-bold shrink-0">+{resource.skills.length - 3}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <AllocationBar value={resource.currentAllocation} />
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-center">
                  <span className="text-xs text-muted-foreground">
                    {resource.availableFrom}
                  </span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-center">
                  <span className="text-xs text-card-foreground truncate max-w-[120px] mx-auto block">{resource.currentProject || "No Project"}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={resource.status} />
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No resources match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
};
