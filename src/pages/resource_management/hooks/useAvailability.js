import { useState, useMemo, useCallback, useEffect } from "react";
import {
  RESOURCES,
  getKPIData,
  computeStatus,
} from "../services/availabilityService";
import { getAvailabilityTimeline } from "../services/workforceService";

export const defaultFilters = {
  role: "All Roles",
  location: "All Locations",
  experienceRange: [0, 15],
  allocationRange: [0, 100],
  allocationPercentage: 0,
  project: "All Projects",
  employmentType: "All Types",
  search: "",
  startDate: null,
  endDate: null,
};

export function useAvailability() {
  const [filters, setFilters] = useState(defaultFilters);
  const [statusFilter, setStatusFilter] = useState(null);
  const [filterPanelCollapsed, setFilterPanelCollapsed] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeView, setActiveView] = useState("calendar");

  // Date State for Calendar
  const [currentDate, setCurrentDate] = useState(new Date());

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filteredResources, setFilteredResources] = useState([]);

  // Calculate KPI data dynamically from the fetched resources
  const kpiData = useMemo(
    () => getKPIData(filteredResources),
    [filteredResources],
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const payload = {
        page: page - 1,
        size: 10,
      };

      // If no explicit date filters are set, pass the current view month as window
      const currentFilters = { ...filters };
      if (!currentFilters.startDate && !currentFilters.endDate) {
        const firstDay = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          1,
        );
        const lastDay = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          0,
        );
        currentFilters.startDate = firstDay.toLocaleDateString("en-CA");
        currentFilters.endDate = lastDay.toLocaleDateString("en-CA");
      }
      const response = await getAvailabilityTimeline(currentFilters, payload);

      if (response && response.data) {
        const todayStr = new Date().toLocaleDateString("en-CA");
        const mappedData = response.data.map((r) => {
          const timeline = r.allocationTimeline || r.allocations || [];
          let currentAllocation = 0;
          let currentProjects = [];

          timeline.forEach((block) => {
            if (
              todayStr >= block.startDate &&
              todayStr <= block.endDate &&
              !block.tentative &&
              block.status !== "ROLLED_OFF"
            ) {
              currentAllocation += block.allocation;
              if (block.project) currentProjects.push(block.project);
            }
          });

          // Trust timeline for current state if available, else fallback to backend fields
          const finalAllocation = timeline.length > 0 ? currentAllocation : (r.currentAllocation || 0);
          const finalProject = timeline.length > 0
            ? (currentProjects.length > 0 ? [...new Set(currentProjects)].join(", ") : "Bench")
            : (Array.isArray(r.currentProject) ? r.currentProject.join(", ") : (r.currentProject || "Bench"));

          const resourceId = r.resourceId || r.employeeId || r.userId || r.id;

          return {
            ...r,
            id: resourceId,
            resourceId,
            employeeId: r.employeeId || resourceId,
            currentAllocation: finalAllocation,
            status: computeStatus(finalAllocation),
            availableFrom: r.availableFrom || todayStr,
            currentProject: finalProject,
          };
        }).filter((r) => {
          // If filtering by project, ensure the resource actually has an active allocation to that project today
          if (filters.project && filters.project !== "All Projects") {
            const timeline = r.allocationTimeline || r.allocations || [];
            return timeline.some(block => 
              block.project === filters.project && 
              todayStr >= block.startDate && 
              todayStr <= block.endDate && 
              !block.tentative
            );
          }
          return true;
        });

        const visibleData = mappedData.filter((r) => {
          // Exclude resources with ROLLED_OFF allocationStatus or FULFILLED roleOffStatus
          const allocStatus = String(r.allocationStatus || r.status || "").toUpperCase();
          const roStatus = String(r.roleOffStatus || "").toUpperCase();
          return allocStatus !== "ROLLED_OFF" && roStatus !== "FULFILLED";
        });

        setFilteredResources(visibleData);
        setTotalPages(response.totalPages);
        setTotalElements(response.totalElements);
      }
    } catch (error) {
      console.error("Failed to fetch timeline data", error);
    } finally {
      setLoading(false);
    }
  }, [filters, page, currentDate]);

  // Effect to fetch data
  useEffect(() => {
    setLoading(true); // Set loading immediately for instant feedback
    const delay = setTimeout(() => {
      fetchData();
    }, 400);

    return () => clearTimeout(delay);
  }, [filters, page, currentDate]);

  // Reset to first page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  const handleResourceClick = useCallback((resource) => {
    setSelectedResource(resource);
    setDetailOpen(true);
  }, []);

  const handleDayClick = useCallback((_date, status) => {
    setStatusFilter((prev) => (prev === status ? null : status));
    setPage(1); // Reset to first page on filter change
  }, []);

  // const handleKPIFilterClick = useCallback((status) => {
  //   setStatusFilter(status)
  //   setPage(1);
  // }, [])

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
    setStatusFilter(null);
    setPage(1);
  }, []);

  return {
    filters,
    setFilters,
    resetFilters,
    // statusFilter,
    setStatusFilter,
    filterPanelCollapsed,
    setFilterPanelCollapsed,
    toggleFilterPanel: () => setFilterPanelCollapsed((prev) => !prev),
    selectedResource,
    detailOpen,
    setDetailOpen,
    activeView,
    setActiveView,
    kpiData,
    filteredResources,
    handleResourceClick,
    handleDayClick,
    // handleKPIFilterClick,
    // Pagination exports
    page,
    setPage,
    totalPages,
    totalElements,
    loading,
    currentDate,
    setCurrentDate,
  };
}
