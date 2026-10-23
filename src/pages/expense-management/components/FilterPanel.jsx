import React, { useState } from "react";
import { ChevronDown, X } from "lucide-react";

/**
 * Advanced Filter Panel Component
 * Spec: EP12-S2 - Collapsible filter sidebar with active-filter chips
 *
 * Features:
 * - Collapsible filter sections
 * - Active-filter chips with remove button
 * - Apply/Reset actions
 * - URL-encoded filter combinations for shareable views
 */
export const FilterPanel = ({
  filters = {},
  onFiltersChange = () => {},
  onApplyFilters = () => {},
  onResetFilters = () => {},
  isCollapsed = false,
  onCollapsedChange = () => {},
}) => {
  const [expandedSections, setExpandedSections] = useState({
    dateRange: true,
    amountRange: true,
    category: true,
  });

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleFilterChange = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const removeFilter = (key) => {
    const updatedFilters = { ...filters };
    delete updatedFilters[key];
    onFiltersChange(updatedFilters);
    onApplyFilters(updatedFilters);
  };

  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== null && v !== undefined && v !== ""
  ).length;

  return (
    <div className="bg-gray-50 border-r border-gray-200 transition-all duration-300" style={{ width: isCollapsed ? "0" : "320px" }}>
      {!isCollapsed && (
        <div className="p-4 overflow-y-auto max-h-screen">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            <button
              onClick={() => onCollapsedChange(true)}
              className="p-1 hover:bg-gray-200 rounded"
              title="Collapse filters"
            >
              <ChevronDown size={20} className="text-gray-600" />
            </button>
          </div>

          {/* Active Filters Chips */}
          {activeFilterCount > 0 && (
            <div className="mb-4 pb-4 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Active Filters ({activeFilterCount})</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(filters).map(([key, value]) => {
                  if (!value || value === "") return null;
                  const displayValue = typeof value === "boolean" ? (value ? "Billable" : "Non-billable") : value;
                  return (
                    <div
                      key={key}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      <span>{displayValue}</span>
                      <button
                        onClick={() => removeFilter(key)}
                        className="hover:bg-blue-200 rounded-full p-0.5"
                        title="Remove filter"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Status Filter */}
          <FilterSection
            title="Status"
            expanded={true}
            onToggle={() => {}}
          >
            <select
              value={filters.status || ""}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="REIMBURSED">Reimbursed</option>
            </select>
          </FilterSection>

          {/* Date Range Filter */}
          <FilterSection
            title="Date Range"
            expanded={expandedSections.dateRange}
            onToggle={() => toggleSection("dateRange")}
          >
            {expandedSections.dateRange && (
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium text-gray-700">From</label>
                  <input
                    type="date"
                    value={filters.dateFrom || ""}
                    onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">To</label>
                  <input
                    type="date"
                    value={filters.dateTo || ""}
                    onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </FilterSection>

          {/* Amount Range Filter */}
          <FilterSection
            title="Amount Range"
            expanded={expandedSections.amountRange}
            onToggle={() => toggleSection("amountRange")}
          >
            {expandedSections.amountRange && (
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium text-gray-700">Min Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={filters.amountMin ?? ""}
                    onChange={(e) =>
                      handleFilterChange("amountMin", e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Max Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={filters.amountMax ?? ""}
                    onChange={(e) =>
                      handleFilterChange("amountMax", e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}
          </FilterSection>

          {/* Category Filter */}
          <FilterSection
            title="Category"
            expanded={expandedSections.category}
            onToggle={() => toggleSection("category")}
          >
            {expandedSections.category && (
              <input
                type="text"
                value={filters.category || ""}
                onChange={(e) => handleFilterChange("category", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search category..."
              />
            )}
          </FilterSection>

          {/* Cost Center Filter */}
          <FilterSection
            title="Cost Center"
            expanded={false}
            onToggle={() => {}}
          >
            <input
              type="text"
              value={filters.costCenter || ""}
              onChange={(e) => handleFilterChange("costCenter", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search cost center..."
            />
          </FilterSection>

          {/* Billable Filter */}
          <FilterSection
            title="Billable"
            expanded={false}
            onToggle={() => {}}
          >
            <select
              value={filters.billable === undefined ? "" : filters.billable}
              onChange={(e) => {
                if (e.target.value === "") {
                  handleFilterChange("billable", undefined);
                } else {
                  handleFilterChange("billable", e.target.value === "true");
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="true">Billable</option>
              <option value="false">Non-billable</option>
            </select>
          </FilterSection>

          {/* Action Buttons */}
          <div className="mt-6 pt-4 border-t border-gray-200 space-y-2">
            <button
              onClick={() => onApplyFilters(filters)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition-colors"
            >
              Apply Filters
            </button>
            <button
              onClick={() => {
                onResetFilters();
                onFiltersChange({});
              }}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded font-medium hover:bg-gray-100 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Collapsed State */}
      {isCollapsed && (
        <button
          onClick={() => onCollapsedChange(false)}
          className="p-2 hover:bg-gray-200 rounded"
          title="Expand filters"
        >
          <ChevronDown size={20} className="text-gray-600 transform rotate-180" />
        </button>
      )}
    </div>
  );
};

/**
 * Reusable filter section component
 */
const FilterSection = ({ title, expanded, onToggle, children }) => {
  return (
    <div className="mb-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-2 px-2 hover:bg-gray-100 rounded font-medium text-gray-800"
      >
        <span className="text-sm">{title}</span>
        <ChevronDown
          size={16}
          className={`text-gray-600 transition-transform ${expanded ? "transform rotate-180" : ""}`}
        />
      </button>
      {expanded && <div className="mt-2 space-y-2">{children}</div>}
    </div>
  );
};
