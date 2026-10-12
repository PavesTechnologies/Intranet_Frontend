import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  Landmark,
  CheckCircle2,
  XCircle,
  Receipt,
  ShieldAlert,
} from "lucide-react";

import { cn } from "@/lib/utils";
import PageHeader from "../../../../components/ui/PageHeader";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import Button from "../../../../components/Button/Button";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import StatusBadge from "../../../../components/status/statusbadge";
import { showStatusToast } from "../../../../components/toastfy/toast";
import SearchInput from "../../../../components/filter/Searchbar";
import ARClearFiltersButton from "../../components/common/ARClearFiltersButton";
import FilterListbox from "../../components/common/ARFilterListbox";
import Pagination from "../../../../components/Pagination/pagination";
import ARTable from "../../components/common/ARTable";
import ActionMenu from "../../components/common/ActionMenu";
import ARKPICard from "../../components/common/ARKPICard";
import ARKPIStatusTabs from "../../components/common/ARKPIStatusTabs";
import BackIconButton from "../../components/common/BackIconButton";
import TaxRegionFormModal from "../../components/master-data/TaxRegionFormModal";
import { deriveTaxComponentRows } from "../../utils/taxRuleComponents";
import { getTaxRegions, deleteTaxRegion, getApiErrorMessage } from "../../services/taxRegionService";
import { getTaxRateConfigurations } from "../../services/taxRateConfigurationService";

const PAGE_SIZE = 8;
const ALL_FILTER_OPTION = { label: "All", value: "ALL" };

const formatDateValue = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(date);
};

