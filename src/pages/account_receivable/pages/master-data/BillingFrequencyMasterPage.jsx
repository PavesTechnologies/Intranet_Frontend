import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  CalendarClock,
  ShieldAlert,
} from "lucide-react";

import PageHeader from "../../../../components/ui/PageHeader";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import Button from "../../../../components/Button/Button";
import FormInput from "../../../../components/forms/FormInput";
import Modal from "../../../../components/Modal/modal";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import StatusBadge from "../../../../components/status/statusbadge";
import { showStatusToast } from "../../../../components/toastfy/toast";
import SearchInput from "../../../../components/filter/Searchbar";
import ARClearFiltersButton from "../../components/common/ARClearFiltersButton";
import Pagination from "../../../../components/Pagination/pagination";
import ARTable from "../../components/common/ARTable";
import ActionMenu from "../../components/common/ActionMenu";
import MasterStatCards from "../../components/common/MasterStatCards";
import BackIconButton from "../../components/common/BackIconButton";
import DetailsDrawer from "../../components/common/DetailsDrawer";
import {
  getBillingFrequencies,
  createBillingFrequency,
  updateBillingFrequency,
  deleteBillingFrequency,
  activateBillingFrequency,
  getApiErrorMessage,
} from "../../services/billingFrequencyService";

const NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 500;
const PAGE_SIZE = 8;

const EMPTY_FORM = { billingFrequencyName: "", description: "" };

