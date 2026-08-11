import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FolderKanban,
  FileText,
  Cable,
  PenLine,
  CheckCircle2,
  Eye,
  Pencil,
  ArrowRightCircle,
  Ban,
  XCircle,
} from "lucide-react";

import PageHeader from "../../../components/ui/PageHeader";
import FilterCard from "../../../components/ui/FilterCard";
import { PageCard, PageCardContent } from "../../../components/Cards/PageCard";
import { KPICard } from "../../../components/kpi/KPI";
import Button from "../../../components/Button/Button";
import SearchInput from "../../../components/filter/Searchbar";
import FormSelect from "../../../components/forms/FormSelect";
import GenericTable from "../../../components/Table/table";
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
  getApiErrorMessage,
  getBillingConfigurationStats,
  getBillingConfigurationActivity,
} from "../services/billingConfigService";
import { SOURCE_FILTER_OPTIONS, STATUS_FILTER_OPTIONS } from "../data/wizardOptions";

const INITIAL_FILTERS = { search: "", status: "", source: "" };
const PAGE_SIZE = 6;

const TABLE_HEADERS = ["Project", "Client", "Billing Type", "Source", "Status", "Last Updated", "Actions"];
const TABLE_COLUMNS = ["project", "client", "billingType", "source", "status", "lastUpdated", "actions"];

const SOURCE_BADGE_CLASSES = {
  Enterprise: "bg-indigo-100 text-indigo-700",
  Standalone: "bg-slate-100 text-slate-700",
};

function SourceBadge({ source }) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
        SOURCE_BADGE_CLASSES[source] || "bg-slate-100 text-slate-700"
      }`}
    >
      {source}
    </span>
  );
}

export default function Overview() {
  const navigate = useNavigate();

  // Overview Stats & Recent Activity State
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
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
  // load configurations helper available to handlers
  const loadConfigurations = async () => {
    setLoadingStats(true);
    setLoadingConfigs(true);
    try {
      const configsResult = await fetchBillingConfigurations();
      setConfigs(configsResult);

      // derive stats and activity from configurations
      const statsResult = await getBillingConfigurationStats();
      const activityResult = await getBillingConfigurationActivity();
      setStats(statsResult);
      setActivity(activityResult);
    } catch (error) {
      showStatusToast(getApiErrorMessage(error, "Failed to load billing configuration overview."), "error");
      setStats(null);
      setActivity([]);
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

  const filteredConfigs = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return configs.filter((config) => {
      const matchesSearch =
        !search ||
        config.projectName.toLowerCase().includes(search) ||
        config.projectCode.toLowerCase().includes(search) ||
        config.client.toLowerCase().includes(search);
      const matchesStatus = !filters.status || config.status === filters.status;
      const matchesSource = !filters.source || config.source === filters.source;

      return matchesSearch && matchesStatus && matchesSource;
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

  const canApproveOrReject = (status) => !["Active", "Inactive", "Rejected"].includes(status);

  const closeDeactivateModal = () => {
    if (!deactivateLoading) {
      setDeactivateTarget(null);
    }
  };

  const tableRows = useMemo(
    () =>
      filteredConfigs.slice(0, 5).map((config) => ({
        project: (
          <div className="text-left">
            <div className="font-semibold text-slate-900">{config.projectName}</div>
            <div className="text-xs text-slate-400">{config.projectCode}</div>
          </div>
        ),
        client: config.client,
        billingType: config.billingType,
        source: <SourceBadge source={config.source} />,
        status: <StatusBadge label={config.status} size="sm" />,
        lastUpdated: (
          <div>
            <div>{config.lastUpdated}</div>
            <div className="text-xs text-slate-400">{config.updatedBy}</div>
          </div>
        ),
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
            ]}
          />
        ),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredConfigs]
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
    {
      key: "manual",
      label: "Standalone Projects",
      value: stats?.manual ?? "—",
      icon: PenLine,
      color: "bg-orange-500 text-white",
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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

      {/* 3. Filters Box */}
      <FilterCard title="Filters" description="Search and narrow down billing configurations.">
        <div className="w-full sm:w-64">
          <SearchInput
            value={filters.search}
            onChange={handleFilterChange}
            onSearch={handleSearch}
            placeholder="Search by project, code or client..."
          />
        </div>
        <div className="w-full sm:w-64">
          <FormSelect
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            options={STATUS_FILTER_OPTIONS}
          />
        </div>
        <div className="w-full sm:w-64">
          <FormSelect
            name="source"
            value={filters.source}
            onChange={handleFilterChange}
            options={SOURCE_FILTER_OPTIONS}
          />
        </div>
      </FilterCard>

      {/* 4. Billing Configurations Table */}
      <PageCard>
        <PageCardContent className="p-4 sm:p-5">

          {!loadingConfigs && filteredConfigs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                <FileText className="h-6 w-6 text-slate-400" />
              </div>
              <h3 className="mb-1 text-sm font-semibold text-slate-900">No Billing Configurations Found</h3>
              <p className="text-xs text-slate-500">
                Try adjusting your search query, or create a new billing setup.
              </p>
            </div>
          ) : (
            <>
              <div className="w-full overflow-x-auto">
                <GenericTable
                  headers={TABLE_HEADERS}
                  columns={TABLE_COLUMNS}
                  rows={tableRows}
                  loading={loadingConfigs}
                />
              </div>
            </>
          )}
        </PageCardContent>
      </PageCard>

      {/* 5. Recent Activity (Bottom) */}
      <PageCard>
        <PageCardContent className="p-4 sm:p-5">
          <h2 className="mb-3 text-base font-semibold text-slate-900">Recent Activity</h2>

          {loadingStats ? (
            <div className="py-6 text-center text-sm text-slate-500">Loading recent activity…</div>
          ) : activity.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500">No recent activity yet.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {activity.map((item, index) => (
                <li
                  key={`${item.configId}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                >
                  <div>
                    <span className="font-medium text-slate-900">{item.configId}</span>
                    <span className="mx-2 text-slate-300">•</span>
                    <span className="text-slate-600">{item.action}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {item.user} · {item.time}
                  </div>
                </li>
              ))}
            </ul>
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
