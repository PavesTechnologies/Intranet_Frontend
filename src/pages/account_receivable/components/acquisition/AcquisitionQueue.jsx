import { useState, useMemo } from "react";
import { Search, Filter, Calendar, ChevronRight, Layers, CheckCircle2, Clock } from "lucide-react";
import StatusBadge from "../../../../components/status/statusbadge";

const BILLING_TYPE_LABELS = {
  TIME_MATERIAL: "Time & Material",
  FIXED_PRICE: "Fixed Price",
  MILESTONE: "Milestone",
  RECURRING: "Recurring",
};

export default function AcquisitionQueue({
  configs = [],
  selectedConfigId = null,
  onSelectConfig,
  loading = false,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusTab, setSelectedStatusTab] = useState("ALL");

  const filteredConfigs = useMemo(() => {
    return configs.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.projectName.toLowerCase().includes(q) ||
        c.projectCode.toLowerCase().includes(q) ||
        c.client.toLowerCase().includes(q);

      const status = c.billingStatus?.toUpperCase();
      let matchesStatus = true;

      if (selectedStatusTab === "NOT_ACQUIRED") {
        matchesStatus = status === "NOT_ACQUIRED" || status === "NOT ACQUIRED";
      } else if (selectedStatusTab === "READY") {
        matchesStatus = status === "READY" || Boolean(c.snapshotNumber);
      } else if (selectedStatusTab === "PARTIALLY_READY") {
        matchesStatus = status === "PARTIALLY_READY" || status === "PARTIALLY READY";
      } else if (selectedStatusTab === "ALREADY_BILLED") {
        matchesStatus = status === "ALREADY_BILLED" || status === "ALREADY BILLED";
      }

      return matchesSearch && matchesStatus;
    });
  }, [configs, searchQuery, selectedStatusTab]);

  const tabs = [
    { key: "ALL", label: "All", count: configs.length },
    {
      key: "NOT_ACQUIRED",
      label: "Pending",
      count: configs.filter((c) => c.billingStatus === "NOT_ACQUIRED" || c.billingStatus === "Not Acquired").length,
    },
    {
      key: "READY",
      label: "Ready",
      count: configs.filter((c) => c.billingStatus === "READY" || c.billingStatus === "Ready" || Boolean(c.snapshotNumber)).length,
    },
    {
      key: "ALREADY_BILLED",
      label: "Billed",
      count: configs.filter((c) => c.billingStatus === "ALREADY_BILLED" || c.billingStatus === "Already Billed").length,
    },
  ];

  return (
    <div className="flex flex-col h-full rounded-2xl bg-white border border-slate-200/90 shadow-sm overflow-hidden">
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-600" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              Acquisition Queue
            </h2>
          </div>
          <span className="text-[11px] font-bold text-slate-500 font-mono bg-slate-200/60 px-2 py-0.5 rounded-full">
            {filteredConfigs.length} / {configs.length}
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search project or client..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-xs">
          {tabs.map((tab) => {
            const isActive = selectedStatusTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setSelectedStatusTab(tab.key)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {tab.label}
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Queue Item List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1.5 max-h-[640px]">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 space-y-2">
            <div className="animate-spin h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto" />
            <p>Loading projects...</p>
          </div>
        ) : filteredConfigs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-600">No matching projects</p>
            <p className="text-[11px]">Adjust your search or status filter.</p>
          </div>
        ) : (
          filteredConfigs.map((cfg) => {
            const isSelected = selectedConfigId === cfg.projectId;
            const isReady = cfg.billingStatus === "READY" || cfg.billingStatus === "Ready" || Boolean(cfg.snapshotNumber);

            return (
              <div
                key={cfg.projectId}
                onClick={() => onSelectConfig(cfg)}
                className={`group relative rounded-xl p-3.5 transition-all cursor-pointer border ${
                  isSelected
                    ? "bg-indigo-50/80 border-indigo-500 shadow-sm ring-1 ring-indigo-400/40"
                    : "bg-white border-slate-200/70 hover:border-slate-300 hover:bg-slate-50/80"
                }`}
              >
                {/* Active Indicator Strip */}
                {isSelected && (
                  <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-indigo-600" />
                )}

                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 group-hover:text-indigo-900 transition-colors">
                        {cfg.projectName}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                        {cfg.projectCode}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-500">{cfg.client}</p>
                  </div>
                  <ChevronRight
                    className={`h-4 w-4 flex-shrink-0 transition-transform ${
                      isSelected ? "text-indigo-600 translate-x-0.5" : "text-slate-300 group-hover:text-slate-500"
                    }`}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    <span className="font-mono text-[10px]">{cfg.billingPeriod}</span>
                  </div>
                  <StatusBadge label={cfg.billingStatus} size="xs" />
                </div>

                {/* Sub-label tags */}
                <div className="mt-2 flex items-center gap-2 text-[10px]">
                  <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                    {BILLING_TYPE_LABELS[cfg.billingType] || cfg.billingType}
                  </span>
                  {cfg.snapshotNumber && (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-mono bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-bold">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      {cfg.snapshotNumber}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
