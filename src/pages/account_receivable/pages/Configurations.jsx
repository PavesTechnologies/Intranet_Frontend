import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Search, 
  RefreshCw, 
  Eye, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  ChevronLeft, 
  ChevronRight,
  Info 
} from "lucide-react";

import PageHeader from "../../../components/ui/PageHeader";
import { PageCard } from "../../../components/Cards/PageCard";
import Button from "../../../components/Button/Button";
import FormInput from "../../../components/forms/FormInput";
import FormSelect from "../../../components/forms/FormSelect";
import ARTable from "../components/common/ARTable";
import StatusBadge from "../../../components/status/statusbadge";
import Modal from "../../../components/Modal/modal";
import ConfirmationModal from "../../../components/confirmation_modal/ConfirmationModal";
import ActionMenu from "../components/common/ActionMenu";
import { showStatusToast } from "../../../components/toastfy/toast";

const LOCAL_STORAGE_PREFIX = "ar_configurations_";

// Tax Region, Payment Terms, Billing Frequency, and Billing Type are now
// fully API-driven, dedicated pages under the Master Data Hub
// (see src/pages/account_receivable/pages/master-data/). Proportion Rule and
// Currency have no backend yet, so this page remains their local, mock/
// localStorage-backed tool until real endpoints exist for them — per
// instruction, no mock data or invented endpoints are added for them here.
const MASTERS = [
  { id: "proportion_rule", label: "Proportion Rule" },
  { id: "currency", label: "Currency Master" },
];