export default function TaxConfigurationMasterPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [taxRegions, setTaxRegions] = useState([]);
  const [taxRuleRows, setTaxRuleRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [permissionError, setPermissionError] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeKpi, setActiveKpi] = useState("ALL");
  const [currencyFilter, setCurrencyFilter] = useState("ALL");
  const [regimeFilter, setRegimeFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setPermissionError(false);
    try {
      const [regions, configs] = await Promise.all([getTaxRegions(), getTaxRateConfigurations()]);
      setTaxRegions(regions);
      setTaxRuleRows(deriveTaxComponentRows(configs));
    } catch (error) {
      if (error?.response?.status === 403) {
        setPermissionError(true);
      } else {
        showStatusToast(getApiErrorMessage(error, "Failed to load tax configuration data."), "error");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingItem(null);
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

  const rulesByRegion = useMemo(() => {
    const map = new Map();
    taxRuleRows.forEach((row) => {
      const key = String(row.source.taxRegionId);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [taxRuleRows]);

  const stats = useMemo(() => {
    const totalRegions = taxRegions.length;
    const activeRegions = taxRegions.filter((item) => item.isActive).length;
    const regionsWithRules = taxRegions.filter(
      (item) => (rulesByRegion.get(String(item.taxRegionId)) || 0) > 0
    ).length;
    return {
      totalRegions,
      activeRegions,
      inactiveRegions: totalRegions - activeRegions,
      totalTaxRules: taxRuleRows.length,
      regionsWithRules,
    };
  }, [taxRegions, taxRuleRows, rulesByRegion]);

  const currencyOptions = useMemo(() => [
    ALL_FILTER_OPTION,
    ...[...new Set(taxRegions.map((item) => item.currencyCode).filter(Boolean))]
      .sort()
      .map((value) => ({ label: value, value })),
  ], [taxRegions]);

  const regimeOptions = useMemo(() => [
    ALL_FILTER_OPTION,
    ...[...new Set(taxRegions.map((item) => item.taxRegime).filter(Boolean))]
      .sort()
      .map((value) => ({ label: value, value })),
  ], [taxRegions]);

  const filteredItems = useMemo(() => {
    return taxRegions.filter((item) => {
      if (activeKpi === "ACTIVE" && !item.isActive) return false;
      if (activeKpi === "INACTIVE" && item.isActive) return false;
      if (activeKpi === "WITH_RULES" && !(rulesByRegion.get(String(item.taxRegionId)) > 0)) return false;
      if (currencyFilter !== "ALL" && item.currencyCode !== currencyFilter) return false;
      if (regimeFilter !== "ALL" && item.taxRegime !== regimeFilter) return false;

      const query = searchQuery.trim().toLowerCase();
      if (query) {
        const haystack = `${item.taxRegionCode} ${item.taxRegionName} ${item.taxRegime} ${item.currencyCode} ${item.description || ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  }, [taxRegions, searchQuery, activeKpi, currencyFilter, regimeFilter, rulesByRegion]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredItems, currentPage]);

  const hasActiveFilters = Boolean(
    searchQuery || activeKpi !== "ALL" || currencyFilter !== "ALL" || regimeFilter !== "ALL"
  );

  const handleKpiClick = (key) => {
    setActiveKpi((current) => (key === "ALL" || current === key ? "ALL" : key));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setActiveKpi("ALL");
    setCurrencyFilter("ALL");
    setRegimeFilter("ALL");
    setCurrentPage(1);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleGoToRegion = (item) => {
    navigate(`/account-receivable/master-data/tax-configuration/${item.taxRegionId}`);
  };

  const handleRegionSaved = (saved, wasEditing) => {
    setTaxRegions((prev) =>
      wasEditing
        ? prev.map((item) => (item.taxRegionId === saved.taxRegionId ? saved : item))
        : [saved, ...prev]
    );
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTaxRegion(deleteTarget.taxRegionId);
      showStatusToast("Tax region deleted successfully.", "success");
      setTaxRegions((prev) => prev.filter((item) => item.taxRegionId !== deleteTarget.taxRegionId));
      setDeleteTarget(null);
    } catch (error) {
      showStatusToast(getApiErrorMessage(error, "Failed to delete tax region."), "error");
    } finally {
      setDeleting(false);
    }
  };

  const tableHeaders = ["Tax Region", "Code", "Currency", "Tax Regime", "Rules", "Last Updated", "Status", "Actions"];
  const tableColumns = ["taxRegion", "code", "currency", "taxRegime", "taxRules", "updated", "status", "actions"];

  const tableRows = useMemo(() => {
    return paginatedItems.map((item) => ({
      taxRegion: (
        <button
          type="button"
          onClick={() => handleGoToRegion(item)}
          className="text-left font-semibold text-slate-900 transition-colors hover:text-[#0A0082] hover:underline"
        >
          <span className="block">{item.taxRegionName}</span>
          {item.description && <span className="mt-0.5 block max-w-xs truncate text-xs font-normal text-slate-500">{item.description}</span>}
        </button>
      ),
      code: <span className="font-mono text-xs font-medium text-slate-600">{item.taxRegionCode || "—"}</span>,
      currency: <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{item.currencyCode || "—"}</span>,
      taxRegime: <span className="text-slate-600">{item.taxRegime || "—"}</span>,
      taxRules: (
        <span className="inline-flex min-w-8 justify-center rounded-full bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700">
          {rulesByRegion.get(String(item.taxRegionId)) || 0}
        </span>
      ),
      updated: <span className="whitespace-nowrap text-xs text-slate-500">{formatDateValue(item.updatedAt || item.createdAt)}</span>,
      status: <StatusBadge label={item.status} size="sm" />,
      actions: (
        <div className="flex items-center justify-center">
          <ActionMenu
            items={[
              {
                label: "View Details",
                icon: <Eye className="h-4 w-4 text-slate-600" />,
                onClick: () => handleGoToRegion(item),
              },
              {
                label: "Edit Region",
                icon: <Pencil className="h-4 w-4 text-slate-600" />,
                onClick: () => handleOpenEditModal(item),
              },
              {
                label: "Delete Region",
                icon: <Trash2 className="h-4 w-4 text-rose-600" />,
                danger: true,
                onClick: () => setDeleteTarget(item),
              },
            ]}
          />
        </div>
      ),
    }));
  }, [paginatedItems, rulesByRegion]);

  const kpis = [
    { key: "ALL", label: "Total Regions", value: stats.totalRegions, icon: Landmark, color: "bg-[#0A0082] text-white" },
    { key: "ACTIVE", label: "Active Regions", value: stats.activeRegions, icon: CheckCircle2, color: "bg-emerald-600 text-white" },
    { key: "INACTIVE", label: "Inactive Regions", value: stats.inactiveRegions, icon: XCircle, color: "bg-rose-600 text-white" },
    { key: "WITH_RULES", label: "Regions With Rules", value: stats.regionsWithRules, icon: Receipt, color: "bg-amber-500 text-white" },
  ];

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-3">
        <BackIconButton onClick={() => navigate("/account-receivable/master-data")} label="Back to Configurations" />
        <div className="flex-1">
          <PageHeader
            title="Tax Configuration"
            subtitle="Manage tax regions, currencies, tax regimes and tax rules."
            actions={
              <Button onClick={handleOpenCreateModal} disabled={loading} className="flex items-center gap-1.5">
                <Plus className="h-4 w-4" />
                Add Tax Region
              </Button>
            }
          />
        </div>
      </div>

      {permissionError && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          You do not have permission to manage tax configuration.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <button
            key={kpi.key}
            type="button"
            onClick={() => handleKpiClick(kpi.key)}
            aria-pressed={activeKpi === kpi.key}
            className="w-full rounded-xl text-left transition-transform active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <ARKPICard
              label={kpi.label}
              value={loading ? "…" : kpi.value}
              icon={<kpi.icon className="h-5 w-5" />}
              color={kpi.color}
              active={activeKpi === kpi.key}
              className="h-full w-full"
            />
          </button>
        ))}
      </div>

      <PageCard className="overflow-hidden">
        <PageCardContent className="space-y-4 p-4 sm:p-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Tax Regions</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {stats.totalTaxRules} tax rules across {currencyOptions.length - 1} currencies
            </p>
          </div>
          <ARKPIStatusTabs
            label="Tax region summary filters"
            loading={loading}
            items={kpis.map((kpi) => ({
              key: kpi.key,
              label: kpi.label,
              value: kpi.value,
              active: activeKpi === kpi.key,
              onClick: () => handleKpiClick(kpi.key),
            }))}
          />
          <div className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2 sm:grid-cols-2 xl:flex xl:items-center">
            <div className="w-full xl:w-64">
              <SearchInput
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search tax regions..."
              />
            </div>
            <div className="w-full sm:w-44">
              <FilterListbox
                options={currencyOptions}
                value={currencyFilter}
                onChange={(value) => {
                  setCurrencyFilter(value);
                  setCurrentPage(1);
                }}
                placeholder="All currencies"
              />
            </div>
            <div className="w-full sm:w-44">
              <FilterListbox
                options={regimeOptions}
                value={regimeFilter}
                onChange={(value) => {
                  setRegimeFilter(value);
                  setCurrentPage(1);
                }}
                placeholder="All regimes"
              />
            </div>
            {hasActiveFilters && (
              <ARClearFiltersButton onClick={handleResetFilters} />
            )}
          </div>

          <ARTable
            headers={tableHeaders}
            columns={tableColumns}
            rows={tableRows}
            alignments={{ taxRules: "center", updated: "left", status: "center", actions: "center" }}
            loading={loading}
            emptyMessage={
              hasActiveFilters
                ? "No tax regions match the selected filters."
                : "No tax regions found. Add a region to start configuring tax rules."
            }
          />

          {!loading && filteredItems.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                Showing {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, filteredItems.length)} of {filteredItems.length} regions
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

      <TaxRegionFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        editingItem={editingItem}
        onSaved={handleRegionSaved}
      />

      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Tax Region"
        message={`Are you sure you want to permanently delete "${deleteTarget?.taxRegionName || ""}"? There is no way to undo this or reactivate it afterward.`}
        confirmText="Delete"
        variant="danger"
        isLoading={deleting}
      />
    </div>
  );
}
