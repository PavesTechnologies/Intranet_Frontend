import React, { useState } from "react";
import { Trash2, Download, AlertCircle, Loader, Edit2 } from "lucide-react";
import { useSavedFilters, useDeleteSavedFilter } from "../hooks/useSavedFilters";

/**
 * Component to display list of saved filter presets
 * Spec: EP12-S3 - Save and reuse filter combinations
 *
 * Props:
 * - onLoadFilter: callback(filterJson) when user loads a saved filter
 * - onEditFilter: callback(filterId, filterName, filterJson) when user edits filter
 */
export const SavedFiltersList = ({
  onLoadFilter = () => {},
  onEditFilter = () => {},
}) => {
  const { filters, isLoading, error, refetch } = useSavedFilters();
  const deleteFilterMutation = useDeleteSavedFilter();
  const [expandedId, setExpandedId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const handleLoadFilter = (filter) => {
    try {
      const filterJson = typeof filter.filterJson === "string"
        ? JSON.parse(filter.filterJson)
        : filter.filterJson;
      onLoadFilter(filterJson);
    } catch (err) {
      console.error("Failed to parse saved filter:", err);
    }
  };

  const handleDeleteFilter = async (filterId) => {
    try {
      await deleteFilterMutation.mutateAsync(filterId);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Failed to delete filter:", err);
    }
  };

  const handleEditFilter = (filter) => {
    try {
      const filterJson = typeof filter.filterJson === "string"
        ? JSON.parse(filter.filterJson)
        : filter.filterJson;
      onEditFilter(filter.filterId, filter.filterName, filterJson);
    } catch (err) {
      console.error("Failed to parse saved filter:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="h-6 w-6 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600 text-sm">Loading saved filters...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex gap-2">
        <AlertCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-rose-900">Failed to load saved filters</p>
          <button
            onClick={() => refetch()}
            className="text-xs text-rose-600 hover:text-rose-800 font-medium mt-1"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (filters.length === 0) {
    return (
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
        <p className="text-sm text-gray-600 mb-2">No saved filters yet</p>
        <p className="text-xs text-gray-500">Create and save your first filter to reuse it later</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        Saved Filters ({filters.length})
      </h3>

      {filters.map((filter) => (
        <div
          key={filter.filterId}
          className="border border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow"
        >
          {/* Header */}
          <button
            onClick={() => setExpandedId(expandedId === filter.filterId ? null : filter.filterId)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 text-left"
          >
            <div className="flex-1">
              <p className="font-medium text-gray-900 text-sm">{filter.filterName}</p>
              <p className="text-xs text-gray-500 mt-1">
                Created {new Date(filter.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLoadFilter(filter);
                }}
                className="p-2 hover:bg-blue-50 rounded text-blue-600 hover:text-blue-700 transition-colors"
                title="Load this filter"
              >
                <Download size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditFilter(filter);
                }}
                className="p-2 hover:bg-amber-50 rounded text-amber-600 hover:text-amber-700 transition-colors"
                title="Edit this filter"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirmId(filter.filterId);
                }}
                className="p-2 hover:bg-rose-50 rounded text-rose-600 hover:text-rose-700 transition-colors"
                title="Delete this filter"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </button>

          {/* Delete Confirmation */}
          {deleteConfirmId === filter.filterId && (
            <div className="px-4 py-3 bg-rose-50 border-t border-gray-200 flex gap-2 items-start">
              <AlertCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-rose-900">Delete this filter permanently?</p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleDeleteFilter(filter.filterId)}
                    disabled={deleteFilterMutation.isPending}
                    className="px-3 py-1 bg-rose-600 text-white text-xs rounded hover:bg-rose-700 disabled:opacity-50 font-medium"
                  >
                    {deleteFilterMutation.isPending ? "Deleting..." : "Delete"}
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    disabled={deleteFilterMutation.isPending}
                    className="px-3 py-1 border border-rose-200 text-rose-700 text-xs rounded hover:bg-rose-50 disabled:opacity-50 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Details (expanded) */}
          {expandedId === filter.filterId && !deleteConfirmId && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs">
              <p className="font-medium text-gray-700 mb-2">Filter Criteria:</p>
              {(() => {
                try {
                  const filterJson = typeof filter.filterJson === "string"
                    ? JSON.parse(filter.filterJson)
                    : filter.filterJson;
                  if (Object.keys(filterJson).length === 0) {
                    return <p className="text-gray-600">No filters applied</p>;
                  }
                  return (
                    <div className="space-y-1">
                      {Object.entries(filterJson).map(([key, value]) => {
                        if (!value || value === "") return null;
                        const displayValue = typeof value === "boolean"
                          ? (value ? "Billable" : "Non-billable")
                          : value;
                        return (
                          <div key={key} className="text-gray-700">
                            <span className="font-medium capitalize">{key}:</span> {displayValue}
                          </div>
                        );
                      })}
                    </div>
                  );
                } catch {
                  return <p className="text-gray-600">Invalid filter data</p>;
                }
              })()}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
