import React, { useEffect, useMemo, useState, useRef } from "react";
import { Download, Filter, Layers, Search, Users, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BenchKPI from "../components/BenchKPI";
import BenchFilters from "../components/BenchFilters";
import BenchTable from "../components/BenchTable";
import BenchDrawer from "../components/BenchDrawer";
import AllocateModal from "../components/AllocateModal";
import QuickAllocateModal from "../components/QuickAllocateModal";
import MoveToPoolModal from "../components/MoveToPoolModal";
import { createPortal } from "react-dom";
import {
  BENCH_STORAGE_KEY,
  BENCH_TABS,
  CATEGORY_OPTIONS,
  FILTER_DEFAULTS,
} from "../constants/benchConstants";
import {
  filterResources,
  getBenchMetrics,
  getUniqueValues,
  sanitizeResources,
  toCsv,
  updateCategory,
} from "../models/benchModel";
import { getBenchResources, getPoolResources, getBenchKPIs } from "../services/benchService";
import { toast } from "react-hot-toast";

const getStoredState = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(BENCH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
};

const downloadCsv = (filename, content) => {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const BenchPage = () => {
  const navigate = useNavigate();
  const stored = getStoredState();
  const [resources, setResources] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [search, setSearch] = useState(stored?.search || "");
  const [activeTab, setActiveTab] = useState(stored?.activeTab || "bench");
  const [filters, setFilters] = useState(stored?.filters || FILTER_DEFAULTS);
  const [draftFilters, setDraftFilters] = useState(stored?.filters || FILTER_DEFAULTS);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState(null);
  const filterButtonRef = useRef(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectedResourceId, setSelectedResourceId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [allocateTargets, setAllocateTargets] = useState([]);
  const [quickAllocateTarget, setQuickAllocateTarget] = useState(null);
  const [moveToPoolTargets, setMoveToPoolTargets] = useState([]);
  const [bulkCategory, setBulkCategory] = useState(CATEGORY_OPTIONS[0]);

  const updatePosition = () => {
    if (filterButtonRef.current) {
      const rect = filterButtonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const popupHeight = 450;
      const popupWidth = 400;

      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      let align = 'down';
      if (spaceBelow < popupHeight && spaceAbove > spaceBelow) {
        align = 'up';
      }

      setDropdownPos({
        top: align === 'up' ? 'auto' : (rect.bottom + 8),
        bottom: align === 'up' ? (viewportHeight - rect.top + 8) : 'auto',
        right: viewportWidth - rect.right,
        align,
        maxHeight: Math.min(viewportHeight * 0.85, align === 'up' ? spaceAbove - 24 : spaceBelow - 24)
      });
    }
  };

  useEffect(() => {
    if (filterPanelOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);

      const handleClickOutside = (event) => {
        if (filterButtonRef.current && !filterButtonRef.current.contains(event.target)) {
          const portal = document.getElementById('bench-filter-portal');
          if (portal && !portal.contains(event.target)) {
            setFilterPanelOpen(false);
          }
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [filterPanelOpen]);

  const toggleFilters = () => setFilterPanelOpen(!filterPanelOpen);

  const fetchData = async (isActive = true) => {
    try {
      const [benchRes, poolRes, kpiRes] = await Promise.all([
        getBenchResources(),
        getPoolResources(),
        getBenchKPIs()
      ]);

      if (!isActive) return;

      // Unpack and tag resources
      const benchList = (benchRes?.data || (Array.isArray(benchRes) ? benchRes : [])).map(r => ({ ...r, _source: 'bench' }));
      const poolList = (poolRes?.data || (Array.isArray(poolRes) ? poolRes : [])).map(r => ({ ...r, _source: 'pool' }));
      setResources(sanitizeResources([...benchList, ...poolList]));

      // Set live KPI data
      setKpis(kpiRes?.data || kpiRes || null);
    } catch (error) {
      if (!isActive) return;
      console.error("Resource Supply Data Load Error", error);
      toast.error("Failed to load bench or pool data");
    }
  };

  useEffect(() => {
    let active = true;
    fetchData(active);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(
      BENCH_STORAGE_KEY,
      JSON.stringify({
        search,
        activeTab,
        filters,
      }),
    );
  }, [search, activeTab, filters]);

  const visibleRows = useMemo(
    () => filterResources(resources, search, filters, activeTab),
    [resources, search, filters, activeTab],
  );
  const selectedResource = useMemo(
    () => resources.find((item) => item.id === selectedResourceId) || null,
    [resources, selectedResourceId],
  );
  const metrics = useMemo(() => {
    // If backend provided KPIs, use them preferentially
    if (kpis) {
      return [
        {
          label: "Bench Resources",
          value: kpis.totalBenchResources ?? kpis.benchCount ?? kpis.benchResources ?? 0,
          iconClassName: "border-blue-100 bg-blue-50 text-blue-700",
        },
        {
          label: "Ready Now",
          value: kpis.totalReadyNowResources ?? kpis.readyNowCount ?? kpis.readyNow ?? 0,
          iconClassName: "border-emerald-100 bg-emerald-50 text-emerald-700",
        },
        {
          label: "Internal Pool",
          value: kpis.totalPoolResources ?? kpis.internalPoolCount ?? kpis.internalPool ?? 0,
          iconClassName: "border-indigo-100 bg-indigo-50 text-indigo-700",
        },
        {
          label: "Cost / Risk Watch",
          value: kpis.totalRiskWatch ?? kpis.costRiskCount ?? kpis.highRisk ?? 0,
          iconClassName: "border-rose-100 bg-rose-50 text-rose-700",
        },
      ];
    }
    // Fallback to client-side derived metrics if API data is pending
    return getBenchMetrics(resources);
  }, [resources, kpis]);
  const filterOptions = useMemo(
    () => ({
      categories: CATEGORY_OPTIONS,
      locations: getUniqueValues(resources, "location"),
    }),
    [resources],
  );
  const tabCounts = useMemo(
    () => ({
      bench: filterResources(resources, "", FILTER_DEFAULTS, "bench").length,
      pool: filterResources(resources, "", FILTER_DEFAULTS, "pool").length,
    }),
    [resources],
  );

  const baseVisibleCount = activeTab === "bench" ? tabCounts.bench : tabCounts.pool;
  const selectedItems = resources.filter((item) => selectedRows.includes(item.id));

  const setResourceCategory = (resourceIds, category) => {
    if (!CATEGORY_OPTIONS.includes(category)) return;
    setResources((prev) =>
      prev.map((item) => (resourceIds.includes(item.id) ? updateCategory(item, category) : item)),
    );
  };

  const handleToggleAll = (checked) => {
    setSelectedRows(checked ? visibleRows.map((item) => item.id) : []);
  };

  const handleToggleRow = (id, checked) => {
    setSelectedRows((prev) =>
      checked ? [...new Set([...prev, id])] : prev.filter((item) => item !== id),
    );
  };

  const handleView = (resource) => {
    setSelectedResourceId(resource.id);
    setDrawerOpen(true);
  };

  const handleAllocate = (targets) => {
    const list = Array.isArray(targets) ? targets : [targets];
    if (list.length === 1) {
      setQuickAllocateTarget(list[0]);
    } else {
      setAllocateTargets(list);
    }
  };

  const handleMoveToPool = (targets) => {
    setMoveToPoolTargets(Array.isArray(targets) ? targets : [targets]);
  };

  const handleQuickAllocate = (resource) => {
    setQuickAllocateTarget(resource);
  };

  const applyAllocation = ({ project, allocation, startDate }) => {
    const ids = allocateTargets.map((item) => item.id);

    setResources((prev) =>
      prev.map((item) =>
        ids.includes(item.id)
          ? {
            ...item,
            allocation,
            availability: Math.max(0, 100 - allocation),
            lastAllocationDate: startDate,
            poolType: "",
            category: "Not Available",
            lastProject: {
              name: project,
              client: "Assigned",
              endDate: startDate,
              reason: "Allocated from bench management",
            },
          }
          : item,
      ),
    );

    setSelectedRows((prev) => prev.filter((id) => !ids.includes(id)));
    setAllocateTargets([]);
    if (selectedResourceId && ids.includes(selectedResourceId)) {
      setDrawerOpen(false);
      setSelectedResourceId(null);
    }
  };

  const applyMoveToPool = ({ poolType, reason }) => {
    const ids = moveToPoolTargets.map((item) => item.id);
    const poolCategory = poolType === "Training" ? "Training" : "Shadow";

    setResources((prev) =>
      prev.map((item) =>
        ids.includes(item.id)
          ? {
            ...item,
            poolType,
            category: poolCategory,
            transitionReason: reason,
            lastProject: {
              ...item.lastProject,
              reason,
            },
          }
          : item,
      ),
    );

    setSelectedRows((prev) => prev.filter((id) => !ids.includes(id)));
    setMoveToPoolTargets([]);
  };

  const handleExport = () => {
    downloadCsv(`bench-${activeTab}-view.csv`, toCsv(visibleRows));
  };

  const emptyState = baseVisibleCount === 0
    ? "No bench records available."
    : "No results match the current search and filters.";

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 font-sans">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/resource-management/roleoff')}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-all shadow-sm shrink-0"
            title="Back to Role-Off Operations"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-none">Bench Management Workspace</h1>
            <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500">
              Strategic tracking of available resource supply and internal pool movements
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-[12px] font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-[0.98]"
          >
            <Download className="h-3.5 w-3.5" />
            EXPORT ANALYTICS
          </button>
        </div>
      </div>

      <BenchKPI items={metrics} />

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-white px-5 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-6 overflow-x-auto px-1">
              {BENCH_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.id === "bench" ? Users : Layers;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setSelectedRows([]);
                    }}
                    className={`group relative inline-flex items-center gap-2 whitespace-nowrap px-1 pb-4 pt-2 text-left transition-all ${isActive ? "text-indigo-600" : "text-slate-500 hover:text-indigo-600"
                      }`}
                  >
                    <Icon className={`h-4 w-4 transition-colors ${isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-indigo-500"}`} />
                    <span className={`text-[12px] font-bold tracking-tight lowercase ${isActive ? "text-slate-900" : "text-slate-500"}`}>
                      {tab.label}
                    </span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold transition-all ${isActive ? "bg-indigo-50 text-indigo-600" : "bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500"}`}>
                      {tabCounts[tab.id] || 0}
                    </span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-indigo-600 shadow-[0_1px_4px_rgba(79,70,229,0.3)]" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-1 items-center justify-end gap-2">
              <div className="relative w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, role, skill or location..."
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/30 pl-9 pr-4 text-[13px] font-medium text-slate-600 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 shadow-inner"
                />
              </div>

              <div className="relative shrink-0">
                <button
                  ref={filterButtonRef}
                  type="button"
                  onClick={toggleFilters}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all shadow-sm ${filterPanelOpen
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-indigo-600/10"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                >
                  <Filter className={`h-3.5 w-3.5 ${filterPanelOpen ? 'fill-current' : ''}`} />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Filters</span>
                  {Object.values(filters).filter(v => v !== "" && v !== "ALL").length > 0 && (
                    <span className={`ml-1 px-1.5 rounded-sm text-[10px] font-bold ${filterPanelOpen ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                      {Object.values(filters).filter(v => v !== "" && v !== "ALL").length}
                    </span>
                  )}
                </button>

                {filterPanelOpen && dropdownPos && createPortal(
                  <div
                    id="bench-filter-portal"
                    className={`fixed bg-white border border-slate-200 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-[100] w-[calc(100vw-3rem)] sm:w-[400px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${dropdownPos.align === 'up' ? "origin-bottom-right" : "origin-top-right"
                      }`}
                    style={{
                      top: dropdownPos.top === 'auto' ? 'auto' : `${dropdownPos.top}px`,
                      bottom: dropdownPos.bottom === 'auto' ? 'auto' : `${dropdownPos.bottom}px`,
                      right: `${dropdownPos.right}px`,
                      maxHeight: `${dropdownPos.maxHeight}px`,
                    }}
                  >
                    <BenchFilters
                      open={filterPanelOpen}
                      filters={draftFilters}
                      filterOptions={filterOptions}
                      onChange={(key, value) => setDraftFilters((prev) => ({ ...prev, [key]: value }))}
                      onReset={() => {
                        setDraftFilters(FILTER_DEFAULTS);
                        setFilters(FILTER_DEFAULTS);
                      }}
                      onApply={() => {
                        setFilters(draftFilters);
                        setFilterPanelOpen(false);
                      }}
                      onClose={() => setFilterPanelOpen(false)}
                    />
                  </div>,
                  document.body
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4">
          <BenchTable
            rows={visibleRows}
            selectedRows={selectedRows}
            activeRowId={selectedResourceId}
            emptyState={emptyState}
            onToggleAll={handleToggleAll}
            onToggleRow={handleToggleRow}
            onView={handleView}
            onQuickAllocate={handleQuickAllocate}
            onCategoryChange={(id, category) => setResourceCategory([id], category)}
            onRefresh={() => fetchData(true)}
          />
        </div>
      </div>

      <BenchDrawer
        open={drawerOpen}
        resource={selectedResource}
        onClose={() => setDrawerOpen(false)}
        onAllocate={(resource) => handleAllocate(resource)}
        onMoveToPool={(resource) => handleMoveToPool(resource)}
      />

      <AllocateModal
        open={allocateTargets.length > 0}
        resources={allocateTargets}
        onClose={() => setAllocateTargets([])}
        onSubmit={applyAllocation}
      />

      <QuickAllocateModal
        open={Boolean(quickAllocateTarget)}
        resource={quickAllocateTarget}
        onClose={() => setQuickAllocateTarget(null)}
        onRefresh={fetchData}
      />

      <MoveToPoolModal
        open={moveToPoolTargets.length > 0}
        resources={moveToPoolTargets}
        onClose={() => setMoveToPoolTargets([])}
        onSubmit={applyMoveToPool}
      />
    </div>
  );
};

export default BenchPage;
