import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Pencil, ArrowRightCircle, Ban, FileText, CheckCircle2, XCircle } from "lucide-react";

import PageHeader from "../../components/ui/PageHeader";
import FilterCard from "../../components/ui/FilterCard";
import { PageCard, PageCardContent } from "../../components/Cards/PageCard";
import Button from "../../components/Button/Button";
import SearchInput from "../../components/filter/Searchbar";
import FormSelect from "../../components/forms/FormSelect";
import GenericTable from "../../components/Table/table";
import Pagination from "../../components/Pagination/pagination";
import StatusBadge from "../../components/status/statusbadge";
import ConfirmationModal from "../../components/confirmation_modal/ConfirmationModal";
import Modal from "../../components/ui/Modal";
import FormTextArea from "../../components/forms/FormTextArea";
import { showStatusToast } from "../../components/toastfy/toast";
import ActionMenu from "./components/ActionMenu";
import {
  approveBillingConfiguration,
  deactivateBillingConfiguration,
  getApiErrorMessage,
  getBillingConfigurations,
  rejectBillingConfiguration,
} from "./services/billingConfigurationService";
import { SOURCE_FILTER_OPTIONS, STATUS_FILTER_OPTIONS } from "./data/wizardOptions";

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

export default function BillingConfigurations() {
  const navigate = useNavigate();
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);
  const [approveTarget, setApproveTarget] = useState(null);
  const [approveLoading, setApproveLoading] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);

  const loadConfigurations = async () => {
    setLoading(true);
    try {
      const result = await getBillingConfigurations();
      setConfigs(result);
    } catch (error) {
      showStatusToast(getApiErrorMessage(error, "Failed to load billing configurations."), "error");
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigurations();
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
      paginatedConfigs.map((config) => ({
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
                icon: <Pencil className="h-4 w-4" />,
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
    [paginatedConfigs]
  );

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Project Billing Configurations"
        subtitle="Configure billing policies, invoicing rules, and commercial settings for customer projects."
        actions={
          <Button
            variant="primary"
            onClick={() => navigate("/account-receivable/project-billing-setup/configurations/new")}
          >
            + Create Billing Setup
          </Button>
        }
      />

      <FilterCard title="Filters" description="Search and narrow down billing configurations.">
        <div className="w-full md:w-72">
          <SearchInput
            value={filters.search}
            onChange={handleFilterChange}
            onSearch={handleSearch}
            placeholder="Search by project, code or client..."
          />
        </div>
        <div className="w-full sm:w-48">
          <FormSelect
            label="Status"
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            options={STATUS_FILTER_OPTIONS}
          />
        </div>
        <div className="w-full sm:w-48">
          <FormSelect
            label="Project Source"
            name="source"
            value={filters.source}
            onChange={handleFilterChange}
            options={SOURCE_FILTER_OPTIONS}
          />
        </div>
      </FilterCard>

      <PageCard>
        <PageCardContent className="p-6">
          {!loading && filteredConfigs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <FileText className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="mb-1 text-sm font-semibold text-slate-900">No Billing Configurations Found</h3>
              <p className="text-xs text-slate-500">
                Try adjusting your filters, or create a new billing setup.
              </p>
            </div>
          ) : (
            <>
              <div className="w-full overflow-x-auto">
                <GenericTable
                  headers={TABLE_HEADERS}
                  columns={TABLE_COLUMNS}
                  rows={tableRows}
                  loading={loading}
                />
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPrevious={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                onNext={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              />
            </>
          )}
        </PageCardContent>
      </PageCard>

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
