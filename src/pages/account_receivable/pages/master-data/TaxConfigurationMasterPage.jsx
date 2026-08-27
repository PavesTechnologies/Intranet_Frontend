import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Landmark,
  CheckCircle2,
  Receipt,
  Coins,
  ShieldAlert,
} from "lucide-react";

import PageHeader from "../../../../components/ui/PageHeader";
import { PageCard } from "../../../../components/Cards/PageCard";
import Button from "../../../../components/Button/Button";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import StatusBadge from "../../../../components/status/statusbadge";
import { showStatusToast } from "../../../../components/toastfy/toast";
import ARTable from "../../components/common/ARTable";
import ActionMenu from "../../components/common/ActionMenu";
import MasterStatCards from "../../components/common/MasterStatCards";
import MasterStatusTabs from "../../components/common/MasterStatusTabs";
import BackIconButton from "../../components/common/BackIconButton";
import TaxRegionFormModal from "../../components/master-data/TaxRegionFormModal";
import { deriveTaxComponentRows } from "../../utils/taxRuleComponents";
import { getTaxRegions, deleteTaxRegion, getApiErrorMessage } from "../../services/taxRegionService";
import { getTaxRateConfigurations } from "../../services/taxRateConfigurationService";

export default function TaxConfigurationMasterPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [taxRegions, setTaxRegions] = useState([]);
  const [taxRuleRows, setTaxRuleRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [permissionError, setPermissionError] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("ACTIVE");

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
      const key = row.source.taxRegionId;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [taxRuleRows]);

  const stats = useMemo(() => {
    const totalRegions = taxRegions.length;
    const activeRegions = taxRegions.filter((item) => item.isActive).length;
    const distinctCurrencies = new Set(taxRegions.map((item) => item.currencyCode).filter(Boolean)).size;
    return {
      totalRegions,
      activeRegions,
      inactiveRegions: totalRegions - activeRegions,
      totalTaxRules: taxRuleRows.length,
      distinctCurrencies,
    };
  }, [taxRegions, taxRuleRows]);

  const statusTabs = useMemo(
    () => [
      { key: "ALL", label: "All", count: stats.totalRegions },
      { key: "ACTIVE", label: "Active", count: stats.activeRegions },
      { key: "INACTIVE", label: "Inactive", count: stats.inactiveRegions },
    ],
    [stats]
  );

  const filteredItems = useMemo(() => {
    return taxRegions.filter((item) => {
      if (activeTab !== "ALL" && item.status !== activeTab) return false;

      const query = searchQuery.trim().toLowerCase();
      if (query) {
        const haystack = `${item.taxRegionCode} ${item.taxRegionName} ${item.taxRegime} ${item.currencyCode} ${item.description || ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  }, [taxRegions, searchQuery, activeTab]);

  const hasActiveFilters = Boolean(searchQuery);

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

  const tableHeaders = ["Tax Region", "Code", "Currency", "Tax Regime", "Tax Rules", "Status", "Actions"];
  const tableColumns = ["taxRegion", "code", "currency", "taxRegime", "taxRules", "status", "actions"];

  const tableRows = useMemo(() => {
    return filteredItems.map((item) => ({
      taxRegion: (
        <button
          type="button"
          onClick={() => handleGoToRegion(item)}
          className="font-semibold text-[#0A0082] hover:underline"
        >
          {item.taxRegionName}
        </button>
      ),
      code: <span className="text-slate-600">{item.taxRegionCode}</span>,
      currency: <span className="text-slate-600">{item.currencyCode}</span>,
      taxRegime: <span className="text-slate-600">{item.taxRegime}</span>,
      taxRules: (
        <span className="text-slate-600">
          {rulesByRegion.get(item.taxRegionId) || 0} Rules
        </span>
      ),
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
  }, [filteredItems, rulesByRegion]);

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

      <MasterStatCards
        items={[
          { label: "Total Regions", value: stats.totalRegions, icon: <Landmark className="h-5 w-5" /> },
          { label: "Active Regions", value: stats.activeRegions, tone: "success", icon: <CheckCircle2 className="h-5 w-5" /> },
          { label: "Total Tax Rules", value: stats.totalTaxRules, icon: <Receipt className="h-5 w-5" /> },
          { label: "Currencies", value: stats.distinctCurrencies, icon: <Coins className="h-5 w-5" /> },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MasterStatusTabs tabs={statusTabs} activeKey={activeTab} onChange={setActiveTab} />

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-[380px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search tax regions..."
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
            ? "No tax regions match your search."
            : "No Tax Regions Found. Create your first tax region to start configuring tax rules."
        }
      />

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
