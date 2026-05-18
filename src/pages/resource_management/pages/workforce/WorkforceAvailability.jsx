import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { KPIBar } from "../../components/AvailabilityKPIs";
import { FilterPanel } from "../../components/filters/AvailabilityFilters";
import { AvailabilityCalendar } from "../../components/AvailabilityCalendar";
import { AvailabilityTimeline } from "../../components/AvailabilityTimeline";
import { ResourceTable } from "../../components/ResourceTable";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Table2, GanttChart } from "lucide-react";
import { RESOURCES, getKPIData } from "../../services/availabilityService";
import { getWorkforceKPI } from "../../services/workforceService";
import { useAvailability } from "../../hooks/useAvailability";
import { notify } from "../../utils/notify";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import Pagination from "../../../../components/Pagination/pagination";

export default function WorkforceAvailability() {
  const navigate = useNavigate();
  const {
    filters,
    setFilters,
    resetFilters,
    statusFilter,
    setStatusFilter,
    filterPanelCollapsed,
    setFilterPanelCollapsed,
    activeView,
    setActiveView,
    // kpiData,
    totalElements,
    filteredResources,
    handleDayClick,
    // handleKPIFilterClick,
    toggleFilterPanel,
    page,
    totalPages,
    setPage,
    loading,
    currentDate,
    setCurrentDate,
  } = useAvailability();

  // Navigate to Resource Intelligence page instead of opening a modal
  const handleResourceClick = (resource) => {
    const id = resource.employeeId || resource.resourceId || resource.userId || resource.id;
    if (!id) {
      console.warn("Resource has no id or resourceId:", resource);
      return;
    }
    navigate(`/resource-management/workforce-availability/resource/${id}`, {
      state: { resource },
    });
  };

  const [kpiData, setKpiData] = useState(null);
  const [kpiLoading, setKpiLoading] = useState(true);

  const fetchKPI = async () => {
    setKpiLoading(true);
    try {
      const res = await getWorkforceKPI(filters);
      setKpiData(res.data);
    } catch (err) {
      console.error("Failed to load KPI data", err);
      notify.error(err, "Failed to load KPI data");
    } finally {
      setKpiLoading(false);
    }
  };

  // useEffect(() => {
  //   fetchKPI();
  // }, [filters]);
  useEffect(() => {
    const delay = setTimeout(() => {
      fetchKPI();
    }, 400);

    return () => clearTimeout(delay);
  }, [filters]);

  return (
    <div className="min-h-screen bg-background">
      <main className="p-3 sm:p-4 md:p-6">
        <div className="mb-4 md:mb-6">
          <h1 className="text-xl sm:text-2xl font-heading font-bold text-slate-900 tracking-tight">
            Workforce Availability Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            A real-time snapshot of team capacity, utilization, and resource
            allocation across roles and locations.
          </p>
        </div>
        {/* KPI Summary Bar */}
        <div className="mb-4 md:mb-6 min-h-[200px]">
          <KPIBar
            data={kpiData}
            // activeFilter={statusFilter}
            // onFilterClick={handleKPIFilterClick}
            loading={kpiLoading}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex flex-col lg:flex-row gap-4 md:gap-6 items-start">
          {/* Filter Panel */}
          <FilterPanel
            filters={filters}
            onFiltersChange={setFilters}
            onReset={resetFilters}
            collapsed={filterPanelCollapsed}
            onToggleCollapse={toggleFilterPanel}
          />

          {/* Primary Content */}
          <div className="flex-1 min-w-0 w-full bg-card rounded-lg border shadow-sm">
            <Tabs
              value={activeView}
              onValueChange={setActiveView}
              className="h-full flex flex-col"
            >
              <div className="p-3 sm:p-4 border-b">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                  <div className="flex items-center gap-4">
                    <h3 className="text-sm font-heading font-bold text-card-foreground">
                      Timeline
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {totalElements} resources
                    </span>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar -mb-px">
                    <TabsList className="h-9 bg-muted/50 p-1 w-full sm:w-auto inline-flex min-w-max">
                      <TabsTrigger
                        value="calendar"
                        className="text-[11px] sm:text-xs h-7 px-2.5 sm:px-4 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm flex-1 sm:flex-none whitespace-nowrap transition-all"
                      >
                        <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                        Calendar View
                      </TabsTrigger>
                      <TabsTrigger
                        value="timeline"
                        className="text-[11px] sm:text-xs h-7 px-2.5 sm:px-4 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm flex-1 sm:flex-none whitespace-nowrap transition-all"
                      >
                        <GanttChart className="h-3.5 w-3.5 shrink-0" />
                        Timeline
                      </TabsTrigger>
                      <TabsTrigger
                        value="table"
                        className="text-[11px] sm:text-xs h-7 px-2.5 sm:px-4 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm flex-1 sm:flex-none whitespace-nowrap transition-all"
                      >
                        <Table2 className="h-3.5 w-3.5 shrink-0" />
                        Table View
                      </TabsTrigger>
                    </TabsList>
                  </div>
                </div>

                {statusFilter && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-t mt-4 -mx-4 mb-[-16px]">
                    <span className="text-xs text-muted-foreground">
                      Filtering by:
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-xs font-normal gap-1 pr-1"
                    >
                      {statusFilter}
                      <button
                        onClick={() => setStatusFilter(null)}
                        className="hover:bg-muted rounded-full p-0.5"
                      >
                        <span className="sr-only">Remove</span>
                        <span className="text-muted-foreground">×</span>
                      </button>
                    </Badge>
                  </div>
                )}
              </div>

              <div className="pt-1 px-2 pb-2 sm:pt-1.5 sm:px-3 sm:pb-3 min-h-[600px] relative">
                {loading && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-[1px] transition-all duration-300">
                    {/* <div className="flex flex-col items-center gap-2 p-6 rounded-xl bg-card shadow-xl border animate-in fade-in zoom-in duration-300"> */}
                      <LoadingSpinner text="Fetching Resources" />
                      {/* <div className="flex flex-col items-center -mt-2">
                        <p className="text-sm font-bold text-slate-900">Fetching Resources</p>
                        <p className="text-[11px] text-slate-500 font-medium text-center">Updating your view...</p>
                      </div> */}
                    {/* </div> */}
                  </div>
                )}
                <TabsContent value="calendar" className="mt-0 outline-none">
                  <div className="flex flex-col gap-5">
                    <AvailabilityCalendar
                      filteredResources={filteredResources}
                      onDayClick={handleDayClick}
                      selectedResourceId={null}
                      onSelectResource={null}
                      currentDate={currentDate}
                      onNavigate={setCurrentDate}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="timeline" className="mt-0 outline-none">
                  <div className="flex flex-col gap-5">
                    {/* <AvailabilityTimeline
                      filteredResources={filteredResources}
                      onResourceClick={handleResourceClick}
                      currentDate={currentDate}
                      onNavigate={setCurrentDate}
                      loading={loading}
                      searchQuery={searchQuery}
                    /> */}
                    <AvailabilityTimeline
                      filteredResources={filteredResources}
                      onResourceClick={handleResourceClick}
                      currentDate={currentDate}
                      loading={loading}
                      filters={filters}
                      setFilters={setFilters}
                    />
                    {totalPages > 1 && (
                      <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        onPrevious={() => setPage((p) => Math.max(1, p - 1))}
                        onNext={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
                      />
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="table" className="mt-0 outline-none">
                  <div className="flex flex-col gap-2">
                    <ResourceTable
                      resources={filteredResources}
                      onResourceClick={handleResourceClick}
                      loading={loading}
                    />
                    {totalPages > 1 && (
                      <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        onPrevious={() => setPage((p) => Math.max(1, p - 1))}
                        onNext={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
                      />
                    )}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </main>


    </div>
  );
}
