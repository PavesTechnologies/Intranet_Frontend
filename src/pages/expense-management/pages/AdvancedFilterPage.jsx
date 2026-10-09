import React, { useState, useEffect, useMemo } from "react";
import { AlertCircle, Loader, ChevronLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Pagination from "@/components/Pagination/pagination";
import Button from "@/components/Button/Button";
import { FilterPanel } from "../components/FilterPanel";
import { useAdvancedFilter } from "../hooks/useAdvancedFilter";

/**
 * EP12-S2: Advanced Multi-Criteria Filter Page
 *
 * Features:
 * - Collapsible filter sidebar with multiple filter options
 * - Active-filter chips with easy removal
 * - Reactive results update on filter change
 * - URL-encoded filters for shareable/bookmarkable views
 * - Server-side filtering with role-based scope enforcement
 * - Amount range validation
 * - Empty result sets for conflicting filters
 */
export default function AdvancedFilterPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(0);
  const [filtersPanelCollapsed, setFiltersPanelCollapsed] = useState(false);

  // Initialize filters from URL or empty
  const [filters, setFilters] = useState(() => {
    const urlFilters = {};
    if (searchParams.has("status")) urlFilters.status = searchParams.get("status");
    if (searchParams.has("dateFrom")) urlFilters.dateFrom = searchParams.get("dateFrom");
    if (searchParams.has("dateTo")) urlFilters.dateTo = searchParams.get("dateTo");
    if (searchParams.has("category")) urlFilters.category = searchParams.get("category");
    if (searchParams.has("costCenter")) urlFilters.costCenter = searchParams.get("costCenter");
    if (searchParams.has("amountMin")) urlFilters.amountMin = parseFloat(searchParams.get("amountMin"));
    if (searchParams.has("amountMax")) urlFilters.amountMax = parseFloat(searchParams.get("amountMax"));
    if (searchParams.has("employeeId")) urlFilters.employeeId = searchParams.get("employeeId");
    if (searchParams.has("billable")) urlFilters.billable = searchParams.get("billable") === "true";
    return urlFilters;
  });

  // Fetch results based on filters
  const { results, totalElements, totalPages, isLoading, error } = useAdvancedFilter(filters, page, 20);

  // Update URL when filters change
  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    setPage(0); // Reset to first page when filters change
  };

  const handleApplyFilters = (appliedFilters) => {
    const params = new URLSearchParams();
    Object.entries(appliedFilters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        params.set(key, value);
      }
    });
    setSearchParams(params);
    setPage(0);
  };

  const handleResetFilters = () => {
    setFilters({});
    setSearchParams({});
    setPage(0);
  };

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter((v) => v !== null && v !== undefined && v !== "").length,
    [filters]
  );

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-gray-200 bg-white">
        <Breadcrumb
          items={[
            { label: "Expense Management", to: "/expense-management/dashboard" },
            { label: "Advanced Filters" },
          ]}
        />

        <div className="mt-4 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Advanced Filters</h1>
            <p className="text-gray-600">Filter expense reports by multiple criteria to find exactly what you need</p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/expense-management/dashboard")}
            className="ml-4"
          >
            <ChevronLeft size={16} />
            Back
          </Button>
        </div>
      </div>

      {/* Content: Filter Panel + Results */}
      <div className="flex flex-1 overflow-hidden">
        {/* Filter Panel */}
        <FilterPanel
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onApplyFilters={handleApplyFilters}
          onResetFilters={handleResetFilters}
          isCollapsed={filtersPanelCollapsed}
          onCollapsedChange={setFiltersPanelCollapsed}
        />

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Filter Summary */}
          {activeFilterCount > 0 && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>{activeFilterCount}</strong> filter{activeFilterCount !== 1 ? "s" : ""} applied •{" "}
                <button
                  onClick={handleResetFilters}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear all
                </button>
              </p>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-12">
              <Loader className="h-6 w-6 animate-spin text-blue-500" />
              <span className="ml-3 text-gray-600">Loading results...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 py-8 text-center">
              <AlertCircle className="h-5 w-5 text-rose-500" />
              <p className="text-sm text-rose-700">
                {error?.response?.data?.message || error?.message || "Failed to load results"}
              </p>
            </div>
          )}

          {/* No Filters Applied */}
          {activeFilterCount === 0 && !isLoading && !error && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 py-12 text-center">
              <AlertCircle className="h-6 w-6 text-gray-400" />
              <p className="text-sm text-gray-600">No filters applied</p>
              <p className="text-xs text-gray-500">Use the filter panel to narrow down your results</p>
            </div>
          )}

          {/* Zero Results State */}
          {activeFilterCount > 0 && totalElements === 0 && !isLoading && !error && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 py-12 text-center">
              <AlertCircle className="h-6 w-6 text-amber-500" />
              <p className="text-sm font-medium text-amber-900">No results found</p>
              <p className="text-xs text-amber-700 max-w-md">
                Try adjusting your filter criteria. You may have reached the limits of your access scope.
              </p>
            </div>
          )}

          {/* Results Table */}
          {activeFilterCount > 0 && totalElements > 0 && !isLoading && !error && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <p className="text-sm font-medium text-gray-700">
                  Found {totalElements} result{totalElements !== 1 ? "s" : ""}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                    <tr>
                      <th className="px-6 py-3">Report</th>
                      <th className="px-6 py-3">Employee</th>
                      <th className="px-6 py-3">Merchant</th>
                      <th className="px-6 py-3">Category</th>
                      <th className="px-6 py-3">Amount</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {results.map((result) => (
                      <tr key={result.reportId} className="hover:bg-gray-50 cursor-pointer">
                        <td className="px-6 py-3 font-medium text-blue-600">{result.reportNumber}</td>
                        <td className="px-6 py-3 text-gray-900">{result.employeeName}</td>
                        <td className="px-6 py-3 text-gray-600">{result.merchant || "—"}</td>
                        <td className="px-6 py-3">
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                            {result.category}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-gray-900 font-medium">${result.amount?.toFixed(2)}</td>
                        <td className="px-6 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              result.status === "APPROVED"
                                ? "bg-emerald-100 text-emerald-800"
                                : result.status === "REJECTED"
                                ? "bg-rose-100 text-rose-800"
                                : result.status === "SUBMITTED"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {result.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-gray-600 text-xs">
                          {new Date(result.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-center">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
