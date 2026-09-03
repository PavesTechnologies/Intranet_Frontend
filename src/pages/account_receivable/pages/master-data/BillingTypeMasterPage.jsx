import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  Layers,
  ShieldAlert,
} from "lucide-react";

import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/Button/Button";
import FormInput from "../../../../components/forms/FormInput";
import Modal from "../../../../components/Modal/modal";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import StatusBadge from "../../../../components/status/statusbadge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../../components/ui/tooltip";
import { showStatusToast } from "../../../../components/toastfy/toast";
import ARTable from "../../components/common/ARTable";
import MasterStatCards from "../../components/common/MasterStatCards";
import MasterStatusTabs from "../../components/common/MasterStatusTabs";
import BackIconButton from "../../components/common/BackIconButton";
import DetailsDrawer from "../../components/common/DetailsDrawer";
import {
  getBillingTypes,
  createBillingType,
  updateBillingType,
  deleteBillingType,
  activateBillingType,
  getApiErrorMessage,
} from "../../services/billingTypeService";

const NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 500;

const EMPTY_FORM = { billingTypeName: "", description: "" };

const ACTION_TONE_CLASSES = {
  default: "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
  danger: "text-rose-500 hover:bg-rose-50 hover:text-rose-700",
  success: "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700",
};

// Inline row-action icon with a hover tooltip — used only for the Billing Type
// table, which trades the shared ActionMenu (3-dot) pattern for three
// always-visible icons per the design.
const InlineActionButton = ({ icon, label, onClick, disabled = false, tone = "default" }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${ACTION_TONE_CLASSES[tone]} ${
            disabled ? "cursor-not-allowed opacity-50" : ""
          }`}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export default function BillingTypeMasterPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [billingTypes, setBillingTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [permissionError, setPermissionError] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("ACTIVE");

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

  const loadBillingTypes = async () => {
    setLoading(true);
    setPermissionError(false);
    try {
      const data = await getBillingTypes();
      setBillingTypes(data);
    } catch (error) {
      if (error?.response?.status === 403) {
        setPermissionError(true);
      } else {
        showStatusToast(getApiErrorMessage(error, "Failed to load billing types."), "error");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingTypes();
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
    const total = billingTypes.length;
    const active = billingTypes.filter((item) => item.isActive).length;
    return { total, active, inactive: total - active };
  }, [billingTypes]);

  const statusTabs = useMemo(
    () => [
      { key: "ALL", label: "All", count: stats.total },
      { key: "ACTIVE", label: "Active", count: stats.active },
      { key: "INACTIVE", label: "Inactive", count: stats.inactive },
    ],
    [stats]
  );

  const filteredItems = useMemo(() => {
    return billingTypes.filter((item) => {
      if (activeTab !== "ALL" && item.status !== activeTab) return false;

      const query = searchQuery.trim().toLowerCase();
      if (query) {
        const haystack = `${item.billingTypeName} ${item.description || ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  }, [billingTypes, searchQuery, activeTab]);

  const hasActiveFilters = Boolean(searchQuery);

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setFormData({ billingTypeName: item.billingTypeName, description: item.description || "" });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenViewModal = (item) => {
    setViewingItem(item);
    setIsViewOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    const name = (formData.billingTypeName || "").trim();

    if (!name) {
      errors.billingTypeName = "Billing Type Name is required";
    } else if (name.length > NAME_MAX_LENGTH) {
      errors.billingTypeName = `Must be ${NAME_MAX_LENGTH} characters or fewer`;
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
      billingTypeName: formData.billingTypeName.trim(),
      description: (formData.description || "").trim(),
    };

    setSubmitting(true);
    try {
      if (editingItem) {
        const updated = await updateBillingType(editingItem.billingTypeId, payload);
        setBillingTypes((prev) =>
          prev.map((item) => (item.billingTypeId === editingItem.billingTypeId ? updated : item))
        );
        showStatusToast("Billing type updated successfully.", "success");
      } else {
        const created = await createBillingType(payload);
        setBillingTypes((prev) => [created, ...prev]);
        showStatusToast("Billing type created successfully.", "success");
      }
      setIsFormOpen(false);
    } catch (error) {
      showStatusToast(getApiErrorMessage(error, "Failed to save billing type."), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBillingType(deleteTarget.billingTypeId);
      showStatusToast("Billing type deleted successfully.", "success");
      setDeleteTarget(null);
      await loadBillingTypes();
    } catch (error) {
      showStatusToast(getApiErrorMessage(error, "Failed to delete billing type."), "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleActivate = async (item) => {
    setActivatingId(item.billingTypeId);
    try {
      await activateBillingType(item.billingTypeId);
      showStatusToast("Billing type activated successfully.", "success");
      await loadBillingTypes();
    } catch (error) {
      showStatusToast(getApiErrorMessage(error, "Failed to activate billing type."), "error");
    } finally {
      setActivatingId(null);
    }
  };

  const tableHeaders = ["Billing Type Name", "Status", "Actions"];
  const tableColumns = ["billingTypeName", "status", "actions"];

  const tableRows = useMemo(() => {
    return filteredItems.map((item) => ({
      billingTypeName: <span className="font-semibold text-slate-800">{item.billingTypeName}</span>,
      status: <StatusBadge label={item.status} size="sm" />,
      actions: (
        <div className="flex items-center justify-center gap-0.5">
          <InlineActionButton
            icon={<Eye className="h-4 w-4" />}
            label="View Details"
            onClick={() => handleOpenViewModal(item)}
          />
          <InlineActionButton
            icon={<Pencil className="h-4 w-4" />}
            label="Edit"
            onClick={() => handleOpenEditModal(item)}
          />
          {item.isActive ? (
            <InlineActionButton
              icon={<Trash2 className="h-4 w-4" />}
              label="Delete"
              tone="danger"
              onClick={() => setDeleteTarget(item)}
            />
          ) : (
            <InlineActionButton
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Activate"
              tone="success"
              disabled={activatingId === item.billingTypeId}
              onClick={() => handleActivate(item)}
            />
          )}
        </div>
      ),
    }));
  }, [filteredItems, activatingId]);

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-3">
        <BackIconButton onClick={() => navigate("/account-receivable/master-data")} label="Back to Configurations" />
        <div className="flex-1">
          <PageHeader
            title="Billing Types"
            subtitle="Configure and manage billing models used across AR & Billing"
            actions={
              <Button onClick={handleOpenCreateModal} disabled={loading} className="flex items-center gap-1.5">
                <Plus className="h-4 w-4" />
                Add Billing Type
              </Button>
            }
          />
        </div>
      </div>

      {permissionError && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          You do not have permission to manage billing types.
        </div>
      )}

      <MasterStatCards
        items={[
          { label: "Total", value: stats.total, icon: <Layers className="h-5 w-5" /> },
          { label: "Active", value: stats.active, tone: "success", icon: <CheckCircle2 className="h-5 w-5" /> },
          { label: "Inactive", value: stats.inactive, tone: "danger", icon: <Trash2 className="h-5 w-5" /> },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MasterStatusTabs tabs={statusTabs} activeKey={activeTab} onChange={setActiveTab} />

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-[380px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search billing types..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm outline-none transition focus:border-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/20"
            />
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="small"
              onClick={() => setSearchQuery("")}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      <ARTable
        headers={tableHeaders}
        columns={tableColumns}
        rows={tableRows}
        loading={loading}
        emptyMessage={
          hasActiveFilters
            ? "No billing types match your search."
            : "No Billing Types Found. Create your first billing type to start configuring billing behavior."
        }
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingItem ? "Edit Billing Type" : "Add Billing Type"}
        subtitle={
          editingItem
            ? "Update the name or description of this billing type."
            : "Create a new billing type for use across billing configurations."
        }
        size="md"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmitForm} loading={submitting} loadingText="Saving...">
              {editingItem ? "Update Billing Type" : "Create Billing Type"}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          <FormInput
            label="Billing Type Name"
            name="billingTypeName"
            value={formData.billingTypeName}
            onChange={(e) => setFormData({ ...formData, billingTypeName: e.target.value })}
            placeholder="e.g. Fixed Price"
            requiredMark
            maxLength={NAME_MAX_LENGTH}
            error={formErrors.billingTypeName}
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
              className={`w-full rounded-lg border px-4 py-2 text-sm shadow-sm outline-none transition focus:border-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/20 ${
                formErrors.description ? "border-red-300 focus:border-red-500" : "border-gray-300"
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
        title="Billing Type Details"
        subtitle="Read-only properties of the selected record"
        badge={viewingItem && <StatusBadge label={viewingItem.status} size="sm" />}
      >
        {viewingItem && (
          <div className="divide-y divide-slate-100 text-sm">
            <div className="grid grid-cols-3 py-3 gap-2">
              <span className="font-semibold text-slate-500">Billing Type Name</span>
              <span className="col-span-2 font-medium text-slate-800">{viewingItem.billingTypeName}</span>
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
        title="Delete Billing Type"
        message={`Are you sure you want to delete "${deleteTarget?.billingTypeName || ""}"? It will be marked inactive and can be reactivated later.`}
        confirmText="Delete"
        variant="danger"
        isLoading={deleting}
      />
    </div>
  );
}