export default function BillingFrequencyMasterPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [billingFrequencies, setBillingFrequencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [permissionError, setPermissionError] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("ACTIVE");
  const [currentPage, setCurrentPage] = useState(1);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [activatingId, setActivatingId] = useState(null);

  const loadBillingFrequencies = async () => {
    setLoading(true);
    setPermissionError(false);
    try {
      const data = await getBillingFrequencies();
      setBillingFrequencies(data);
    } catch (error) {
      if (error?.response?.status === 403) {
        setPermissionError(true);
      } else {
        showStatusToast(getApiErrorMessage(error, "Failed to load billing frequencies."), "error");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingFrequencies();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setIsFormOpen(true);
  };

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      handleOpenCreateModal();
      searchParams.delete("new");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const total = billingFrequencies.length;
    const active = billingFrequencies.filter((item) => item.isActive).length;
    return { total, active, inactive: total - active };
  }, [billingFrequencies]);

  const filteredItems = useMemo(() => {
    return billingFrequencies.filter((item) => {
      if (activeTab === "ACTIVE" && !item.isActive) return false;
      if (activeTab === "INACTIVE" && item.isActive) return false;

      const query = searchQuery.trim().toLowerCase();
      if (query) {
        const haystack = `${item.billingFrequencyName} ${item.description || ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  }, [billingFrequencies, searchQuery, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredItems, currentPage]);

  const hasActiveFilters = Boolean(searchQuery || activeTab !== "ALL");

  const handleKpiClick = (key) => {
    setActiveTab((current) => (key === "ALL" || current === key ? "ALL" : key));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setActiveTab("ALL");
    setCurrentPage(1);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setFormData({ billingFrequencyName: item.billingFrequencyName, description: item.description || "" });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenViewModal = (item) => {
    setViewingItem(item);
    setIsViewOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    const name = (formData.billingFrequencyName || "").trim();

    if (!name) {
      errors.billingFrequencyName = "Billing Frequency Name is required";
    } else if (name.length > NAME_MAX_LENGTH) {
      errors.billingFrequencyName = `Must be ${NAME_MAX_LENGTH} characters or fewer`;
    }

    if ((formData.description || "").length > DESCRIPTION_MAX_LENGTH) {
      errors.description = `Must be ${DESCRIPTION_MAX_LENGTH} characters or fewer`;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      billingFrequencyName: formData.billingFrequencyName.trim(),
      description: (formData.description || "").trim(),
    };

    setSubmitting(true);
    try {
      if (editingItem) {
        const updated = await updateBillingFrequency(editingItem.billingFrequencyId, payload);
        setBillingFrequencies((prev) =>
          prev.map((item) => (item.billingFrequencyId === editingItem.billingFrequencyId ? updated : item))
        );
        showStatusToast("Billing frequency updated successfully.", "success");
      } else {
        const created = await createBillingFrequency(payload);
        setBillingFrequencies((prev) => [created, ...prev]);
        showStatusToast("Billing frequency created successfully.", "success");
      }
      setIsFormOpen(false);
    } catch (error) {
      showStatusToast(getApiErrorMessage(error, "Failed to save billing frequency."), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBillingFrequency(deleteTarget.billingFrequencyId);
      showStatusToast("Billing frequency deleted successfully.", "success");
      setDeleteTarget(null);
      await loadBillingFrequencies();
    } catch (error) {
      showStatusToast(getApiErrorMessage(error, "Failed to delete billing frequency."), "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleActivate = async (item) => {
    setActivatingId(item.billingFrequencyId);
    try {
      await activateBillingFrequency(item.billingFrequencyId);
      showStatusToast("Billing frequency activated successfully.", "success");
      await loadBillingFrequencies();
    } catch (error) {
      showStatusToast(getApiErrorMessage(error, "Failed to activate billing frequency."), "error");
    } finally {
      setActivatingId(null);
    }
  };

  const tableHeaders = ["Billing Frequency", "Description", "Status", "Actions"];
  const tableColumns = ["billingFrequencyName", "description", "status", "actions"];

  const tableRows = useMemo(() => {
    return paginatedItems.map((item) => ({
      billingFrequencyName: <span className="font-semibold text-slate-900">{item.billingFrequencyName}</span>,
      description: <span className="block max-w-lg truncate text-xs text-slate-500">{item.description || "—"}</span>,
      status: <StatusBadge label={item.status} size="sm" />,
      actions: (
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
                label: "Activate",
                icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
                hidden: item.isActive,
                disabled: activatingId === item.billingFrequencyId,
                onClick: () => handleActivate(item),
              },
              {
                label: "Delete",
                icon: <Trash2 className="h-4 w-4 text-rose-600" />,
                danger: true,
                hidden: !item.isActive,
                onClick: () => setDeleteTarget(item),
              },
            ]}
          />
        </div>
      ),
    }));
  }, [paginatedItems, activatingId]);

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-3">
        <BackIconButton onClick={() => navigate("/account-receivable/master-data")} label="Back to Configurations" />
        <div className="flex-1">
          <PageHeader
            title="Billing Frequencies"
            subtitle="Define when and how frequently customers are billed"
            actions={
              <Button onClick={handleOpenCreateModal} disabled={loading} className="flex items-center gap-1.5">
                <Plus className="h-4 w-4" />
                Add Billing Frequency
              </Button>
            }
          />
        </div>
      </div>

      {permissionError && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          You do not have permission to manage billing frequencies.
        </div>
      )}

      <MasterStatCards
        items={[
          { key: "ALL", label: "Total Frequencies", value: stats.total, active: activeTab === "ALL", onClick: () => handleKpiClick("ALL"), icon: <CalendarClock className="h-5 w-5" /> },
          { key: "ACTIVE", label: "Active", value: stats.active, active: activeTab === "ACTIVE", onClick: () => handleKpiClick("ACTIVE"), tone: "success", icon: <CheckCircle2 className="h-5 w-5" /> },
          { key: "INACTIVE", label: "Inactive", value: stats.inactive, active: activeTab === "INACTIVE", onClick: () => handleKpiClick("INACTIVE"), tone: "danger", icon: <Trash2 className="h-5 w-5" /> },
        ]}
      />

      <PageCard className="overflow-hidden">
        <PageCardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Billing Frequencies</h2>
              <p className="mt-0.5 text-xs text-slate-500">Define the billing cycles available to AR configurations</p>
            </div>
            <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2 sm:flex-row sm:items-center">
              <div className="w-full sm:w-72">
                <SearchInput
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search billing frequencies..."
                />
              </div>
              {hasActiveFilters && (
                <ARClearFiltersButton onClick={handleResetFilters} />
              )}
            </div>
          </div>

          <ARTable
            headers={tableHeaders}
            columns={tableColumns}
            rows={tableRows}
            alignments={{ status: "center", actions: "center" }}
            loading={loading}
            emptyMessage={
              hasActiveFilters
                ? "No billing frequencies match the selected filters."
                : "No billing frequencies found. Create one to configure billing cycles."
            }
          />

          {!loading && filteredItems.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredItems.length)} of {filteredItems.length} frequencies
              </p>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPrevious={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                onNext={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
              />
            </div>
          )}
        </PageCardContent>
      </PageCard>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingItem ? "Edit Billing Frequency" : "Add Billing Frequency"}
        subtitle={
          editingItem
            ? "Update the name or description of this billing frequency."
            : "Create a new billing frequency for use across billing configurations."
        }
        size="md"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmitForm} loading={submitting} loadingText="Saving...">
              {editingItem ? "Update Billing Frequency" : "Create Billing Frequency"}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          <FormInput
            label="Billing Frequency Name"
            name="billingFrequencyName"
            value={formData.billingFrequencyName}
            onChange={(e) => setFormData({ ...formData, billingFrequencyName: e.target.value })}
            placeholder="e.g. Monthly"
            requiredMark
            maxLength={NAME_MAX_LENGTH}
            error={formErrors.billingFrequencyName}
          />

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter a short description"
              rows={4}
              maxLength={DESCRIPTION_MAX_LENGTH}
              className={`w-full rounded-lg border px-4 py-2 text-sm shadow-sm outline-none transition focus:border-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/20 ${formErrors.description ? "border-red-300 focus:border-red-500" : "border-gray-300"
                }`}
            />
            <div className="flex items-center justify-between">
              {formErrors.description ? (
                <p className="text-xs text-red-500">{formErrors.description}</p>
              ) : (
                <span />
              )}
              <span className="text-xs text-slate-400">
                {(formData.description || "").length}/{DESCRIPTION_MAX_LENGTH}
              </span>
            </div>
          </div>
        </form>
      </Modal>

      {/* View Details Drawer */}
      <DetailsDrawer
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        title="Billing Frequency Details"
        subtitle="Read-only properties of the selected record"
        badge={viewingItem && <StatusBadge label={viewingItem.status} size="sm" />}
      >
        {viewingItem && (
          <div className="divide-y divide-slate-100 text-sm">
            <div className="grid grid-cols-3 py-3 gap-2">
              <span className="font-semibold text-slate-500">Billing Frequency Name</span>
              <span className="col-span-2 font-medium text-slate-800">{viewingItem.billingFrequencyName}</span>
            </div>
            <div className="grid grid-cols-3 py-3 gap-2">
              <span className="font-semibold text-slate-500">Description</span>
              <span className="col-span-2 font-medium text-slate-800 break-words">
                {viewingItem.description || <span className="text-slate-400">—</span>}
              </span>
            </div>
            <div className="grid grid-cols-3 py-3 gap-2">
              <span className="font-semibold text-slate-500">Status</span>
              <span className="col-span-2">
                <StatusBadge label={viewingItem.status} size="sm" />
              </span>
            </div>
          </div>
        )}
      </DetailsDrawer>

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Billing Frequency"
        message={`Are you sure you want to delete "${deleteTarget?.billingFrequencyName || ""}"? It will be marked inactive and can be reactivated later.`}
        confirmText="Delete"
        variant="danger"
        isLoading={deleting}
      />
    </div>
  );
}
