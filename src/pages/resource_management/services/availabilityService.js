import { RESOURCES, computeStatus } from "../models/availabilityModel"

export { computeStatus }

export { RESOURCES }

export function getKPIData(resources = RESOURCES) {
  const total = resources.length
  const fullyAvailable = resources.filter((r) => r.status === "available").length
  const partiallyAvailable = resources.filter((r) => r.status === "partial").length
  const fullyAllocated = resources.filter((r) => r.status === "allocated").length
  const overAllocated = resources.filter((r) => r.currentAllocation > 100).length

  const upcomingAvailability = resources.filter((r) => {
    const availDate = new Date(r.availableFrom || new Date())
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    return availDate <= thirtyDaysFromNow
  }).length

  const avgUtil = total > 0 ? Math.round(
    resources.reduce((sum, r) => sum + Math.min(r.currentAllocation, 100), 0) / total
  ) : 0

  const benchCapacity = total > 0 ? Math.round((fullyAvailable / total) * 100) : 0

  return {
    totalResources: total,
    fullyAvailable,
    partiallyAvailable,
    fullyAllocated,
    upcomingAvailability,
    utilization: avgUtil,
    benchCapacity,
    overAllocated,
  }
}

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

export function generateCalendarDays(year, month, resources = RESOURCES) {
  const days = []
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    const dayOfWeek = date.getDay()
    // Correctly format date as YYYY-MM-DD in local time
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const dateStr = `${y}-${m}-${d}`

    const resourceAllocations = resources.map((r) => {
      // Compute real allocation from timeline blocks for this date
      let totalAlloc = 0
      let activeProject = r.currentProject
      for (const block of (r.allocationTimeline || [])) {
        if (dateStr >= block.startDate && dateStr <= block.endDate && !block.tentative) {
          totalAlloc += block.allocation
          activeProject = block.project
        }
      }
      // Fall back to currentAllocation if no active blocks found
      if (totalAlloc === 0) {
        // Ensure ID is treated as a string for charCodeAt, or handle numeric IDs
        const idStr = String(r.id);
        const seed = idStr.charCodeAt(idStr.length - 1) * 31 + day * 7 + month * 13
        totalAlloc = Math.min(
          100,
          Math.max(0, r.currentAllocation + Math.floor(seededRandom(seed) * 20) - 10)
        )
      }

      const status = computeStatus(Math.min(totalAlloc, 100))
      return {
        resourceId: r.id,
        allocation: totalAlloc,
        project: activeProject,
        role: r.role,
        status,
      }
    })

    days.push({
      date: dateStr,
      dayOfMonth: day,
      dayOfWeek,
      resources: resourceAllocations,
    })
  }

  return days
}