const MASTER_SCHEMAS = {
  proportion_rule: {
    title: "Proportion Rule",
    fields: [
      { name: "ruleCode", label: "Rule Code", type: "text", required: true },
      { name: "ruleName", label: "Rule Name", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea", required: false },
      { name: "proportion", label: "Proportion/Percentage", type: "text", required: true },
      { name: "status", label: "Status", type: "select", options: ["ACTIVE", "INACTIVE"], required: true },
      { name: "effectiveFrom", label: "Effective From", type: "date", required: true },
      { name: "effectiveTo", label: "Effective To", type: "date", required: false },
    ],
    defaultData: {
      ruleCode: "",
      ruleName: "",
      description: "",
      proportion: "",
      status: "ACTIVE",
      effectiveFrom: "",
      effectiveTo: "",
    }
  },
  currency: {
    title: "Currency Master",
    fields: [
      { name: "currencyCode", label: "Currency Code", type: "text", required: true },
      { name: "currencyName", label: "Currency Name", type: "text", required: true },
      { name: "currencySymbol", label: "Currency Symbol", type: "text", required: true },
      { name: "decimalPrecision", label: "Decimal Precision", type: "number", required: true },
      { name: "status", label: "Status", type: "select", options: ["ACTIVE", "INACTIVE"], required: true },
    ],
    defaultData: {
      currencyCode: "",
      currencyName: "",
      currencySymbol: "",
      decimalPrecision: "2",
      status: "ACTIVE",
    }
  }
};

const SEED_DATA = {
  proportion_rule: [
    {
      id: "pr-1",
      ruleCode: "PR001",
      ruleName: "Equal Split",
      description: "Split billing equally among partners",
      proportion: "50%",
      status: "ACTIVE",
      effectiveFrom: "2026-04-01",
      effectiveTo: "",
    },
    {
      id: "pr-2",
      ruleCode: "PR002",
      ruleName: "70-30 Split",
      description: "70% to primary entity, 30% to secondary entity",
      proportion: "70%",
      status: "ACTIVE",
      effectiveFrom: "2026-04-01",
      effectiveTo: "",
    }
  ],
  currency: [
    {
      id: "cur-1",
      currencyCode: "INR",
      currencyName: "Indian Rupee",
      currencySymbol: "₹",
      decimalPrecision: 2,
      status: "ACTIVE",
    },
    {
      id: "cur-2",
      currencyCode: "USD",
      currencyName: "United States Dollar",
      currencySymbol: "$",
      decimalPrecision: 2,
      status: "ACTIVE",
    },
    {
      id: "cur-3",
      currencyCode: "EUR",
      currencyName: "Euro",
      currencySymbol: "€",
      decimalPrecision: 2,
      status: "ACTIVE",
    }
  ]
};

export default function Configurations() {
  const location = useLocation();
  const [selectedMaster, setSelectedMaster] = useState(
    () => location.state?.master || "proportion_rule"
  );
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Sorting state
  const [sortField, setSortField] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Add/Edit Form Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});

  // View Details Modal State
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState(null);

  // Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const activeSchema = useMemo(() => MASTER_SCHEMAS[selectedMaster], [selectedMaster]);

  // Load items from local storage or seed them
  const loadData = () => {
    setLoading(true);
    try {
      const storageKey = LOCAL_STORAGE_PREFIX + selectedMaster;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setItems(JSON.parse(stored));
      } else {
        const seed = SEED_DATA[selectedMaster] || [];
        localStorage.setItem(storageKey, JSON.stringify(seed));
        setItems(seed);
      }
    } catch (e) {
      console.error("Failed to load local storage data", e);
      showStatusToast("Failed to load configurations.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Reset search, sort, page when switching masters
    setSearchQuery("");
    setStatusFilter("");
    setSortField("");
    setSortDirection("asc");
    setCurrentPage(1);
  }, [selectedMaster]);

  // Save changes to localStorage
  const saveItems = (newItems) => {
    try {
      const storageKey = LOCAL_STORAGE_PREFIX + selectedMaster;
      localStorage.setItem(storageKey, JSON.stringify(newItems));
      setItems(newItems);
    } catch (e) {
      console.error("Failed to save data to local storage", e);
      showStatusToast("Failed to save records.", "error");
    }
  };

  // Search and status filter logic
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Status Filter
      if (statusFilter && item.status !== statusFilter) return false;

      // Text Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        return (activeSchema?.fields || []).some((field) => {
          const value = item[field.name];
          if (value === undefined || value === null) return false;
          return String(value).toLowerCase().includes(query);
        });
      }

      return true;
    });
  }, [items, searchQuery, statusFilter, activeSchema]);

  // Sorting logic
  const sortedItems = useMemo(() => {
    if (!sortField) return filteredItems;

    return [...filteredItems].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // Convert to numbers if numeric
      const numA = Number(valA);
      const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB)) {
        valA = numA;
        valB = numB;
      } else {
        valA = valA ? String(valA).toLowerCase() : "";
        valB = valB ? String(valB).toLowerCase() : "";
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredItems, sortField, sortDirection]);

  // Pagination bounds
  const pageCount = Math.max(1, Math.ceil(sortedItems.length / itemsPerPage));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedItems.slice(start, start + itemsPerPage);
  }, [sortedItems, currentPage]);

  // Reset page when count changes
  useEffect(() => {
    if (currentPage > pageCount) {
      setCurrentPage(pageCount);
    }
  }, [pageCount, currentPage]);

  const handleSort = (field) => {
    const isAsc = sortField === field && sortDirection === "asc";
    setSortDirection(isAsc ? "desc" : "asc");
    setSortField(field);
  };

  const sortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3 text-[#0A0082] font-bold" />
    ) : (
      <ArrowDown className="h-3 w-3 text-[#0A0082] font-bold" />
    );
  };

  // Open creation modal
  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setFormData({ ...activeSchema.defaultData });
    setFormErrors({});
    setIsFormOpen(true);
  };

  // Open edit modal
  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setFormData({ ...item });
    setFormErrors({});
    setIsFormOpen(true);
  };

  // Open view modal
  const handleOpenViewModal = (item) => {
    setViewingItem(item);
    setIsViewOpen(true);
  };

  // Deletion logic
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setTimeout(() => {
      const newItems = items.filter((i) => i.id !== deleteTarget.id);
      saveItems(newItems);
      showStatusToast("Record deleted successfully.", "success");
      setDeleteTarget(null);
      setDeleting(false);
    }, 400);
  };

  // Form Validation
  const validateForm = () => {
    const errors = {};
    (activeSchema?.fields || []).forEach((field) => {
      const val = formData[field.name];
      if (field.required && (val === undefined || val === null || String(val).trim() === "")) {
        errors[field.name] = `${field.label} is required`;
      }
    });

    // Custom field validations (e.g. effective period dates)
    if (formData.effectiveFrom && formData.effectiveTo) {
      if (formData.effectiveTo < formData.effectiveFrom) {
        errors.effectiveTo = "Effective To cannot be earlier than Effective From";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit create or edit form
  const handleSubmitForm = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (editingItem) {
      // Edit mode
      const newItems = items.map((i) => (i.id === editingItem.id ? { ...formData } : i));
      saveItems(newItems);
      showStatusToast("Record updated successfully.", "success");
    } else {
      // Create mode
      const newRecord = {
        ...formData,
        id: `${selectedMaster}-${Date.now()}`,
      };
      saveItems([newRecord, ...items]);
      showStatusToast("Record created successfully.", "success");
    }
    setIsFormOpen(false);
  };

  // Headers and columns configuration
  const tableHeaders = useMemo(() => {
    return [
      ...(activeSchema?.fields || []).map((f) => (
        <button
          key={f.name}
          onClick={() => handleSort(f.name)}
          className="inline-flex items-center gap-1.5 font-semibold text-slate-600 hover:text-slate-900 focus:outline-none"
        >
          {f.label}
          {sortIcon(f.name)}
        </button>
      )),
      "Actions",
    ];
  }, [activeSchema, sortField, sortDirection]);

  const tableColumns = useMemo(() => {
    return [...(activeSchema?.fields || []).map((f) => f.name), "actions"];
  }, [activeSchema]);

  // Formats date or default placeholder
  const formatDateValue = (val) => {
    if (!val) return "—";
    try {
      const date = new Date(val);
      if (isNaN(date.getTime())) return val;
      const day = String(date.getDate()).padStart(2, "0");
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return val;
    }
  };

  // Prepare table row components
  const tableRows = useMemo(() => {
    return paginatedItems.map((item) => {
      const rowObj = {
        id: item.id,
      };

      (activeSchema?.fields || []).forEach((f) => {
        const val = item[f.name];
        if (f.name === "status") {
          rowObj[f.name] = <StatusBadge label={val} size="sm" />;
        } else if (f.type === "date") {
          rowObj[f.name] = <span className="text-slate-600 font-normal">{formatDateValue(val)}</span>;
        } else if (f.name.toLowerCase().includes("code")) {
          rowObj[f.name] = <span className="text-slate-800 font-semibold">{val || "—"}</span>;
        } else {
          rowObj[f.name] = <span className="text-slate-700 font-medium truncate max-w-[200px]" title={val}>{val !== undefined && val !== null ? String(val) : "—"}</span>;
        }
      });

      rowObj.actions = (
        <div className="flex items-center justify-center">
          <ActionMenu
            items={[
              {
                label: "View Details",
                icon: <Eye className="h-4 w-4 text-slate-600" />,
                onClick: () => handleOpenViewModal(item),
              },
              {
                label: "Edit",
                icon: <Pencil className="h-4 w-4 text-slate-600" />,
                onClick: () => handleOpenEditModal(item),
              },
              {
                label: "Delete",
                icon: <Trash2 className="h-4 w-4 text-rose-600" />,
                danger: true,
                onClick: () => setDeleteTarget(item),
              },
            ]}
          />
        </div>
      );

      return rowObj;
    });
  }, [paginatedItems, activeSchema]);

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Configurations"
        subtitle="Local configuration for masters pending backend integration (Proportion Rules, Currency)"
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              onClick={handleOpenCreateModal}
              disabled={loading}
              className="flex items-center gap-1.5 bg-[#0A0082] text-white hover:bg-[#0A0082]/90 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Add New
            </Button>
          </div>
        }
      />

      {/* Master Selection Tabs */}
      <PageCard className="p-3 bg-slate-50 border-slate-200">
        <div className="flex flex-wrap gap-2">
          {MASTERS.map((m) => {
            const isActive = selectedMaster === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMaster(m.id)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-[#0A0082] text-white shadow-sm border border-[#0A0082]"
                    : "text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </PageCard>

      {/* Dynamic Master Table Panel */}
      <div className="space-y-4">
        {/* Search and Filters panel */}
        <PageCard className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              {/* Text Search Input */}
              <div className="relative min-w-[280px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={`Search ${activeSchema.title.toLowerCase()}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm outline-none transition focus:border-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/20"
                />
              </div>

              {/* Status Select Filter */}
              <FormSelect
                name="statusFilter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: "", label: "All Statuses" },
                  { value: "ACTIVE", label: "Active" },
                  { value: "INACTIVE", label: "Inactive" },
                ]}
                className="max-w-[180px]"
              />
            </div>

            {/* Clear filters button */}
            {(searchQuery || statusFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("");
                }}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Clear Search
              </Button>
            )}
          </div>
        </PageCard>

        {/* Master Heading */}
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Info className="h-4.5 w-4.5 text-[#0A0082]" />
            {activeSchema.title} Data
          </h3>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
            {filteredItems.length} Records Found
          </span>
        </div>

        {/* Reusable Data Table */}
        <ARTable
          headers={tableHeaders}
          columns={tableColumns}
          rows={tableRows}
          loading={loading}
          emptyMessage={`No records found in ${activeSchema.title}.`}
        />

        {/* Client-Side Pagination */}
        {pageCount > 1 && (
          <div className="flex items-center justify-between border border-slate-200 bg-white px-4 py-3 sm:px-6 rounded-xl shadow-sm">
            {/* Mobile pagination */}
            <div className="flex flex-1 justify-between sm:hidden">
              <Button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                Previous
              </Button>
              <Button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, pageCount))}
                disabled={currentPage === pageCount}
                variant="outline"
                size="sm"
              >
                Next
              </Button>
            </div>
            
            {/* Desktop pagination */}
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-700">
                  Showing <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                  <span className="font-semibold">
                    {Math.min(currentPage * itemsPerPage, filteredItems.length)}
                  </span>{" "}
                  of <span className="font-semibold">{filteredItems.length}</span> records
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm bg-white" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 border border-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Previous</span>
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>

                  {Array.from({ length: pageCount }).map((_, idx) => {
                    const pageNum = idx + 1;
                    const isCurrent = pageNum === currentPage;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        aria-current={isCurrent ? "page" : undefined}
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold border focus:z-20 focus:outline-none ${
                          isCurrent
                            ? "z-10 bg-[#0A0082] text-white border-[#0A0082]"
                            : "text-slate-900 border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, pageCount))}
                    disabled={currentPage === pageCount}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 border border-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Next</span>
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingItem ? `Edit ${activeSchema.title}` : `Add New ${activeSchema.title}`}
        subtitle={
          editingItem
            ? `Modify settings for the selected master record`
            : `Create a new entry in the active master grid`
        }
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFormOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmitForm}
              className="bg-[#0A0082] text-white hover:bg-[#0A0082]/90 shadow-sm"
            >
              {editingItem ? "Update Record" : "Create Record"}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmitForm} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {activeSchema.fields.map((field) => {
              if (field.type === "select") {
                return (
                  <FormSelect
                    key={field.name}
                    label={field.label}
                    name={field.name}
                    value={formData[field.name] || ""}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    options={field.options.map((opt) => ({ value: opt, label: opt }))}
                    className="w-full"
                  />
                );
              }

              if (field.type === "textarea") {
                return (
                  <div key={field.name} className="flex flex-col gap-1.5 w-full sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-600 flex items-center gap-0.5">
                      {field.label}
                      {field.required && <span className="text-rose-500">*</span>}
                    </label>
                    <textarea
                      name={field.name}
                      value={formData[field.name] || ""}
                      onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-700 placeholder-slate-400 outline-none transition focus:border-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/20 ${
                        formErrors[field.name] ? "border-red-300 focus:border-red-500" : "border-slate-300"
                      }`}
                      rows={3}
                    />
                    {formErrors[field.name] && (
                      <span className="text-xs text-red-500 font-medium">{formErrors[field.name]}</span>
                    )}
                  </div>
                );
              }

              return (
                <FormInput
                  key={field.name}
                  label={field.label}
                  name={field.name}
                  type={field.type}
                  value={formData[field.name] || ""}
                  onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                  requiredMark={field.required}
                  error={formErrors[field.name]}
                  className="w-full"
                />
              );
            })}
          </div>
        </form>
      </Modal>

      {/* Record Details View Modal */}
      <Modal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        title={`View ${activeSchema.title} Details`}
        subtitle="Complete read-only properties of the selected record"
        size="md"
        footer={
          <div className="flex items-center justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsViewOpen(false)}
            >
              Close
            </Button>
          </div>
        }
      >
        {viewingItem && (
          <div className="divide-y divide-slate-100 text-sm">
            {activeSchema.fields.map((f) => (
              <div key={f.name} className="grid grid-cols-3 py-3 gap-2">
                <span className="font-semibold text-slate-500">{f.label}</span>
                <span className="col-span-2 text-slate-800 font-medium break-all">
                  {f.name === "status" ? (
                    <StatusBadge label={viewingItem[f.name]} size="sm" />
                  ) : f.type === "date" ? (
                    formatDateValue(viewingItem[f.name])
                  ) : (
                    viewingItem[f.name] || <span className="text-slate-400">—</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={`Delete ${activeSchema.title} Entry`}
        message={`Are you sure you want to delete this master record? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
        isLoading={deleting}
      />
    </div>
  );
}
