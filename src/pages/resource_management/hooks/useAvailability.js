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
        const mappedData = response.data.map((r) => ({
          ...r,
          id: r.resourceId,
          status: computeStatus(r.currentAllocation || 0),
          availableFrom:
            r.availableFrom || new Date().toISOString().split("T")[0],
          currentProject: Array.isArray(r.currentProject)
            ? r.currentProject.join(", ")
            : r.currentProject,
        }));
        setFilteredResources(mappedData);
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
