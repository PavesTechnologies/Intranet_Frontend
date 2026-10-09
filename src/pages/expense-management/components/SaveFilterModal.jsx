import React, { useState, useEffect } from "react";
import { X, Loader, AlertCircle, Check } from "lucide-react";
import { useCreateSavedFilter, useUpdateSavedFilter } from "../hooks/useSavedFilters";

/**
 * Modal to save current filter state as a preset
 * Spec: EP12-S3 - Save and reuse filter combinations
 *
 * Props:
 * - isOpen: boolean to control modal visibility
 * - onClose: callback when modal closes
 * - filters: current filter state to save
 * - employeeId: current user's employee ID
 * - existingFilterId: if provided, updates existing filter instead of creating new
 */
export const SaveFilterModal = ({
  isOpen = false,
  onClose = () => {},
  filters = {},
  employeeId = "",
  existingFilterId = null,
}) => {
  const [filterName, setFilterName] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const createMutation = useCreateSavedFilter();
  const updateMutation = useUpdateSavedFilter();

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const isSuccess = createMutation.isSuccess || updateMutation.isSuccess;

  useEffect(() => {
    if (isSuccess) {
      setSuccessMessage(existingFilterId ? "Filter updated successfully" : "Filter saved successfully");
      setFilterName("");
      setError("");
      setTimeout(() => {
        setSuccessMessage("");
        onClose();
      }, 1500);
    }
  }, [isSuccess, onClose, existingFilterId]);

  const handleSave = async () => {
    if (!filterName.trim()) {
      setError("Filter name is required");
      return;
    }

    if (filterName.length > 255) {
      setError("Filter name must be 255 characters or less");
      return;
    }

    setError("");

    try {
      if (existingFilterId) {
        await updateMutation.mutateAsync({
          filterId: existingFilterId,
          filterName: filterName.trim(),
          employeeId,
          filterJson: filters,
        });
      } else {
        await createMutation.mutateAsync({
          filterName: filterName.trim(),
          employeeId,
          filterJson: filters,
        });
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save filter");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !isLoading && filterName.trim()) {
      handleSave();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {existingFilterId ? "Update Filter" : "Save Filter"}
          </h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
            aria-label="Close"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter Name
          </label>
          <input
            type="text"
            value={filterName}
            onChange={(e) => {
              setFilterName(e.target.value);
              setError("");
            }}
            onKeyPress={handleKeyPress}
            placeholder="e.g., High-value expenses, Pending approvals, Q4 2026"
            maxLength={255}
            disabled={isLoading}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            autoFocus
          />
          <p className="mt-1 text-xs text-gray-500">
            {filterName.length}/255 characters
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex gap-2">
            <AlertCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex gap-2">
            <Check size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-700">{successMessage}</p>
          </div>
        )}

        {/* Current Filters Summary */}
        <div className="mb-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs font-medium text-gray-700 mb-2">Active Filters:</p>
          {Object.keys(filters).length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {Object.entries(filters).map(([key, value]) => {
                if (!value || value === "") return null;
                const displayValue = typeof value === "boolean" ? (value ? "Billable" : "Non-billable") : value;
                return (
                  <span key={key} className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    {displayValue}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-600">No active filters</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || !filterName.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading && <Loader size={16} className="animate-spin" />}
            {existingFilterId ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};
