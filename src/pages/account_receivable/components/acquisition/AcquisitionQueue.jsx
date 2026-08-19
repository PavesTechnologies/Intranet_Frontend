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
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Panel Header */}
      <div className="space-y-3 border-b border-slate-100 bg-slate-50/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-slate-900">
              Acquisition Queue
            </h2>
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium text-slate-500">
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
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="no-scrollbar flex items-center gap-1 overflow-x-auto pb-1 text-xs">
          {tabs.map((tab) => {
            const isActive = selectedStatusTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setSelectedStatusTab(tab.key)}
                className={`inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-[#0A0082] text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
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
      <div className="max-h-[640px] flex-1 space-y-1.5 overflow-y-auto p-2">
        {loading ? (
          <div className="space-y-2 p-8 text-center text-xs text-slate-400">
            <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            <p>Loading projects...</p>
          </div>
        ) : filteredConfigs.length === 0 ? (
          <div className="space-y-1 p-8 text-center text-xs text-slate-400">
            <p className="font-semibold text-slate-600">No matching projects</p>
            <p>Adjust your search or status filter.</p>
          </div>
        ) : (
          filteredConfigs.map((cfg) => {
            const isSelected = selectedConfigId === cfg.projectId;

            return (
              <div
                key={cfg.projectId}
                onClick={() => onSelectConfig(cfg)}
                className={`group relative cursor-pointer rounded-xl border p-3.5 transition-all ${
                  isSelected
                    ? "border-indigo-300 bg-indigo-50/60 shadow-sm ring-1 ring-indigo-200"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {/* Active Indicator Strip */}
                {isSelected && (
                  <span className="absolute bottom-3 left-0 top-3 w-1 rounded-r-full bg-indigo-600" />
                )}

                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900 transition-colors group-hover:text-indigo-900">
                        {cfg.projectName}
                      </span>
                      <span className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                        {cfg.projectCode}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-500">{cfg.client}</p>
                  </div>
                  <ChevronRight
                    className={`h-4 w-4 flex-shrink-0 transition-transform ${
                      isSelected ? "translate-x-0.5 text-indigo-600" : "text-slate-300 group-hover:text-slate-500"
                    }`}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    <span className="font-mono text-[11px]">{cfg.billingPeriod}</span>
                  </div>
                  <StatusBadge label={cfg.billingStatus} size="sm" />
                </div>

                {/* Sub-label tags */}
                <div className="mt-2 flex items-center gap-2 text-[11px]">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                    {BILLING_TYPE_LABELS[cfg.billingType] || cfg.billingType}
                  </span>
                  {cfg.snapshotNumber && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono font-semibold text-emerald-700">
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
