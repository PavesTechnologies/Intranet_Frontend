import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Pencil, Ban, ShieldAlert, Layers, Eye } from "lucide-react";

import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/Button/Button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../../components/ui/tooltip";
import StatusBadge from "../../../../components/status/statusbadge";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { showStatusToast } from "../../../../components/toastfy/toast";
import ARTable from "../../components/common/ARTable";
import ActionMenu from "../../components/common/ActionMenu";
import MasterStatCards from "../../components/common/MasterStatCards";
import BackIconButton from "../../components/common/BackIconButton";
import TaxRegionFormModal from "../../components/master-data/TaxRegionFormModal";
import TaxRuleFormModal from "../../components/master-data/TaxRuleFormModal";
import TaxComponentManagementModal from "../../components/master-data/TaxComponentManagementModal";
import { getTaxRegionById, getApiErrorMessage as getRegionErrorMessage } from "../../services/taxRegionService";
import {
  getTaxRateConfigurationsByTaxRegion,
  deactivateTaxRateConfiguration,
  getActiveTaxTypes,
  getApiErrorMessage as getRuleErrorMessage,
} from "../../services/taxRateConfigurationService";

const formatDateValue = (val) => {
  if (!val) return "—";
  try {
    const date = new Date(val);
    if (isNaN(date.getTime())) return val;
    const day = String(date.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${day}-${months[date.getMonth()]}-${date.getFullYear()}`;
  } catch {
    return val;
  }
};

const formatRateDisplay = (rate) => {
  if (rate === null || rate === undefined || rate === "" || isNaN(Number(rate))) {
    return <span className="text-slate-400">—</span>;
  }
  return <span className="font-medium text-slate-700">{rate}%</span>;
};

const TABS = [
  { key: "details", label: "Region Details" },
  { key: "rules", label: "Tax Configurations & Rules" },
];

export default function TaxConfigurationRegionDetailPage() {
  const { taxRegionId } = useParams();
  const navigate = useNavigate();

  const [region, setRegion] = useState(null);
  const [configs, setConfigs] = useState([]);
  const [taxTypes, setTaxTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [activeTab, setActiveTab] = useState("details");

  const [isRegionFormOpen, setIsRegionFormOpen] = useState(false);
  const [isRuleFormOpen, setIsRuleFormOpen] = useState(false);
  const [editingRuleConfig, setEditingRuleConfig] = useState(null);

  const [selectedConfigForComponents, setSelectedConfigForComponents] = useState(null);
  const [isComponentModalOpen, setIsComponentModalOpen] = useState(false);

  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setPermissionError(false);
    setNotFound(false);
    try {
      const [regionData, configsData, taxTypesData] = await Promise.all([
        getTaxRegionById(taxRegionId),
        getTaxRateConfigurationsByTaxRegion(taxRegionId),
        getActiveTaxTypes().catch((err) => {
          console.warn("[TaxConfigurationRegionDetail] Could not load tax types:", err?.message);
          return [];
        }),
      ]);
      if (!regionData || !regionData.taxRegionId) {
        setNotFound(true);
      } else {
        setRegion(regionData);
      }
      setConfigs(configsData || []);
      setTaxTypes(taxTypesData || []);
    } catch (error) {
      if (error?.response?.status === 403) {
        setPermissionError(true);
      } else if (error?.response?.status === 404) {
        setNotFound(true);
      } else {
        showStatusToast(getRegionErrorMessage(error, "Failed to load tax region."), "error");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taxRegionId]);

  const configStats = useMemo(() => {
    const totalConfigs = configs.length;
    const activeConfigs = configs.filter((c) => c.status === "ACTIVE" || c.active).length;
    const totalComponents = configs.reduce((sum, c) => sum + (Array.isArray(c.components) ? c.components.length : 0), 0);
    return {
      totalConfigs,
      activeConfigs,
      inactiveConfigs: totalConfigs - activeConfigs,
      totalComponents,
    };
  }, [configs]);

  const handleOpenCreateRule = () => {
    setEditingRuleConfig(null);
    setIsRuleFormOpen(true);
  };

  const handleOpenEditRule = (config) => {
    setEditingRuleConfig(config);
    setIsRuleFormOpen(true);
  };

  const handleOpenManageComponents = (config) => {
    setSelectedConfigForComponents(config);
    setIsComponentModalOpen(true);
  };

  const handleRuleSaved = () => {
    loadData();
  };

  const handleRegionSaved = (saved) => {
    setRegion(saved);
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      await deactivateTaxRateConfiguration(deactivateTarget.id);
      showStatusToast("Tax configuration deactivated successfully.", "success");
      setDeactivateTarget(null);
      await loadData();
    } catch (error) {
      showStatusToast(getRuleErrorMessage(error, "Failed to deactivate tax configuration."), "error");
    } finally {
      setDeactivating(false);
    }
  };

  const configTableHeaders = [
    "Tax Region",
    "Tax Regime",
    "Effective From",
    "Effective To",
    "Components",
    "Status",
    "Actions",
  ];
  const configTableColumns = ["region", "regime", "from", "to", "components", "status", "actions"];

  const configTableRows = useMemo(() => {
    return configs.map((config) => {
      const compList = Array.isArray(config.components) ? config.components : [];
      return {
        region: (
          <span className="font-semibold text-slate-800">
            {region?.taxRegionName} ({region?.taxRegionCode})
          </span>
        ),
        regime: <span className="font-medium text-slate-700">{config.taxRegime}</span>,
        from: <span className="text-slate-600">{formatDateValue(config.effectiveFrom)}</span>,
        to: <span className="text-slate-600">{formatDateValue(config.effectiveTo)}</span>,
        components: (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleOpenManageComponents(config)}
              className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition border border-indigo-200"
              title="Click to manage components"
            >
              <Layers className="h-3 w-3" />
              {compList.length} {compList.length === 1 ? "Component" : "Components"}
            </button>
            {compList.slice(0, 3).map((comp, idx) => (
              <span
                key={comp.id || idx}
                className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
              >
                {comp.taxTypeCode}: {comp.taxRate}%
              </span>
            ))}
            {compList.length > 3 && (
              <span className="text-[10px] text-slate-400">+{compList.length - 3} more</span>
            )}
          </div>
        ),
        status: <StatusBadge label={config.status || (config.active ? "ACTIVE" : "INACTIVE")} size="sm" />,
        actions: (
          <div className="flex items-center justify-center">
            <ActionMenu
              items={[
                {
                  label: "Manage Components",
                  icon: <Layers className="h-4 w-4 text-[#0A0082]" />,
                  onClick: () => handleOpenManageComponents(config),
                },
                {
                  label: "View Details",
                  icon: <Eye className="h-4 w-4 text-slate-600" />,
                  onClick: () => handleOpenManageComponents(config),
                },
                {
                  label: "Edit Configuration",
                  icon: <Pencil className="h-4 w-4 text-slate-600" />,
                  onClick: () => handleOpenEditRule(config),
                },
                {
                  label: "Deactivate",
                  icon: <Ban className="h-4 w-4 text-rose-600" />,
                  danger: true,
                  hidden: config.status !== "ACTIVE" && !config.active,
                  onClick: () => setDeactivateTarget(config),
                },
              ]}
            />
          </div>
        ),
        key: config.id,
      };
    });
  }, [configs, region]);

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <BackIconButton
          onClick={() => navigate("/account-receivable/master-data/tax-configuration")}
          label="Back to Tax Configuration"
        />
        <LoadingSpinner text="Loading tax region..." />
      </div>
    );
  }

  if (permissionError) {
    return (
      <div className="w-full space-y-6">
        <BackIconButton
          onClick={() => navigate("/account-receivable/master-data/tax-configuration")}
          label="Back to Tax Configuration"
        />
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          You do not have permission to manage tax configuration.
        </div>
      </div>
    );
  }

  if (notFound || !region) {
    return (
      <div className="w-full space-y-6">
        <BackIconButton
          onClick={() => navigate("/account-receivable/master-data/tax-configuration")}
          label="Back to Tax Configuration"
        />
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          Tax region not found.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-3">
        <BackIconButton
          onClick={() => navigate("/account-receivable/master-data/tax-configuration")}
          label="Back to Tax Configuration"
        />
        <div className="flex-1">
          <PageHeader
            title={
              <span className="flex items-center gap-2">
                {region.taxRegionName} ({region.taxRegionCode})
                <span className="text-slate-300">—</span>
                <StatusBadge label={region.status} size="md" />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsRegionFormOpen(true)}
                        aria-label="Edit Region"
                        className="rounded-full border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-[#0A0082]/10 hover:text-[#0A0082]"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Edit Region</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </span>
            }
            subtitle={`Code: ${region.taxRegionCode} • ${region.taxRegime} • 1 Country • 1 Currency (${region.currencyCode})`}
            actions={
              <Button onClick={handleOpenCreateRule} className="flex items-center gap-1.5">
                <Plus className="h-4 w-4" />
                Add Tax Configuration
              </Button>
            }
          />
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === tab.key
                ? "border-[#0A0082] text-[#0A0082]"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "details" && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="divide-y divide-slate-100 text-sm">
            <div className="grid grid-cols-3 gap-2 px-5 py-3">
              <span className="font-semibold text-slate-500">Tax Region Code</span>
              <span className="col-span-2 font-medium text-slate-800">{region.taxRegionCode}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 px-5 py-3">
              <span className="font-semibold text-slate-500">Tax Region Name</span>
              <span className="col-span-2 font-medium text-slate-800">{region.taxRegionName}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 px-5 py-3">
              <span className="font-semibold text-slate-500">Tax Regime</span>
              <span className="col-span-2 font-medium text-slate-800">{region.taxRegime}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 px-5 py-3">
              <span className="font-semibold text-slate-500">Currency Code</span>
              <span className="col-span-2 font-medium text-slate-800">{region.currencyCode}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 px-5 py-3">
              <span className="font-semibold text-slate-500">Description</span>
              <span className="col-span-2 font-medium text-slate-800 break-words">
                {region.description || <span className="text-slate-400">—</span>}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 px-5 py-3">
              <span className="font-semibold text-slate-500">Status</span>
              <span className="col-span-2">
                <StatusBadge label={region.status} size="sm" />
              </span>
            </div>
          </div>
        </div>
      )}

      {activeTab === "rules" && (
        <div className="space-y-6">
          <MasterStatCards
            items={[
              { label: "Total Configurations", value: configStats.totalConfigs },
              { label: "Active Configurations", value: configStats.activeConfigs, tone: "success" },
              { label: "Total Components", value: configStats.totalComponents, tone: "neutral" },
              { label: "Currency", value: region.currencyCode },
              { label: "Tax Regime", value: region.taxRegime },
            ]}
          />

          <ARTable
            headers={configTableHeaders}
            columns={configTableColumns}
            rows={configTableRows}
            loading={false}
            emptyMessage="No tax configurations configured for this region yet. Click 'Add Tax Configuration' to create one."
          />
        </div>
      )}

      <TaxRegionFormModal
        isOpen={isRegionFormOpen}
        onClose={() => setIsRegionFormOpen(false)}
        editingItem={region}
        onSaved={handleRegionSaved}
      />

      <TaxRuleFormModal
        isOpen={isRuleFormOpen}
        onClose={() => setIsRuleFormOpen(false)}
        region={region}
        editingConfig={editingRuleConfig}
        existingConfigs={configs}
        onOpenManageExisting={(existingConfig) => handleOpenManageComponents(existingConfig)}
        onSaved={handleRuleSaved}
      />

      <TaxComponentManagementModal
        isOpen={isComponentModalOpen}
        onClose={() => {
          setIsComponentModalOpen(false);
          setSelectedConfigForComponents(null);
        }}
        configuration={selectedConfigForComponents}
        region={region}
        taxTypes={taxTypes}
        onSaved={handleRuleSaved}
      />

      <ConfirmationModal
        isOpen={Boolean(deactivateTarget)}
        onCancel={() => setDeactivateTarget(null)}
        onConfirm={handleConfirmDeactivate}
        title="Deactivate Tax Configuration"
        message="Are you sure you want to deactivate this tax configuration? Inactive configurations will not be applied to new transactions."
        confirmText="Deactivate"
        variant="danger"
        isLoading={deactivating}
      />
    </div>
  );
}
