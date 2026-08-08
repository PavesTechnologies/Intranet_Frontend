import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Pencil, ArrowRightCircle, Ban, FileText } from "lucide-react";

import PageHeader from "../../../components/ui/PageHeader";
import FilterCard from "../../../components/ui/FilterCard";
import { PageCard, PageCardContent } from "../../../components/Cards/PageCard";
import Button from "../../../components/Button/Button";
import SearchInput from "../../../components/filter/Searchbar";
import FormSelect from "../../../components/forms/FormSelect";
import GenericTable from "../../../components/Table/table";
import Pagination from "../../../components/Pagination/pagination";
import StatusBadge from "../../../components/status/statusbadge";
import ConfirmationModal from "../../../components/confirmation_modal/ConfirmationModal";
import { showStatusToast } from "../../../components/toastfy/toast";
import ActionMenu from "../components/common/ActionMenu";
import { fetchBillingConfigurations } from "../services/billingConfigService";
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

export default function BillingConfigurations() {
  const navigate = useNavigate();
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  useEffect(() => {
    fetchBillingConfigurations().then((result) => {
      setConfigs(result);
      setLoading(false);
    });
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

  const handleConfirmDeactivate = () => {
    setDeactivateLoading(true);
    setTimeout(() => {
      setConfigs((prev) =>
        prev.map((config) =>
          config.id === deactivateTarget.id ? { ...config, status: "Inactive" } : config
        )
      );
      setDeactivateLoading(false);
      setDeactivateTarget(null);
      showStatusToast("Billing configuration deactivated.", "success");
    }, 400);
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
        onCancel={() => setDeactivateTarget(null)}
        onConfirm={handleConfirmDeactivate}
      />
    </div>
  );
}
