import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FolderKanban,
  FileText,
  Cable,
  CheckCircle2,
  Eye,
  Pencil,
  ArrowRightCircle,
  Ban,
  XCircle,
  Trash2,
} from "lucide-react";

import PageHeader from "../../../components/ui/PageHeader";
import { PageCard, PageCardContent } from "../../../components/Cards/PageCard";
import { KPICard } from "../../../components/kpi/KPI";
import Button from "../../../components/Button/Button";
import SearchInput from "../../../components/filter/Searchbar";
import FormSelect from "../../../components/forms/FormSelect";
import ARTable from "../components/common/ARTable";
import Pagination from "../../../components/Pagination/pagination";
import StatusBadge from "../../../components/status/statusbadge";
import ConfirmationModal from "../../../components/confirmation_modal/ConfirmationModal";
import { showStatusToast } from "../../../components/toastfy/toast";
import ActionMenu from "../components/common/ActionMenu";
import Modal from "../../../components/Modal/modal";
import FormTextArea from "../../../components/forms/FormTextArea";

import {
  fetchBillingConfigurations,
  deactivateBillingConfiguration,
  approveBillingConfiguration,
  rejectBillingConfiguration,
  deleteBillingConfiguration,
  getApiErrorMessage,
  getBillingConfigurationStats,
} from "../services/billingConfigService";

const INITIAL_FILTERS = { search: "", status: "" };
const PAGE_SIZE = 6;

const TABLE_HEADERS = ["Client", "Project", "Billing Type", "Source", "Status", "Actions"];
const TABLE_COLUMNS = ["client", "project", "billingType", "source", "status", "actions"];

const SOURCE_BADGE_CLASSES = {
  Enterprise: "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200",
  Standalone: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
};

