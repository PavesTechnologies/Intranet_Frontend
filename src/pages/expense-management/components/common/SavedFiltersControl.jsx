import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Trash2 } from "lucide-react";
import Button from "@/components/Button/Button";
import FormSelect from "@/components/forms/FormSelect";
import FormInput from "@/components/forms/FormInput";
import Modal from "@/components/Modal/modal";
import ConfirmationModal from "@/components/confirmation_modal/ConfirmationModal";
import { showStatusToast } from "@/components/toastfy/toast";
import { savedFiltersApi } from "@/pages/expense-management/api/savedFiltersApi";

const SAVED_FILTERS_KEY = ["xmsSavedFilters"];
// The backend column holds at most 255 characters of JSON.
const MAX_FILTER_JSON = 255;

// Empty values are dropped so { status: "" } and {} count as the same filter.
const normalize = (filters) =>
  Object.fromEntries(Object.entries(filters || {}).filter(([, v]) => v !== "" && v !== null && v !== undefined));

const sameFilters = (a, b) => {
  const left = normalize(a);
  const right = normalize(b);
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every((k) => String(left[k]) === String(right[k]));
};

const parse = (row) => {
  try {
    const json = JSON.parse(row.filterJson || "{}");
    return json && typeof json === "object" ? json : null;
  } catch {
    return null;
  }
};

/**
 * Named, per-user filter presets for a list page. `scope` keeps each page's presets separate;
 * `filters` is the page's current filter state and `onApply` receives a saved one back.
 */
export default function SavedFiltersControl({ scope, filters, onApply, className = "" }) {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({
    queryKey: SAVED_FILTERS_KEY,
    queryFn: () => savedFiltersApi.getAll().then((res) => res.data?.data || []),
    staleTime: 5 * 60_000,
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: SAVED_FILTERS_KEY });
  const createFilter = useMutation({ mutationFn: (payload) => savedFiltersApi.create(payload), onSuccess: invalidate });
  const deleteFilter = useMutation({ mutationFn: (id) => savedFiltersApi.delete(id), onSuccess: invalidate });

  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [toDelete, setToDelete] = useState(null);

  const presets = useMemo(
    () =>
      rows
        .map((row) => ({ row, json: parse(row) }))
        .filter(({ json }) => json?.scope === scope)
        .map(({ row, json }) => ({ id: row.filterId, name: row.filterName, filters: json.filters || {} })),
    [rows, scope]
  );

  // The dropdown shows whichever preset matches the current filters, so it never claims a preset
  // is applied after the user has changed a filter by hand.
  const active = presets.find((p) => sameFilters(p.filters, filters)) || null;
  const hasFilters = Object.keys(normalize(filters)).length > 0;

  const options = [
    { label: presets.length ? "Choose a saved filter" : "No saved filters yet", value: "" },
    ...presets.map((p) => ({ label: p.name, value: p.id })),
  ];

  const handleSelect = (e) => {
    const preset = presets.find((p) => p.id === e.target.value);
    if (preset) onApply(preset.filters);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("Give this filter a name.");
      return;
    }
    const filterJson = JSON.stringify({ scope, filters: normalize(filters) });
    if (filterJson.length > MAX_FILTER_JSON) {
      setNameError("These filters are too long to save - shorten the search text.");
      return;
    }
    createFilter.mutate(
      { filterName: trimmed, filterJson },
      {
        onSuccess: () => {
          showStatusToast(`Saved "${trimmed}"`, "success");
          setIsSaveOpen(false);
        },
        onError: (err) => setNameError(err.response?.data?.message || "Couldn't save this filter."),
      }
    );
  };

  const handleDeleteConfirm = () => {
    deleteFilter.mutate(toDelete.id, {
      onSuccess: () => {
        showStatusToast(`Deleted "${toDelete.name}"`, "success");
        setToDelete(null);
      },
      onError: (err) => {
        showStatusToast(err.response?.data?.message || "Couldn't delete this filter.", "error");
        setToDelete(null);
      },
    });
  };

  return (
    <div className={className}>
      <div className="flex items-end gap-2">
        <FormSelect
          label="Saved Filters"
          name="savedFilter"
          value={active?.id || ""}
          onChange={handleSelect}
          options={options}
          className="min-w-0 flex-1 [&>label]:text-xs [&>label]:mb-1"
          buttonClassName="!py-1.5 !px-3 !text-xs"
        />
        {active ? (
          <Button
            type="button"
            variant="link"
            size="icon"
            title={`Delete "${active.name}"`}
            aria-label={`Delete saved filter ${active.name}`}
            className="h-10 w-10 shrink-0 p-0 text-red-600 hover:bg-red-50 rounded-md"
            onClick={() => setToDelete(active)}
          >
            <Trash2 size={15} />
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="small"
            title={hasFilters ? "Save the current filters" : "Set a search or filter first"}
            disabled={!hasFilters}
            className="h-10 shrink-0 !text-xs"
            onClick={() => {
              setName("");
              setNameError("");
              setIsSaveOpen(true);
            }}
          >
            <Bookmark size={14} />
            Save
          </Button>
        )}
      </div>

      <Modal
        isOpen={isSaveOpen}
        onClose={() => setIsSaveOpen(false)}
        title="Save Filter"
        subtitle="Name the current search and filters so you can apply them again later."
        size="md"
        closeOnBackdrop={false}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsSaveOpen(false)} disabled={createFilter.isPending}>
              Cancel
            </Button>
            <Button type="submit" form="saved-filter-form" variant="primary" loading={createFilter.isPending} loadingText="Saving...">
              Save
            </Button>
          </div>
        }
      >
        <form id="saved-filter-form" onSubmit={handleSave}>
          <FormInput
            label="Filter Name"
            name="filterName"
            placeholder="e.g. Awaiting correction"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError("");
            }}
            maxLength={100}
            requiredMark
            error={nameError}
          />
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={!!toDelete}
        title="Delete Saved Filter"
        message={`Delete the saved filter "${toDelete?.name}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setToDelete(null)}
        isLoading={deleteFilter.isPending}
        variant="danger"
      />
    </div>
  );
}
