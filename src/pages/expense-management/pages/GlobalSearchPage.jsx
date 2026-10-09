import React, { useState, useEffect } from "react";
import { Search, AlertCircle, Loader } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Button from "@/components/Button/Button";
import Pagination from "@/components/Pagination/pagination";
import { useGlobalSearch } from "../hooks/useGlobalSearch";
import { useClientPagination } from "../components/common/pagination";

/**
 * EP12-S1: Global Expense Search Page
 *
 * Features:
 * - Free-text search across reports and line items
 * - Results ranked by relevance (with relevance indicator)
 * - Status badge
 * - Role-based scope enforcement (server-side)
 * - Pagination
 * - Empty state with search suggestions
 */
export default function GlobalSearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(0);

  // Debounce search input (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(0); // Reset to first page on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { results, totalElements, totalPages, isLoading, error } = useGlobalSearch(
    debouncedQuery ? page : 0,
    20,
    debouncedQuery
  );

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setDebouncedQuery("");
    setPage(0);
  };

  return (
    <div className="p-4 sm:p-6">
      <Breadcrumb
        items={[
          { label: "Expense Management", to: "/expense-management/dashboard" },
          { label: "Global Search" },
        ]}
      />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Expense Search</h1>
        <p className="text-gray-600">Search across all expense reports and line items you have access to</p>
      </div>

      {/* Search Bar */}
      <div className="mb-8 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by report number, employee name, merchant, category..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {searchQuery && (
            <Button variant="outline" onClick={handleClearSearch}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-12">
          <Loader className="h-6 w-6 animate-spin text-blue-500" />
          <span className="ml-3 text-gray-600">Searching...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 py-8 text-center">
          <AlertCircle className="h-5 w-5 text-rose-500" />
          <p className="text-sm text-rose-700">
            {error?.message || "Failed to perform search"}
          </p>
        </div>
      )}

      {/* No Search Entered */}
      {!debouncedQuery && !isLoading && !error && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 py-12 text-center">
          <Search className="h-6 w-6 text-gray-400" />
          <p className="text-sm text-gray-600">Enter a search query to find expense reports</p>
          <p className="text-xs text-gray-500">Search by report number, employee name, merchant, or category</p>
        </div>
      )}

      {/* Zero Results State */}
      {debouncedQuery && totalElements === 0 && !isLoading && !error && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 py-12 text-center">
          <AlertCircle className="h-6 w-6 text-amber-500" />
          <p className="text-sm font-medium text-amber-900">No results found</p>
          <p className="text-xs text-amber-700 max-w-md">
            Try different keywords or check if you have access to those reports.
            Search scope is limited to reports you're authorized to view.
          </p>
        </div>
      )}

      {/* Results Table */}
      {debouncedQuery && totalElements > 0 && !isLoading && !error && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <p className="text-sm font-medium text-gray-700">
              Found {totalElements} result{totalElements !== 1 ? "s" : ""}
            </p>
          </div>

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
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      result.status === "APPROVED"
                        ? "bg-emerald-100 text-emerald-800"
                        : result.status === "PENDING"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-gray-100 text-gray-800"
                    }`}>
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
  );
}
