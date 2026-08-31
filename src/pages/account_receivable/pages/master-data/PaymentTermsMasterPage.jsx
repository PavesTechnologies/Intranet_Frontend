import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  Receipt,
  ShieldAlert,
  Timer,
} from "lucide-react";

import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/Button/Button";
import FormInput from "../../../../components/forms/FormInput";
import Modal from "../../../../components/Modal/modal";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import StatusBadge from "../../../../components/status/statusbadge";
import { showStatusToast } from "../../../../components/toastfy/toast";
import ARTable from "../../components/common/ARTable";
import ActionMenu from "../../components/common/ActionMenu";
import MasterStatCards from "../../components/common/MasterStatCards";
import MasterStatusTabs from "../../components/common/MasterStatusTabs";
import BackIconButton from "../../components/common/BackIconButton";
import DetailsDrawer from "../../components/common/DetailsDrawer";
import {
  getPaymentTerms,
  createPaymentTerm,
  updatePaymentTerm,
  deletePaymentTerm,
  activatePaymentTerm,
  getApiErrorMessage,
} from "../../services/paymentTermsService";

const NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 500;

const EMPTY_FORM = { paymentTermName: "", paymentDays: "", description: "" };

export default function PaymentTermsMasterPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [paymentTerms, setPaymentTerms] = useState([]);
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

  const loadPaymentTerms = async () => {
    setLoading(true);
    setPermissionError(false);
    try {
      const data = await getPaymentTerms();
      setPaymentTerms(data);
    } catch (error) {
      if (error?.response?.status === 403) {
        setPermissionError(true);
      } else {
        showStatusToast(getApiErrorMessage(error, "Failed to load payment terms."), "error");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentTerms();
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
    const total = paymentTerms.length;
    const activeTerms = paymentTerms.filter((item) => item.isActive);
    const active = activeTerms.length;
    const avgDays = activeTerms.length
      ? Math.round(
          activeTerms.reduce((sum, item) => sum + (Number(item.paymentDays) || 0), 0) / activeTerms.length
        )
      : 0;
    return { total, active, inactive: total - active, avgDays };
  }, [paymentTerms]);

  const statusTabs = useMemo(
    () => [
      { key: "ALL", label: "All", count: stats.total },
      { key: "ACTIVE", label: "Active", count: stats.active },
      { key: "INACTIVE", label: "Inactive", count: stats.inactive },
    ],
    [stats]
  );

  const filteredItems = useMemo(() => {
    return paymentTerms.filter((item) => {
      if (activeTab !== "ALL" && item.status !== activeTab) return false;

      const query = searchQuery.trim().toLowerCase();
      if (query) {
        const haystack = `${item.paymentTermName} ${item.description || ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  }, [paymentTerms, searchQuery, activeTab]);

  const hasActiveFilters = Boolean(searchQuery);

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      paymentTermName: item.paymentTermName,
      paymentDays: item.paymentDays ?? "",
      description: item.description || "",
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenViewModal = (item) => {
    setViewingItem(item);
    setIsViewOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    const name = (formData.paymentTermName || "").trim();

    if (!name) {
      errors.paymentTermName = "Payment Term Name is required";
    } else if (name.length > NAME_MAX_LENGTH) {
      errors.paymentTermName = `Must be ${NAME_MAX_LENGTH} characters or fewer`;
    }

    const days = formData.paymentDays;
    if (days === "" || days === null || days === undefined) {
      errors.paymentDays = "Payment Days is required";
    } else if (isNaN(Number(days)) || Number(days) < 0 || !Number.isInteger(Number(days))) {
      errors.paymentDays = "Payment Days must be a whole number, 0 or greater";
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
      paymentTermName: formData.paymentTermName.trim(),
      paymentDays: Number(formData.paymentDays),
      description: (formData.description || "").trim(),
    };

    setSubmitting(true);
    try {
      if (editingItem) {
        const updated = await updatePaymentTerm(editingItem.paymentTermId, payload);
        setPaymentTerms((prev) =>
          prev.map((item) => (item.paymentTermId === editingItem.paymentTermId ? updated : item))
        );
        showStatusToast("Payment term updated successfully.", "success");
      } else {
        const created = await createPaymentTerm(payload);
        setPaymentTerms((prev) => [created, ...prev]);
        showStatusToast("Payment term created successfully.", "success");
      }
      setIsFormOpen(false);
    } catch (error) {
      showStatusToast(getApiErrorMessage(error, "Failed to save payment term."), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePaymentTerm(deleteTarget.paymentTermId);
      showStatusToast("Payment term deleted successfully.", "success");
      setDeleteTarget(null);
      await loadPaymentTerms();
    } catch (error) {
      showStatusToast(getApiErrorMessage(error, "Failed to delete payment term."), "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleActivate = async (item) => {
    setActivatingId(item.paymentTermId);
    try {
      // Backend contract returns Void — re-fetch the list rather than merge.
      await activatePaymentTerm(item.paymentTermId);
      showStatusToast("Payment term activated successfully.", "success");
      await loadPaymentTerms();
    } catch (error) {
      showStatusToast(getApiErrorMessage(error, "Failed to activate payment term."), "error");
    } finally {
      setActivatingId(null);
    }
  };

  const tableHeaders = ["Payment Term Name", "Payment Days", "Status", "Actions"];
  const tableColumns = ["paymentTermName", "paymentDays", "status", "actions"];

  const tableRows = useMemo(() => {
    return filteredItems.map((item) => ({
      paymentTermName: <span className="font-semibold text-slate-800">{item.paymentTermName}</span>,
      paymentDays: <span className="text-slate-700">{item.paymentDays ?? "—"}</span>,
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
                disabled: activatingId === item.paymentTermId,
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
  }, [filteredItems, activatingId]);

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-3">
        <BackIconButton onClick={() => navigate("/account-receivable/master-data")} label="Back to Configurations" />
        <div className="flex-1">
          <PageHeader
            title="Payment Terms"
            subtitle="Define customer payment conditions and due-date rules"
            actions={
              <Button onClick={handleOpenCreateModal} disabled={loading} className="flex items-center gap-1.5">
                <Plus className="h-4 w-4" />
                Add Payment Term
              </Button>
            }
          />
        </div>
      </div>

      {permissionError && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          You do not have permission to manage payment terms.
        </div>
      )}

      <MasterStatCards
        items={[
          { label: "Total", value: stats.total, icon: <Receipt className="h-5 w-5" /> },
          { label: "Active", value: stats.active, tone: "success", icon: <CheckCircle2 className="h-5 w-5" /> },
          { label: "Inactive", value: stats.inactive, tone: "danger", icon: <Trash2 className="h-5 w-5" /> },
          { label: "Avg. Payment Days", value: stats.avgDays, icon: <Timer className="h-5 w-5" /> },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MasterStatusTabs tabs={statusTabs} activeKey={activeTab} onChange={setActiveTab} />

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-[380px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search payment terms..."
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
            ? "No payment terms match your search."
            : "No Payment Terms Found. Create your first payment term to start configuring due-date rules."
        }
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingItem ? "Edit Payment Term" : "Add Payment Term"}
        subtitle={
          editingItem
            ? "Update the name, payment days, or description of this payment term."
            : "Create a new payment term for use across billing configurations."
        }
        size="md"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmitForm} loading={submitting} loadingText="Saving...">
              {editingItem ? "Update Payment Term" : "Create Payment Term"}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          <FormInput
            label="Payment Term Name"
            name="paymentTermName"
            value={formData.paymentTermName}
            onChange={(e) => setFormData({ ...formData, paymentTermName: e.target.value })}
            placeholder="e.g. Net 30"
            requiredMark
            maxLength={NAME_MAX_LENGTH}
            error={formErrors.paymentTermName}
          />

          <FormInput
            label="Payment Days"
            name="paymentDays"
            type="number"
            min="0"
            step="1"
            value={formData.paymentDays}
            onChange={(e) => setFormData({ ...formData, paymentDays: e.target.value })}
            placeholder="e.g. 30"
            requiredMark
            error={formErrors.paymentDays}
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
        title="Payment Term Details"
        subtitle="Read-only properties of the selected record"
        badge={viewingItem && <StatusBadge label={viewingItem.status} size="sm" />}
      >
        {viewingItem && (
          <div className="divide-y divide-slate-100 text-sm">
            <div className="grid grid-cols-3 py-3 gap-2">
              <span className="font-semibold text-slate-500">Payment Term Name</span>
              <span className="col-span-2 font-medium text-slate-800">{viewingItem.paymentTermName}</span>
            </div>
            <div className="grid grid-cols-3 py-3 gap-2">
              <span className="font-semibold text-slate-500">Payment Days</span>
              <span className="col-span-2 font-medium text-slate-800">{viewingItem.paymentDays ?? "—"}</span>
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
        title="Delete Payment Term"
        message={`Are you sure you want to delete "${deleteTarget?.paymentTermName || ""}"? It will be marked inactive and can be reactivated later.`}
        confirmText="Delete"
        variant="danger"
        isLoading={deleting}
      />
    </div>
  );
}