function SourceBadge({ source }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        SOURCE_BADGE_CLASSES[source] || "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200"
      }`}
    >
      {source}
    </span>
  );
}

export default function Overview() {
  const navigate = useNavigate();

  // Overview Stats State
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Billing Configurations State
  const [configs, setConfigs] = useState([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);
  const [approveTarget, setApproveTarget] = useState(null);
  const [approveLoading, setApproveLoading] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  // load configurations helper available to handlers
  const loadConfigurations = async () => {
    setLoadingStats(true);
    setLoadingConfigs(true);
    try {
      const configsResult = await fetchBillingConfigurations();
      setConfigs(configsResult);

      // derive stats from configurations
      const statsResult = await getBillingConfigurationStats();
      setStats(statsResult);
    } catch (error) {
      showStatusToast(getApiErrorMessage(error, "Failed to load billing configuration overview."), "error");
      setStats(null);
    } finally {
      setLoadingStats(false);
      setLoadingConfigs(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    // initial load
    loadConfigurations();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const handleSearch = (value) => {
    setFilters((prev) => ({ ...prev, search: value }));
    setCurrentPage(1);
  };

  // Only Draft and Active configurations are ever returned by the API, so the
  // status filter is a fixed list rather than derived from the current page of
  // data (which could omit a status even though records with it exist).
  const filterOptions = useMemo(
    () => ({
      status: [
        { value: "", label: "All Statuses" },
        { value: "Draft", label: "Draft" },
        { value: "Active", label: "Active" },
      ],
    }),
    []
  );

  const filteredConfigs = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return configs.filter((config) => {
      const matchesSearch =
        !search ||
        String(config.projectName || "").toLowerCase().includes(search) ||
        String(config.projectCode || "").toLowerCase().includes(search) ||
        String(config.client || "").toLowerCase().includes(search);
      const matchesStatus = !filters.status || String(config.status) === String(filters.status);

      return matchesSearch && matchesStatus;
    });
  }, [configs, filters]);

  const totalPages = Math.ceil(filteredConfigs.length / PAGE_SIZE) || 1;
  const paginatedConfigs = filteredConfigs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleView = (config) => {
    navigate(`/account-receivable/project-billing-setup/configurations/${config.id}?mode=view`);
  };

  const handleEdit = (config) => {
    navigate(`/account-receivable/project-billing-setup/configurations/${config.id}?mode=edit`);
  };

  const handleContinueDraft = (config) => {
    navigate(`/account-receivable/project-billing-setup/configurations/${config.id}`);
  };

  const handleConfirmDeactivate = async () => {
    setDeactivateLoading(true);
    try {
      await deactivateBillingConfiguration(deactivateTarget.id);
      await loadConfigurations();
      showStatusToast("Billing configuration deactivated.", "success");
      setDeactivateTarget(null);
    } catch (error) {
      showStatusToast(getApiErrorMessage(error, "Failed to deactivate billing configuration."), "error");
    } finally {
      setDeactivateLoading(false);
    }
  };

  const handleConfirmApprove = async () => {
    setApproveLoading(true);
    try {
      await approveBillingConfiguration(approveTarget.id);
      await loadConfigurations();
      showStatusToast("Billing configuration approved.", "success");
      setApproveTarget(null);
    } catch (error) {
      showStatusToast(getApiErrorMessage(error, "Failed to approve billing configuration."), "error");
    } finally {
      setApproveLoading(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectionReason.trim()) {
      showStatusToast("Please enter a rejection reason.", "warning");
      return;
    }

    setRejectLoading(true);
    try {
      await rejectBillingConfiguration(rejectTarget.id, rejectionReason.trim());
      await loadConfigurations();
      showStatusToast("Billing configuration rejected.", "success");
      setRejectTarget(null);
      setRejectionReason("");
    } catch (error) {
      showStatusToast(getApiErrorMessage(error, "Failed to reject billing configuration."), "error");
    } finally {
      setRejectLoading(false);
    }
  };

  const openRejectModal = (config) => {
    setRejectTarget(config);
    setRejectionReason("");
  };

  const closeRejectModal = () => {
    if (rejectLoading) return;
    setRejectTarget(null);
    setRejectionReason("");
  };

  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteBillingConfiguration(deleteTarget.id);
      await loadConfigurations();
      showStatusToast("Draft billing configuration deleted.", "success");
      setDeleteTarget(null);
    } catch (error) {
      showStatusToast(getApiErrorMessage(error, "Failed to delete draft billing configuration."), "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  const closeDeleteModal = () => {
    if (!deleteLoading) {
      setDeleteTarget(null);
    }
  };

  const canApproveOrReject = (status) => !["Active", "Inactive", "Rejected", "Draft"].includes(status);

  const closeDeactivateModal = () => {
    if (!deactivateLoading) {
      setDeactivateTarget(null);
    }
  };

  const tableRows = useMemo(
    () =>
      paginatedConfigs.map((config) => ({
        client: config.client,
        project: (
          <div className="text-left">
            <div className="font-semibold text-slate-900">{config.projectName}</div>
            <div className="text-xs text-slate-400">{config.projectCode}</div>
          </div>
        ),
        billingType: config.billingType,
        source: <SourceBadge source={config.source} />,
        status: <StatusBadge label={config.status} size="sm" />,
        actions: (
          <ActionMenu
            items={[
              { label: "View", icon: <Eye className="h-4 w-4" />, onClick: () => handleView(config) },
              {
                label: "Continue Draft",
                icon: <ArrowRightCircle className="h-4 w-4" />,
                hidden: config.status !== "Draft",
                onClick: () => handleContinueDraft(config),
              },
              {
                label: "Edit",
                icon: <Pencil className="h-4 w-4 text-gray-600" />,
                hidden: config.status === "Draft",
                onClick: () => handleEdit(config),
              },
              {
                label: "Approve",
                icon: <CheckCircle2 className="h-4 w-4" />,
                hidden: !canApproveOrReject(config.status),
                onClick: () => setApproveTarget(config),
              },
              {
                label: "Reject",
                icon: <XCircle className="h-4 w-4" />,
                hidden: !canApproveOrReject(config.status),
                danger: true,
                onClick: () => openRejectModal(config),
              },
              {
                label: "Deactivate",
                icon: <Ban className="h-4 w-4" />,
                hidden: config.status !== "Active",
                danger: true,
                onClick: () => setDeactivateTarget(config),
              },
              {
                label: "Delete",
                icon: <Trash2 className="h-4 w-4" />,
                hidden: config.status !== "Draft",
                danger: true,
                onClick: () => setDeleteTarget(config),
              },
            ]}
          />
        ),
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paginatedConfigs]
  );

  const kpiCards = [
    {
      key: "total",
      label: "Total Configurations",
      value: stats?.total ?? "—",
      icon: FolderKanban,
      color: "bg-slate-500 text-white",
    },
    {
      key: "active",
      label: "Active Projects",
      value: stats?.active ?? "—",
      icon: CheckCircle2,
      color: "bg-emerald-600 text-white",
    },
    {
      key: "draft",
      label: "Draft Configurations",
      value: stats?.draft ?? "—",
      icon: FileText,
      color: "bg-amber-500 text-white",
    },
    {
      key: "integrated",
      label: "Enterprise Projects",
      value: stats?.integrated ?? "—",
      icon: Cable,
      color: "bg-indigo-600 text-white",
    },
  ];

  return (
    <div className="space-y-3">
      {/* 1. Page Header */}
      <PageHeader
        title="Project Billing Setup — Overview"
        subtitle="A snapshot of billing configuration coverage across enterprise and standalone projects."
        actions={
          <Button
            variant="primary"
            onClick={() => navigate("/account-receivable/project-billing-setup/workspace")}
          >
            + Create Billing Setup
          </Button>
        }
      />

      {/* 2. KPIs Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpiCards.map((kpi) => (
          <KPICard
            key={kpi.key}
            label={kpi.label}
            value={loadingStats ? "…" : kpi.value}
            icon={<kpi.icon className="h-5 w-5" />}
            color={kpi.color}
            className="h-full w-full bg-white shadow-sm"
          />
        ))}
      </div>

      {/* 3. Billing Configurations */}
      <PageCard>
        <PageCardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full sm:flex-[3] sm:min-w-[320px]">
              <SearchInput
                value={filters.search}
                onChange={handleFilterChange}
                onSearch={handleSearch}
                placeholder="Search by project, code or client..."
              />
            </div>
            <div className="w-full sm:flex-1 sm:min-w-[160px]">
              <FormSelect
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                options={filterOptions.status}
              />
            </div>
          </div>

          {!loadingConfigs && filteredConfigs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <FileText className="h-6 w-6 text-slate-400" />
              </div>
              <h3 className="mb-1 text-sm font-semibold text-slate-900">No Billing Configurations Found</h3>
              <p className="text-xs text-slate-500">
                Try adjusting your search query, or create a new billing setup.
              </p>
            </div>
          ) : (
            <>
              <ARTable
                headers={TABLE_HEADERS}
                columns={TABLE_COLUMNS}
                rows={tableRows}
                loading={loadingConfigs}
              />
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPrevious={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                onNext={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
              />
            </>
          )}
        </PageCardContent>
      </PageCard>

      {/* Deactivation Modal */}
      <ConfirmationModal
        isOpen={Boolean(deactivateTarget)}
        title="Deactivate Billing Configuration"
        message={
          deactivateTarget
            ? `Are you sure you want to deactivate the billing setup for ${deactivateTarget.projectName}? Invoice generation will stop until it is reactivated.`
            : ""
        }
        confirmText="Deactivate"
        variant="danger"
        isLoading={deactivateLoading}
        onCancel={closeDeactivateModal}
        onConfirm={handleConfirmDeactivate}
      />

      {/* Delete Draft Modal */}
      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Draft Billing Configuration"
        message={
          deleteTarget
            ? `Are you sure you want to permanently delete the draft billing setup for ${deleteTarget.projectName}? This action cannot be undone.`
            : ""
        }
        confirmText="Delete"
        variant="danger"
        isLoading={deleteLoading}
        onCancel={closeDeleteModal}
        onConfirm={handleConfirmDelete}
      />

      <ConfirmationModal
        isOpen={Boolean(approveTarget)}
        title="Approve Billing Configuration"
        message={
          approveTarget
            ? `Approve the billing setup for ${approveTarget.projectName}?`
            : ""
        }
        confirmText="Approve"
        variant="success"
        isLoading={approveLoading}
        onCancel={() => !approveLoading && setApproveTarget(null)}
        onConfirm={handleConfirmApprove}
      />

      <Modal
        isOpen={Boolean(rejectTarget)}
        onClose={closeRejectModal}
        title="Reject Billing Configuration"
        width="480px"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {rejectTarget
              ? `Enter the reason for rejecting ${rejectTarget.projectName}.`
              : ""}
          </p>
          <FormTextArea
            label="Rejection Reason"
            name="rejectionReason"
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
            placeholder="Add rejection reason"
            rows={4}
            disabled={rejectLoading}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="small" onClick={closeRejectModal} disabled={rejectLoading}>
              Cancel
            </Button>
            <Button variant="danger" size="small" onClick={handleConfirmReject} loading={rejectLoading} loadingText="Rejecting...">
              Reject
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
